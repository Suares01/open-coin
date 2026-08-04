import {
  FinancialBook,
  JournalEntry,
  LedgerAccount,
  type LedgerAccountKind,
} from "@open-coin/domain";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { initializeSqliteDatabase } from "../../src/database/initialize-sqlite-database.js";
import { SqliteJournalEntryRepository } from "../../src/repositories/sqlite-journal-entry-repository.js";
import { SqliteLedgerAccountRepository } from "../../src/repositories/sqlite-ledger-account-repository.js";
import { SqliteFinancialBookRepository } from "../../src/repositories/sqlite-financial-book-repository.js";
import { SqliteLedgerQueries } from "../../src/queries/sqlite-ledger-queries.js";
import { BetterSqliteDatabase } from "../support/better-sqlite-database.js";

const bookId = "book-1" as never;

function book(id = "book-1", currency = "BRL"): FinancialBook {
  return FinancialBook.restore({
    id: id as never,
    name: id,
    baseCurrency: currency,
    timezone: "America/Sao_Paulo",
    version: 0,
  });
}

function account(id: string, kind: LedgerAccountKind, currentBookId = bookId): LedgerAccount {
  return LedgerAccount.restore({
    id: id as never,
    bookId: currentBookId,
    name: id,
    normalizedName: id,
    kind,
    status: "ACTIVE",
    version: 0,
  });
}

function entry(
  id: string,
  occurredOn: string,
  accountId: string,
  amountMinor: bigint,
  sequence: string,
  currentBookId = bookId,
  reversalOf?: string,
  counterAccountId = "counter-account",
): JournalEntry {
  return JournalEntry.restore({
    id: id as never,
    bookId: currentBookId,
    occurredOn,
    recordedAt: "2026-08-04T12:00:00.000Z",
    sequence,
    description: id,
    currency: "BRL",
    origin: "MANUAL",
    postings: [
      {
        id: `${id}-posting` as never,
        accountId: accountId as never,
        amountMinor,
        currency: "BRL",
      },
      {
        id: `${id}-counter` as never,
        accountId: counterAccountId as never,
        amountMinor: -amountMinor,
        currency: "BRL",
      },
    ],
    ...(reversalOf === undefined ? {} : { reversalOf: reversalOf as never }),
    version: 0,
  });
}

describe("SqliteLedgerQueries", () => {
  let database: BetterSqliteDatabase;
  let books: SqliteFinancialBookRepository;
  let accounts: SqliteLedgerAccountRepository;
  let entries: SqliteJournalEntryRepository;
  let queries: SqliteLedgerQueries;

  beforeEach(async () => {
    database = new BetterSqliteDatabase();
    await initializeSqliteDatabase(database, { inMemory: true });
    books = new SqliteFinancialBookRepository(database);
    accounts = new SqliteLedgerAccountRepository(database);
    entries = new SqliteJournalEntryRepository(database);
    queries = new SqliteLedgerQueries(database);
    await books.add(book());
    await accounts.add(account("counter-account", "EQUITY"));
  });

  afterEach(async () => {
    await database.close();
  });

  it("limits balance to postings on or before asOf", async () => {
    await accounts.add(account("account-asset", "ASSET"));
    await entries.add(entry("entry-before", "2026-08-01", "account-asset", 100n, "1"));
    await entries.add(entry("entry-after", "2026-08-05", "account-asset", 900n, "2"));

    await expect(queries.getAccountBalance({
      bookId,
      accountId: "account-asset" as never,
      asOf: { value: "2026-08-01" } as never,
    })).resolves.toEqual({
      accountId: "account-asset",
      asOf: "2026-08-01",
      amountMinor: "100",
      currency: "BRL",
    });
  });

  it("returns zero and the book currency when an account has no postings", async () => {
    await accounts.add(account("empty-account", "ASSET"));

    await expect(queries.getAccountBalance({
      bookId,
      accountId: "empty-account" as never,
    })).resolves.toEqual({
      accountId: "empty-account",
      asOf: null,
      amountMinor: "0",
      currency: "BRL",
    });
  });

  it.each([
    ["ASSET", "100"],
    ["LIABILITY", "-100"],
    ["INCOME", "-100"],
    ["EXPENSE", "100"],
    ["EQUITY", "-100"],
  ] as const)("applies the normal balance sign for %s accounts", async (kind, expected) => {
    const accountId = `account-${kind}`;
    await accounts.add(account(accountId, kind));
    await entries.add(entry(`entry-${kind}`, "2026-08-01", accountId, 100n, "1"));

    const result = await queries.getAccountBalance({ bookId, accountId: accountId as never });

    expect(result.amountMinor).toBe(expected);
  });

  it("calculates running balances chronologically and returns the statement descending", async () => {
    await accounts.add(account("account-asset", "ASSET"));
    await entries.add(entry("entry-1", "2026-08-01", "account-asset", 100n, "1"));
    await entries.add(entry("entry-2", "2026-08-02", "account-asset", -25n, "2"));
    await entries.add(entry("entry-3", "2026-08-03", "account-asset", 10n, "3"));

    const result = await queries.getAccountStatement({ bookId, accountId: "account-asset" as never });

    expect(result.map(({ journalEntryId, runningBalanceMinor }) => ({ journalEntryId, runningBalanceMinor }))).toEqual([
      { journalEntryId: "entry-3", runningBalanceMinor: "85" },
      { journalEntryId: "entry-2", runningBalanceMinor: "75" },
      { journalEntryId: "entry-1", runningBalanceMinor: "100" },
    ]);
  });

  it("orders same-day items by numeric sequence instead of journal ID", async () => {
    await accounts.add(account("account-asset", "ASSET"));
    await entries.add(entry("entry-z", "2026-08-01", "account-asset", 10n, "1"));
    await entries.add(entry("entry-a", "2026-08-01", "account-asset", 20n, "2"));

    const result = await queries.getAccountStatement({ bookId, accountId: "account-asset" as never });

    expect(result.map(({ journalEntryId }) => journalEntryId)).toEqual(["entry-a", "entry-z"]);
  });

  it("keeps original and reversal visible while their balance nets to zero", async () => {
    await accounts.add(account("account-asset", "ASSET"));
    await entries.add(entry("entry-original", "2026-08-01", "account-asset", 100n, "1"));
    await entries.add(entry("entry-reversal", "2026-08-02", "account-asset", -100n, "2", bookId, "entry-original"));

    const statement = await queries.getAccountStatement({ bookId, accountId: "account-asset" as never });
    const balance = await queries.getAccountBalance({ bookId, accountId: "account-asset" as never });

    expect(statement.map(({ journalEntryId, amountMinor }) => ({ journalEntryId, amountMinor }))).toEqual([
      { journalEntryId: "entry-reversal", amountMinor: "-100" },
      { journalEntryId: "entry-original", amountMinor: "100" },
    ]);
    expect(balance.amountMinor).toBe("0");
  });

  it("preserves amounts above Number.MAX_SAFE_INTEGER as exact decimal strings", async () => {
    await accounts.add(account("account-asset", "ASSET"));
    await entries.add(entry("entry-large", "2026-08-01", "account-asset", 9007199254740993n, "1"));

    const statement = await queries.getAccountStatement({ bookId, accountId: "account-asset" as never });
    const balance = await queries.getAccountBalance({ bookId, accountId: "account-asset" as never });

    expect(statement[0]?.amountMinor).toBe("9007199254740993");
    expect(statement[0]?.runningBalanceMinor).toBe("9007199254740993");
    expect(balance.amountMinor).toBe("9007199254740993");
  });

  it("isolates balance and statement rows by book", async () => {
    await accounts.add(account("account-main", "ASSET"));
    await books.add(book("book-2", "USD"));
    await accounts.add(account("counter-account-2", "EQUITY", "book-2" as never));
    await accounts.add(account("account-foreign", "ASSET", "book-2" as never));
    await entries.add(entry("entry-main", "2026-08-01", "account-main", 100n, "1"));
    await entries.add(entry("entry-foreign", "2026-08-01", "account-foreign", 900n, "1", "book-2" as never, undefined, "counter-account-2"));

    const balance = await queries.getAccountBalance({ bookId, accountId: "account-main" as never });
    const statement = await queries.getAccountStatement({ bookId, accountId: "account-main" as never });

    expect(balance).toMatchObject({ amountMinor: "100", currency: "BRL" });
    expect(statement.map(({ journalEntryId }) => journalEntryId)).toEqual(["entry-main"]);
  });

  it("returns an empty statement when the account has no postings", async () => {
    await accounts.add(account("empty-account", "ASSET"));

    await expect(queries.getAccountStatement({
      bookId,
      accountId: "empty-account" as never,
    })).resolves.toEqual([]);
  });
});
