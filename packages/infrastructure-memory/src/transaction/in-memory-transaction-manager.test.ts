import {
  Currency,
  DomainError,
  FinancialBook,
  JournalEntry,
  LedgerAccount,
  LocalDate,
  Money,
  Posting,
} from "@open-coin/domain";
import { describe, expect, it } from "vitest";
import {
  InMemoryTransactionManager,
} from "./in-memory-transaction-manager.js";
import { InMemoryStore } from "../store/in-memory-store.js";

function book() {
  return FinancialBook.create({
    id: "book-1" as never,
    name: "Main",
    baseCurrency: Currency.parse("BRL"),
    timezone: "America/Sao_Paulo",
  });
}

function account() {
  return LedgerAccount.create({
    id: "account-1" as never,
    bookId: "book-1" as never,
    name: "Cash",
    kind: "ASSET",
  });
}

function entry() {
  return JournalEntry.post({
    id: "entry-1" as never,
    bookId: "book-1" as never,
    occurredOn: LocalDate.parse("2026-08-04"),
    description: "Opening",
    currency: Currency.parse("BRL"),
    origin: "SYSTEM",
    postings: [
      Posting.create({
        id: "posting-1" as never,
        accountId: "account-1" as never,
        amount: Money.of(100n, Currency.parse("BRL")),
      }),
      Posting.create({
        id: "posting-2" as never,
        accountId: "account-2" as never,
        amount: Money.of(-100n, Currency.parse("BRL")),
      }),
    ],
  });
}

describe("InMemoryTransactionManager", () => {
  it("commits all repository writes and returns collected facts", async () => {
    const store = new InMemoryStore();
    const manager = new InMemoryTransactionManager(store);

    const committed = await manager.execute(async (repositories) => {
      await repositories.books.add(book());
      await repositories.accounts.add(account());
      await repositories.journalEntries.add(entry());
      return "committed";
    });

    expect(committed.value).toBe("committed");
    expect(committed.facts.map((fact) => fact.type)).toEqual([
      "FinancialBookCreated",
      "LedgerAccountCreated",
      "JournalEntryPosted",
    ]);
    expect(store.snapshot().books).toHaveLength(1);
    expect(store.snapshot().accounts).toHaveLength(1);
    expect(store.snapshot().journalEntries).toHaveLength(1);
  });

  it("rolls back book, account and journal writes after an intermediate failure", async () => {
    const store = new InMemoryStore();
    const manager = new InMemoryTransactionManager(store);
    const before = store.snapshot();

    await expect(
      manager.execute(async (repositories) => {
        await repositories.books.add(book());
        await repositories.accounts.add(account());
        await repositories.journalEntries.add(entry());
        throw new DomainError("INVALID_INPUT", "forced failure");
      }),
    ).rejects.toMatchObject({ code: "INVALID_INPUT" });

    expect(store.snapshot()).toEqual(before);
  });

  it("propagates the original error object to the application boundary", async () => {
    const store = new InMemoryStore();
    const manager = new InMemoryTransactionManager(store);
    const error = new Error("same error");

    await expect(
      manager.execute(async () => {
        throw error;
      }),
    ).rejects.toBe(error);
    expect(store.snapshot()).toEqual({
      books: [],
      accounts: [],
      journalEntries: [],
    });
  });

  it("does not retain facts from a rolled-back transaction", async () => {
    const store = new InMemoryStore();
    const manager = new InMemoryTransactionManager(store);

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

  it("serializes asynchronous callbacks so snapshots cannot interleave", async () => {
    const manager = new InMemoryTransactionManager(new InMemoryStore());
    const order: string[] = [];

    const first = manager.execute(async () => {
      order.push("first:start");
      await Promise.resolve();
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
});
