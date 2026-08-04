import type {
  BookId,
  JournalEntrySnapshot,
  LedgerAccountKind,
  LedgerAccountSnapshot,
} from "@open-coin/domain";
import { LocalDate } from "@open-coin/domain";
import { describe, expect, it } from "vitest";
import { InMemoryStore } from "../store/in-memory-store.js";
import { InMemoryLedgerQueries } from "./in-memory-ledger-queries.js";

const bookId = "book-1" as BookId;
const accountKinds: readonly LedgerAccountKind[] = [
  "ASSET",
  "LIABILITY",
  "INCOME",
  "EXPENSE",
  "EQUITY",
];

function account(id: string, kind: LedgerAccountKind, currentBookId: BookId = bookId): LedgerAccountSnapshot {
  return {
    id: id as never,
    bookId: currentBookId,
    name: id,
    normalizedName: id,
    kind,
    status: "ACTIVE",
    version: 0,
  };
}

function entry(
  id: string,
  occurredOn: string,
  accountId: string,
  amountMinor: bigint,
  currentBookId: BookId = bookId,
  description = id,
  sequence = "1",
): JournalEntrySnapshot {
  return {
    id: id as never,
    bookId: currentBookId,
    occurredOn,
    recordedAt: "2026-08-04T12:00:00.000Z",
    sequence,
    description,
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
        accountId: `${id}-counter` as never,
        amountMinor: -amountMinor,
        currency: "BRL",
      },
    ],
    version: 0,
  };
}

function prepared() {
  const store = new InMemoryStore();
  store.putBook({
    id: bookId,
    name: "Main",
    baseCurrency: "BRL",
    timezone: "America/Sao_Paulo",
    version: 0,
  });
  return { store, queries: new InMemoryLedgerQueries(store) };
}

describe("InMemoryLedgerQueries", () => {
  it("includes only postings on or before the requested date", async () => {
    const { store, queries } = prepared();
    store.putAccount(account("account-asset", "ASSET"));
    store.putJournalEntry(entry("entry-1", "2026-08-01", "account-asset", 100n));
    store.putJournalEntry(entry("entry-2", "2026-08-03", "account-asset", -40n));
    store.putJournalEntry(entry("entry-3", "2026-08-05", "account-asset", 10n));

    const result = await queries.getAccountBalance({
      bookId,
      accountId: "account-asset" as never,
      asOf: LocalDate.parse("2026-08-03"),
    });

    expect(result).toEqual({
      accountId: "account-asset",
      accountName: "account-asset",
      accountKind: "ASSET",
      rawBalanceMinor: "60",
      displayBalanceMinor: "60",
      asOf: "2026-08-03",
      amountMinor: "60",
      currency: "BRL",
    });
  });

  it("uses the book currency and returns the full derived balance without a date limit", async () => {
    const { store, queries } = prepared();
    store.putAccount(account("account-asset", "ASSET"));
    store.putJournalEntry(entry("entry-1", "2026-08-01", "account-asset", 100n));

    const result = await queries.getAccountBalance({
      bookId,
      accountId: "account-asset" as never,
    });

    expect(result.currency).toBe("BRL");
    expect(result.accountName).toBe("account-asset");
    expect(result.accountKind).toBe("ASSET");
    expect(result.rawBalanceMinor).toBe("100");
    expect(result.displayBalanceMinor).toBe("100");
    expect(result.asOf).toBeNull();
    expect(result.amountMinor).toBe("100");
    expect(result.amountMinor).toBe(result.displayBalanceMinor);
  });

  it.each([
    ["ASSET", "100"],
    ["LIABILITY", "-100"],
    ["INCOME", "-100"],
    ["EXPENSE", "100"],
    ["EQUITY", "-100"],
  ] as const)("shows a %s balance using its normal balance sign", async (kind, expected) => {
    const { store, queries } = prepared();
    const accountId = `account-${kind}`;
    store.putAccount(account(accountId, kind));
    store.putJournalEntry(entry(`entry-${kind}`, "2026-08-01", accountId, 100n));

    const result = await queries.getAccountBalance({
      bookId,
      accountId: accountId as never,
    });

    expect(result.amountMinor).toBe(expected);
  });

  it("returns signed posting amounts and displayed running balances", async () => {
    const { store, queries } = prepared();
    store.putAccount(account("account-liability", "LIABILITY"));
    store.putJournalEntry(entry("entry-1", "2026-08-01", "account-liability", 100n, bookId, "Liability opening"));
    store.putJournalEntry(entry("entry-2", "2026-08-02", "account-liability", -40n, bookId, "Liability payment"));

    const result = await queries.getAccountStatement({
      bookId,
      accountId: "account-liability" as never,
    });

    expect(result).toEqual([
      {
        journalEntryId: "entry-2",
        occurredOn: "2026-08-02",
        recordedAt: "2026-08-04T12:00:00.000Z",
        sequence: "1",
        description: "Liability payment",
        amountMinor: "-40",
        runningBalanceMinor: "-60",
        currency: "BRL",
      },
      {
        journalEntryId: "entry-1",
        occurredOn: "2026-08-01",
        recordedAt: "2026-08-04T12:00:00.000Z",
        sequence: "1",
        description: "Liability opening",
        amountMinor: "100",
        runningBalanceMinor: "-100",
        currency: "BRL",
      },
    ]);
  });

  it("orders same-day statement items by sequence descending, not journal ID", async () => {
    const { store, queries } = prepared();
    store.putAccount(account("account-asset", "ASSET"));
    store.putJournalEntry(entry("entry-z", "2026-08-01", "account-asset", 10n, bookId, "First", "1"));
    store.putJournalEntry(entry("entry-a", "2026-08-01", "account-asset", 20n, bookId, "Second", "2"));

    const result = await queries.getAccountStatement({
      bookId,
      accountId: "account-asset" as never,
    });

    expect(result.map(({ journalEntryId }) => journalEntryId)).toEqual([
      "entry-a",
      "entry-z",
    ]);
  });

  it("calculates four same-day running balances in confirmed sequence order", async () => {
    const { store, queries } = prepared();
    store.putAccount(account("account-asset", "ASSET"));
    store.putJournalEntry(entry("entry-z", "2026-08-01", "account-asset", 100n, bookId, "One", "1"));
    store.putJournalEntry(entry("entry-y", "2026-08-01", "account-asset", -25n, bookId, "Two", "2"));
    store.putJournalEntry(entry("entry-x", "2026-08-01", "account-asset", 10n, bookId, "Three", "3"));
    store.putJournalEntry(entry("entry-a", "2026-08-01", "account-asset", -5n, bookId, "Four", "4"));

    const result = await queries.getAccountStatement({
      bookId,
      accountId: "account-asset" as never,
    });

    expect(result.map(({ journalEntryId, sequence, runningBalanceMinor }) => ({
      journalEntryId,
      sequence,
      runningBalanceMinor,
    }))).toEqual([
      { journalEntryId: "entry-a", sequence: "4", runningBalanceMinor: "80" },
      { journalEntryId: "entry-x", sequence: "3", runningBalanceMinor: "85" },
      { journalEntryId: "entry-y", sequence: "2", runningBalanceMinor: "75" },
      { journalEntryId: "entry-z", sequence: "1", runningBalanceMinor: "100" },
    ]);
  });

  it("calculates running balances chronologically before returning descending output", async () => {
    const { store, queries } = prepared();
    store.putAccount(account("account-asset", "ASSET"));
    store.putJournalEntry(entry("entry-1", "2026-08-01", "account-asset", 100n));
    store.putJournalEntry(entry("entry-2", "2026-08-02", "account-asset", -25n));
    store.putJournalEntry(entry("entry-3", "2026-08-03", "account-asset", 10n));

    const result = await queries.getAccountStatement({
      bookId,
      accountId: "account-asset" as never,
    });

    expect(result.map(({ journalEntryId, runningBalanceMinor }) => ({ journalEntryId, runningBalanceMinor }))).toEqual([
      { journalEntryId: "entry-3", runningBalanceMinor: "85" },
      { journalEntryId: "entry-2", runningBalanceMinor: "75" },
      { journalEntryId: "entry-1", runningBalanceMinor: "100" },
    ]);
  });

  it("includes an original and its reversal and produces a zero final balance", async () => {
    const { store, queries } = prepared();
    store.putAccount(account("account-asset", "ASSET"));
    store.putJournalEntry(entry("entry-original", "2026-08-01", "account-asset", 100n));
    store.putJournalEntry({
      ...entry("entry-reversal", "2026-08-02", "account-asset", -100n),
      reversalOf: "entry-original" as never,
    });

    const statement = await queries.getAccountStatement({
      bookId,
      accountId: "account-asset" as never,
    });
    const balance = await queries.getAccountBalance({
      bookId,
      accountId: "account-asset" as never,
    });

    expect(statement.map(({ journalEntryId, amountMinor }) => ({ journalEntryId, amountMinor }))).toEqual([
      { journalEntryId: "entry-reversal", amountMinor: "-100" },
      { journalEntryId: "entry-original", amountMinor: "100" },
    ]);
    expect(balance.amountMinor).toBe("0");
  });

  it("does not combine postings from another book", async () => {
    const { store, queries } = prepared();
    const otherBookId = "book-2" as BookId;
    store.putBook({
      id: otherBookId,
      name: "Other",
      baseCurrency: "USD",
      timezone: "UTC",
      version: 0,
    });
    store.putAccount(account("account-asset", "ASSET"));
    store.putAccount(account("account-other", "ASSET", otherBookId));
    store.putJournalEntry(entry("entry-main", "2026-08-01", "account-asset", 100n));
    store.putJournalEntry(entry("entry-other", "2026-08-01", "account-asset", 900n, otherBookId));

    const result = await queries.getAccountBalance({
      bookId,
      accountId: "account-asset" as never,
    });

    expect(result.amountMinor).toBe("100");
    expect(result.currency).toBe("BRL");
  });

  it.each(accountKinds)("returns an empty derived balance for a %s account with no postings", async (kind) => {
    const { store, queries } = prepared();
    const accountId = `empty-${kind}`;
    store.putAccount(account(accountId, kind));

    const result = await queries.getAccountBalance({
      bookId,
      accountId: accountId as never,
    });

    expect(result).toEqual({
      accountId,
      accountName: accountId,
      accountKind: kind,
      rawBalanceMinor: "0",
      displayBalanceMinor: "0",
      asOf: null,
      amountMinor: "0",
      currency: "BRL",
    });
  });

  it("returns no statement items when the account has no postings", async () => {
    const { store, queries } = prepared();
    store.putAccount(account("empty-account", "ASSET"));

    const result = await queries.getAccountStatement({
      bookId,
      accountId: "empty-account" as never,
    });

    expect(result).toEqual([]);
  });
});
