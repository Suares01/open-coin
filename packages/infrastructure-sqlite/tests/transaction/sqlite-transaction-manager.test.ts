import {
  ApplicationError,
} from "@open-coin/application";
import {
  Currency,
  DomainError,
  FinancialBook,
} from "@open-coin/domain";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { SqliteDatabase } from "../../src/database/sqlite-database.js";
import { initializeSqliteDatabase } from "../../src/database/initialize-sqlite-database.js";
import { SqliteTransactionManager } from "../../src/transaction/sqlite-transaction-manager.js";
import {
  BetterSqliteDatabase,
} from "../support/better-sqlite-database.js";

const delay = (milliseconds: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, milliseconds));

function book(id = "book-1"): FinancialBook {
  return FinancialBook.create({
    id: id as never,
    name: id,
    baseCurrency: Currency.parse("BRL"),
    timezone: "America/Sao_Paulo",
  });
}

describe("SqliteTransactionManager", () => {
  let database: BetterSqliteDatabase;
  let manager: SqliteTransactionManager;

  beforeEach(async () => {
    database = new BetterSqliteDatabase();
    await initializeSqliteDatabase(database, { inMemory: true });
    manager = new SqliteTransactionManager(database);
  });

  afterEach(async () => {
    await database.close();
  });

  it("commits repository writes and returns their value and facts in order", async () => {
    const committed = await manager.execute(async (repositories) => {
      await repositories.books.add(book());
      await repositories.books.add(book("book-2"));
      return "committed";
    });

    expect(committed.value).toBe("committed");
    expect(committed.facts.map((fact) => fact.aggregateId)).toEqual([
      "book-1",
      "book-2",
    ]);
    expect(
      await database.query<{ readonly count: number }>(
        "SELECT COUNT(*) AS count FROM financial_books",
      ),
    ).toEqual([{ count: 2 }]);
  });

  it("rolls back writes and a reserved sequence after callback failure", async () => {
    await expect(
      manager.execute(async (repositories) => {
        await repositories.books.add(book());
        expect(await repositories.journalEntries.reserveNextSequence("book-1" as never)).toBe("1");
        throw new Error("rollback");
      }),
    ).rejects.toThrow("rollback");

    expect(
      await database.query<{ readonly books: number; readonly sequences: number }>(
        "SELECT " +
          "(SELECT COUNT(*) FROM financial_books) AS books, " +
          "(SELECT COUNT(*) FROM journal_sequences) AS sequences",
      ),
    ).toEqual([{ books: 0, sequences: 0 }]);
  });

  it("does not leak facts from a rolled-back callback", async () => {
    await expect(
      manager.execute(async (repositories) => {
        await repositories.books.add(book());
        throw new Error("rollback");
      }),
    ).rejects.toThrow("rollback");

    const committed = await manager.execute(async () => "empty");

    expect(committed.value).toBe("empty");
    expect(committed.facts).toEqual([]);
  });

  it("preserves the original ApplicationError object", async () => {
    const failure = new ApplicationError("INVALID_INPUT", "same application error");

    await expect(manager.execute(async () => { throw failure; })).rejects.toBe(failure);
  });

  it("preserves the original DomainError object", async () => {
    const failure = new DomainError("INVALID_DOMAIN", "same domain error");

    await expect(manager.execute(async () => { throw failure; })).rejects.toBe(failure);
  });

  it("sanitizes an unexpected driver failure at the application boundary", async () => {
    const failure = {
      code: "SQLITE_ERROR",
      message: "SELECT secret FROM /private/financial.sqlite",
    };
    const failingDatabase: SqliteDatabase = {
      execute: async () => { throw failure; },
      query: async () => [],
      executeBatch: async () => undefined,
      transaction: async (work) => work({
        execute: async () => { throw failure; },
        query: async () => [],
        executeBatch: async () => undefined,
      }),
      close: async () => undefined,
    };

    await expect(
      new SqliteTransactionManager(failingDatabase).execute(async (repositories) => {
        await repositories.books.add(book());
        return "unreachable";
      }),
    ).rejects.toMatchObject({
      code: "UNEXPECTED_ERROR",
      message: "SQLite operation failed",
    });
  });

  it("serializes concurrent callbacks in FIFO order", async () => {
    const order: string[] = [];
    const first = manager.execute(async () => {
      order.push("first:start");
      await delay(10);
      order.push("first:end");
    });
    const second = manager.execute(async () => {
      order.push("second:start");
      order.push("second:end");
    });

    await Promise.all([first, second]);

    expect(order).toEqual([
      "first:start",
      "first:end",
      "second:start",
      "second:end",
    ]);
  });

  it("keeps external queries behind the active transaction", async () => {
    let externalResolved = false;
    let externalQuery: Promise<unknown[]> | undefined;
    const transaction = manager.execute(async () => {
      externalQuery = database.query("SELECT 1").then(() => {
        externalResolved = true;
        return [];
      });
      await delay(10);
      expect(externalResolved).toBe(false);
    });

    await transaction;
    await externalQuery;
    expect(externalResolved).toBe(true);
  });

  it("rolls back prior writes when a later repository constraint fails", async () => {
    await expect(
      manager.execute(async (repositories) => {
        await repositories.books.add(book());
        await repositories.books.add(book());
      }),
    ).rejects.toMatchObject({ code: "DUPLICATE_ENTITY" });

    expect(
      await database.query<{ readonly count: number }>(
        "SELECT COUNT(*) AS count FROM financial_books",
      ),
    ).toEqual([{ count: 0 }]);
  });
});
