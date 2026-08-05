import { afterEach, describe, expect, it } from "vitest";
import { configureSqliteConnection } from "../../src/database/configure-sqlite-connection.js";
import { sqliteMigrations, SqliteMigrationRunner } from "../../src/migrations/index.js";
import { BetterSqliteDatabase } from "../support/better-sqlite-database.js";

const V1_ONLY = [sqliteMigrations[0]!];

describe("financial query migrations", () => {
  let database: BetterSqliteDatabase | undefined;

  afterEach(async () => {
    await database?.close();
    database = undefined;
  });

  async function createFreshDatabase(): Promise<BetterSqliteDatabase> {
    database = new BetterSqliteDatabase();
    await configureSqliteConnection(database, { inMemory: true });
    return database;
  }

  it("keeps generated migrations contiguous and checksummed", () => {
    expect(sqliteMigrations.map(({ version, name }) => ({ version, name }))).toEqual([
      { version: 1, name: "initial_financial_ledger" },
      { version: 2, name: "financial_query_indexes" },
    ]);
    expect(sqliteMigrations.every(({ checksum }) => /^[a-f0-9]{64}$/.test(checksum))).toBe(true);
  });

  it("upgrades a database with V1 applied to V2", async () => {
    const current = await createFreshDatabase();
    await new SqliteMigrationRunner(current, V1_ONLY).migrate();
    await new SqliteMigrationRunner(current, sqliteMigrations).migrate();

    await expect(
      current.query<{ version: number; name: string }>(
        "SELECT version, name FROM schema_migrations ORDER BY version",
      ),
    ).resolves.toEqual([
      { version: 1, name: "initial_financial_ledger" },
      { version: 2, name: "financial_query_indexes" },
    ]);
  });

  it("makes applying the complete plan twice a no-op", async () => {
    const current = await createFreshDatabase();
    const runner = new SqliteMigrationRunner(current, sqliteMigrations);

    await runner.migrate();
    await runner.migrate();

    await expect(
      current.query<{ version: number }>(
        "SELECT version FROM schema_migrations ORDER BY version",
      ),
    ).resolves.toEqual([{ version: 1 }, { version: 2 }]);
  });

  it("rejects a tampered V2 checksum before changing the schema", async () => {
    const current = await createFreshDatabase();
    await new SqliteMigrationRunner(current, V1_ONLY).migrate();
    await current.execute(
      "UPDATE schema_migrations SET checksum = ? WHERE version = ?",
      ["tampered", 1],
    );

    await expect(
      new SqliteMigrationRunner(current, sqliteMigrations).migrate(),
    ).rejects.toThrow("Migration version 1 has a different checksum");
    await expect(
      current.query("SELECT name FROM sqlite_schema WHERE name = ?", [
        "ix_journal_entries_book_date_sequence_numeric",
      ]),
    ).resolves.toEqual([]);
  });
});
