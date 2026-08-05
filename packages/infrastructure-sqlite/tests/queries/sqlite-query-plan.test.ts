import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { configureSqliteConnection } from "../../src/database/configure-sqlite-connection.js";
import { sqliteMigrations, SqliteMigrationRunner } from "../../src/migrations/index.js";
import { BetterSqliteDatabase } from "../support/better-sqlite-database.js";

type PlanRow = { readonly detail: string };

describe("financial query SQLite plans", () => {
  let database: BetterSqliteDatabase;

  beforeEach(async () => {
    database = new BetterSqliteDatabase();
    await configureSqliteConnection(database, { inMemory: true });
    await new SqliteMigrationRunner(database, sqliteMigrations).migrate();
    await database.execute(
      "INSERT INTO financial_books (id, name, base_currency, timezone, version) " +
        "VALUES (?, ?, ?, ?, ?)",
      ["book-1", "Main book", "BRL", "America/Sao_Paulo", 0],
    );
    await database.execute(
      "INSERT INTO ledger_accounts " +
        "(id, book_id, name, normalized_name, kind, status, version) " +
        "VALUES (?, ?, ?, ?, ?, ?, ?)",
      ["account-1", "book-1", "Cash", "cash", "ASSET", "ACTIVE", 0],
    );
    await database.executeBatch(
      "INSERT INTO journal_entries " +
        "(id, book_id, occurred_on, recorded_at, sequence, description, currency, origin, version) " +
        "VALUES " +
        "('entry-9', 'book-1', '2026-08-04', '2026-08-04T09:00:00.000Z', '9', 'Nine', 'BRL', 'MANUAL', 0)," +
        "('entry-10', 'book-1', '2026-08-04', '2026-08-04T10:00:00.000Z', '10', 'Ten', 'BRL', 'MANUAL', 0);",
    );
    await database.executeBatch(
      "INSERT INTO postings " +
        "(id, book_id, journal_entry_id, account_id, position, amount_minor, currency) " +
        "VALUES " +
        "('posting-9', 'book-1', 'entry-9', 'account-1', 0, 100, 'BRL')," +
        "('posting-10', 'book-1', 'entry-10', 'account-1', 0, 200, 'BRL');",
    );
  });

  afterEach(async () => {
    await database.close();
  });

  it("orders same-day sequences numerically, including 9 and 10", async () => {
    await expect(
      database.query<{ id: string }>(
        "SELECT id FROM journal_entries WHERE book_id = ? " +
          "ORDER BY occurred_on DESC, length(sequence) DESC, sequence DESC",
        ["book-1"],
      ),
    ).resolves.toEqual([{ id: "entry-10" }, { id: "entry-9" }]);
  });

  it("uses the numeric sequence index for the journal ordering shape", async () => {
    const plan = await database.query<PlanRow>(
      "EXPLAIN QUERY PLAN SELECT id FROM journal_entries " +
        "WHERE book_id = ? ORDER BY occurred_on DESC, " +
        "length(sequence) DESC, sequence DESC LIMIT ?",
      ["book-1", 20],
    );

    expect(plan.some(({ detail }) =>
      detail.includes("ix_journal_entries_book_date_sequence_numeric"),
    )).toBe(true);
  });

  it("uses the account posting index for entry and position ordering", async () => {
    const plan = await database.query<PlanRow>(
      "EXPLAIN QUERY PLAN SELECT journal_entry_id, position FROM postings " +
        "WHERE book_id = ? AND account_id = ? " +
        "ORDER BY journal_entry_id, position",
      ["book-1", "account-1"],
    );

    expect(plan.some(({ detail }) =>
      detail.includes("ix_postings_book_account_entry_position"),
    )).toBe(true);
  });
});
