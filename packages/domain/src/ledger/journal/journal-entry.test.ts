import { describe, expect, it } from "vitest";
import { Currency } from "../../shared/identity/currency.js";
import {
  bookIdFromString,
  journalEntryIdFromString,
  ledgerAccountIdFromString,
  postingIdFromString,
} from "../../shared/identity/ids.js";
import { LocalDate } from "../../shared/local-date.js";
import { Money } from "../../shared/money.js";
import { JournalEntry } from "./journal-entry.js";
import { Posting } from "./posting.js";

const usd = Currency.parse("USD");
const bookId = bookIdFromString("book-1");
const accountA = ledgerAccountIdFromString("account-a");
const accountB = ledgerAccountIdFromString("account-b");

function posting(id: string, accountId: typeof accountA, amountMinor: bigint, currency = usd) {
  return Posting.create({
    id: postingIdFromString(id),
    accountId,
    amount: Money.of(amountMinor, currency),
  });
}

function validEntry() {
  return JournalEntry.post({
    id: journalEntryIdFromString("entry-1"),
    bookId,
    occurredOn: LocalDate.parse("2026-08-04"),
    description: "  Opening balance  ",
    currency: usd,
    origin: "MANUAL",
    postings: [posting("posting-a", accountA, 100n), posting("posting-b", accountB, -100n)],
  });
}

describe("JournalEntry", () => {
  it("creates a trimmed, version-zero entry with immutable fields", () => {
    const entry = validEntry();

    expect(entry.description).toBe("Opening balance");
    expect(entry.version).toBe(0);
    expect(entry.postings).toHaveLength(2);
    expect(Object.getOwnPropertyDescriptor(JournalEntry.prototype, "description"))
      .toMatchObject({ get: expect.any(Function), set: undefined });
  });

  it("rejects fewer than two postings", () => {
    expect(() =>
      JournalEntry.post({
        id: journalEntryIdFromString("entry-1"),
        bookId,
        occurredOn: LocalDate.parse("2026-08-04"),
        description: "Entry",
        currency: usd,
        origin: "MANUAL",
        postings: [posting("posting-a", accountA, 100n)],
      }),
    ).toThrowError(expect.objectContaining({ code: "INSUFFICIENT_POSTINGS" }));
  });

  it("rejects postings for fewer than two distinct accounts", () => {
    expect(() =>
      JournalEntry.post({
        id: journalEntryIdFromString("entry-1"),
        bookId,
        occurredOn: LocalDate.parse("2026-08-04"),
        description: "Entry",
        currency: usd,
        origin: "MANUAL",
        postings: [posting("posting-a", accountA, 100n), posting("posting-b", accountA, -100n)],
      }),
    ).toThrowError(expect.objectContaining({ code: "INSUFFICIENT_ACCOUNTS" }));
  });

  it("rejects a posting with a different currency", () => {
    expect(() =>
      JournalEntry.post({
        id: journalEntryIdFromString("entry-1"),
        bookId,
        occurredOn: LocalDate.parse("2026-08-04"),
        description: "Entry",
        currency: usd,
        origin: "MANUAL",
        postings: [
          posting("posting-a", accountA, 100n),
          posting("posting-b", accountB, -100n, Currency.parse("BRL")),
        ],
      }),
    ).toThrowError(expect.objectContaining({ code: "CURRENCY_MISMATCH" }));
  });

  it("rejects postings whose signed sum is not zero", () => {
    expect(() =>
      JournalEntry.post({
        id: journalEntryIdFromString("entry-1"),
        bookId,
        occurredOn: LocalDate.parse("2026-08-04"),
        description: "Entry",
        currency: usd,
        origin: "MANUAL",
        postings: [posting("posting-a", accountA, 100n), posting("posting-b", accountB, -99n)],
      }),
    ).toThrowError(expect.objectContaining({ code: "UNBALANCED_JOURNAL_ENTRY" }));
  });

  it("rejects an empty normalized description", () => {
    expect(() =>
      JournalEntry.post({
        id: journalEntryIdFromString("entry-1"),
        bookId,
        occurredOn: LocalDate.parse("2026-08-04"),
        description: "  ",
        currency: usd,
        origin: "MANUAL",
        postings: [posting("posting-a", accountA, 100n), posting("posting-b", accountB, -100n)],
      }),
    ).toThrowError(expect.objectContaining({ code: "INVALID_JOURNAL_DESCRIPTION" }));
  });

  it("records a JournalEntryPosted fact without adding it to the snapshot", () => {
    const entry = validEntry();

    expect(entry.pullDomainFacts()).toEqual([
      expect.objectContaining({
        type: "JournalEntryPosted",
        aggregateId: "entry-1",
      }),
    ]);
    expect(entry.toSnapshot()).not.toHaveProperty("pendingFacts");
  });

  it("returns a copy of postings and preserves the aggregate", () => {
    const entry = validEntry();
    const postings = entry.postings as Posting[];
    postings.pop();

    expect(entry.postings).toHaveLength(2);
  });

  it("round trips all fields and rehydrates independent postings", () => {
    const entry = validEntry();
    entry.pullDomainFacts();
    const snapshot = entry.toSnapshot();
    const restored = JournalEntry.restore(snapshot);

    expect(restored.toSnapshot()).toEqual(snapshot);
    expect(restored.postings).not.toBe(entry.postings);
    expect(restored.pullDomainFacts()).toEqual([]);
  });

  it("preserves reversal links and version during restoration", () => {
    const snapshot = {
      ...validEntry().toSnapshot(),
      reversalOf: journalEntryIdFromString("original"),
      reversedBy: journalEntryIdFromString("reversal"),
      version: 2,
    };

    const restored = JournalEntry.restore(snapshot);

    expect(restored.reversalOf).toBe("original");
    expect(restored.reversedBy).toBe("reversal");
    expect(restored.version).toBe(2);
  });

  it("increments version when a reversal link is marked", () => {
    const entry = validEntry();

    entry.markReversedBy(journalEntryIdFromString("reversal-1"));

    expect(entry.reversedBy).toBe("reversal-1");
    expect(entry.version).toBe(1);
  });
});
