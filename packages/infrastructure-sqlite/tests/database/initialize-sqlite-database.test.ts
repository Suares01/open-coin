import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { initializeSqliteDatabase } from "../../src/database/index.js";
import { BetterSqliteDatabase } from "../support/better-sqlite-database.js";

describe("initializeSqliteDatabase", () => {
  const temporaryDirectories: string[] = [];
  let database: BetterSqliteDatabase | undefined;

  afterEach(async () => {
    await database?.close();
    database = undefined;
    await Promise.all(
      temporaryDirectories.splice(0).map((directory) =>
        rm(directory, { recursive: true }),
      ),
    );
  });

  it("configures and migrates an in-memory database", async () => {
    database = new BetterSqliteDatabase();

    await initializeSqliteDatabase(database, { inMemory: true });

    expect(
      await database.query<{ foreign_keys: number }>("PRAGMA foreign_keys"),
    ).toEqual([{ foreign_keys: 1 }]);
    expect(
      await database.query<{ timeout: number }>("PRAGMA busy_timeout"),
    ).toEqual([{ timeout: 5000 }]);
    expect(
      await database.query<{ version: number }>(
        "SELECT version FROM schema_migrations",
      ),
    ).toEqual([{ version: 1 }, { version: 2 }]);
    expect(
      await database.query("SELECT name FROM sqlite_schema WHERE name = 'postings'"),
    ).toEqual([{ name: "postings" }]);
  });

  it("configures WAL and migrates a file database", async () => {
    const directory = await mkdtemp(join(tmpdir(), "open-coin-sqlite-init-"));
    temporaryDirectories.push(directory);
    database = new BetterSqliteDatabase(join(directory, "ledger.sqlite"));

    await initializeSqliteDatabase(database, { inMemory: false });

    expect(
      await database.query<{ journal_mode: string }>("PRAGMA journal_mode"),
    ).toEqual([{ journal_mode: "wal" }]);
    expect(
      await database.query<{ synchronous: number }>("PRAGMA synchronous"),
    ).toEqual([{ synchronous: 2 }]);
    expect(
      await database.query<{ version: number }>(
        "SELECT version FROM schema_migrations",
      ),
    ).toEqual([{ version: 1 }, { version: 2 }]);
  });

  it("runs an explicitly supplied migration list in version order", async () => {
    database = new BetterSqliteDatabase();

    await initializeSqliteDatabase(database, {
      inMemory: true,
      migrations: [
        {
          version: 1,
          name: "first",
          checksum: "checksum-first",
          sql:
            "CREATE TABLE initialization_order (position INTEGER);" +
            "INSERT INTO initialization_order (position) VALUES (1);",
        },
        {
          version: 2,
          name: "second",
          checksum: "checksum-second",
          sql: "INSERT INTO initialization_order (position) VALUES (2);",
        },
      ],
    });

    expect(
      await database.query<{ position: number }>(
        "SELECT position FROM initialization_order ORDER BY position",
      ),
    ).toEqual([{ position: 1 }, { position: 2 }]);
    expect(
      await database.query<{ version: number }>(
        "SELECT version FROM schema_migrations ORDER BY version",
      ),
    ).toEqual([{ version: 1 }, { version: 2 }]);
  });

  it("makes repeated initialization preserve the migration history", async () => {
    database = new BetterSqliteDatabase();

    await initializeSqliteDatabase(database, { inMemory: true });
    await initializeSqliteDatabase(database, { inMemory: true });

    expect(
      await database.query<{ version: number; applied_at: string }>(
        "SELECT version, applied_at FROM schema_migrations",
      ),
    ).toEqual([
      { version: 1, applied_at: expect.any(String) },
      { version: 2, applied_at: expect.any(String) },
    ]);
    expect(
      await database.query("SELECT name FROM sqlite_schema WHERE name = 'financial_books'"),
    ).toEqual([{ name: "financial_books" }]);
  });
});
