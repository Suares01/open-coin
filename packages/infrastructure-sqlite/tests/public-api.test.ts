import { readFileSync } from "node:fs";
import {
  configureSqliteConnection,
  createSqliteRepositoryContext,
  initializeSqliteDatabase,
  SqliteFinancialBookRepository,
  SqliteJournalEntryRepository,
  SqliteLedgerAccountRepository,
  SqliteLedgerQueries,
  SqliteMigrationRunner,
  SqliteTransactionManager,
} from "../src/index.js";
import * as api from "../src/index.js";
import { describe, expect, it } from "vitest";

const publicEntrySource = readFileSync(new URL("../src/index.ts", import.meta.url), "utf8");
const publicDistSource = readFileSync(new URL("../dist/index.js", import.meta.url), "utf8");
const publicDeclarationSource = readFileSync(new URL("../dist/index.d.ts", import.meta.url), "utf8");
const databaseDeclarationSource = readFileSync(new URL("../dist/database/index.d.ts", import.meta.url), "utf8");
const executorDeclarationSource = readFileSync(new URL("../dist/database/sqlite-executor.d.ts", import.meta.url), "utf8");
const databaseContractDeclarationSource = readFileSync(new URL("../dist/database/sqlite-database.d.ts", import.meta.url), "utf8");
const valueDeclarationSource = readFileSync(new URL("../dist/database/sqlite-value.d.ts", import.meta.url), "utf8");
const productionFiles = [
  "database/configure-sqlite-connection.ts",
  "database/initialize-sqlite-database.ts",
  "database/sqlite-database.ts",
  "database/sqlite-executor.ts",
  "database/sqlite-value.ts",
  "migrations/generated-migrations.ts",
  "migrations/migration-errors.ts",
  "migrations/migrations.ts",
  "migrations/sqlite-migration-runner.ts",
  "queries/sqlite-ledger-queries.ts",
  "repositories/create-sqlite-repository-context.ts",
  "repositories/sqlite-fact-collector.ts",
  "repositories/sqlite-financial-book-repository.ts",
  "repositories/sqlite-journal-entry-repository.ts",
  "repositories/sqlite-ledger-account-repository.ts",
  "transaction/sqlite-transaction-manager.ts",
];

describe("infrastructure-sqlite public boundary", () => {
  it("exports the production database, migration, repository, query and transaction adapters", () => {
    expect(configureSqliteConnection).toBeTypeOf("function");
    expect(initializeSqliteDatabase).toBeTypeOf("function");
    expect(SqliteMigrationRunner).toBeTypeOf("function");
    expect(createSqliteRepositoryContext).toBeTypeOf("function");
    expect(SqliteFinancialBookRepository).toBeTypeOf("function");
    expect(SqliteJournalEntryRepository).toBeTypeOf("function");
    expect(SqliteLedgerAccountRepository).toBeTypeOf("function");
    expect(SqliteLedgerQueries).toBeTypeOf("function");
    expect(SqliteTransactionManager).toBeTypeOf("function");
  });

  it("keeps mappers, test fixtures, the Node driver and internal collectors out of the public entrypoint and dist", () => {
    for (const source of [publicEntrySource, publicDistSource, publicDeclarationSource]) {
      expect(source).not.toMatch(/mappers|BetterSqliteDatabase|better-sqlite3|tests\/support|SqliteFactCollector/);
    }
    expect(Object.keys(api)).not.toEqual(expect.arrayContaining([
      "BetterSqliteDatabase",
      "SqliteFinancialBookMapper",
      "SqliteJournalEntryMapper",
      "SqliteLedgerAccountMapper",
      "SqliteFactCollector",
    ]));
  });

  it("contains no forbidden host imports or Node driver dependency in the production graph", () => {
    for (const relativePath of productionFiles) {
      const source = readFileSync(new URL(`../src/${relativePath}`, import.meta.url), "utf8");
      expect(source, relativePath).not.toMatch(/from ["'](?:node:|react|@tauri-apps|zustand|@tanstack|pluggy)/);
      expect(source, relativePath).not.toMatch(/better-sqlite3|BetterSqliteDatabase/);
    }
    const packageJson = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8")) as {
      dependencies?: Record<string, string>;
    };
    expect(Object.keys(packageJson.dependencies ?? {}).sort()).toEqual([
      "@open-coin/application",
      "@open-coin/domain",
    ]);
  });

  it("publishes the same platform-neutral contract surface in declarations and JavaScript", () => {
    expect(publicDeclarationSource).toContain("./database/index.js");
    expect(publicDeclarationSource).toContain("./migrations/index.js");
    expect(publicDeclarationSource).toContain("SqliteFinancialBookRepository");
    expect(publicDeclarationSource).toContain("SqliteLedgerQueries");
    expect(publicDeclarationSource).toContain("SqliteTransactionManager");
    expect(databaseDeclarationSource).toContain("SqliteExecutionResult");
    expect(databaseDeclarationSource).toContain("SqliteParameters");
    expect(databaseDeclarationSource).toContain("SqliteValue");
    expect(databaseDeclarationSource).toContain("SqliteExecutor");
    expect(databaseDeclarationSource).toContain("SqliteDatabase");
    expect(valueDeclarationSource).toContain(
      "export type SqliteValue = string | number | Uint8Array | null;",
    );
    expect(valueDeclarationSource).toContain(
      "export type SqliteParameters = readonly SqliteValue[] | Readonly<Record<string, SqliteValue>>;",
    );
    expect(valueDeclarationSource).toContain("readonly rowsAffected: number;");
    expect(valueDeclarationSource).toContain("readonly lastInsertRowId?: string;");
    expect(executorDeclarationSource).toContain(
      "execute(sql: string, parameters?: SqliteParameters): Promise<SqliteExecutionResult>;",
    );
    expect(executorDeclarationSource).toContain(
      "query<Row extends Record<string, unknown>>(sql: string, parameters?: SqliteParameters): Promise<Row[]>;",
    );
    expect(executorDeclarationSource).toContain(
      "executeBatch(sql: string): Promise<void>;",
    );
    expect(databaseContractDeclarationSource).toContain(
      "interface SqliteDatabase extends SqliteExecutor",
    );
    expect(databaseContractDeclarationSource).toContain(
      "transaction<T>(work: (transaction: SqliteExecutor) => Promise<T>): Promise<T>;",
    );
    expect(databaseContractDeclarationSource).toContain("close(): Promise<void>;");
    expect(publicDistSource).toContain("SqliteLedgerQueries");
    expect(publicDistSource).toContain("SqliteTransactionManager");
  });
});
