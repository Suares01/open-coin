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
const recordedAt = "2026-08-04T12:00:00.000Z";
const sequence = "7";

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
    recordedAt,
    sequence,
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
    expect(entry.recordedAt).toBe(recordedAt);
    expect(entry.sequence).toBe(sequence);
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
        recordedAt,
        sequence,
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
        recordedAt,
        sequence,
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
        recordedAt,
        sequence,
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
        recordedAt,
        sequence,
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
        recordedAt,
        sequence,
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

  it("creates a system reversal with opposite postings and a new identity", () => {
    const entry = validEntry();

    const reversal = entry.createReversal({
      id: journalEntryIdFromString("reversal-1"),
      occurredOn: LocalDate.parse("2026-08-05"),
      recordedAt: "2026-08-05T12:00:00.000Z",
      sequence: "8",
      description: "  Reverse opening balance  ",
      postingIds: [
        postingIdFromString("reversal-posting-a"),
        postingIdFromString("reversal-posting-b"),
      ],
    });

    expect(reversal.id).toBe("reversal-1");
    expect(reversal.origin).toBe("SYSTEM");
    expect(reversal.reversalOf).toBe("entry-1");
    expect(reversal.reversedBy).toBeUndefined();
    expect(reversal.postings.map((posting) => posting.toSnapshot())).toEqual([
      {
        id: "reversal-posting-a",
        accountId: "account-a",
        amountMinor: -100n,
        currency: "USD",
      },
      {
        id: "reversal-posting-b",
        accountId: "account-b",
        amountMinor: 100n,
        currency: "USD",
      },
    ]);
  });

  it.each(["2026-08-04", "2026-08-05"] as const)(
    "accepts a reversal on the original date or later (%s)",
    (occurredOn) => {
      const reversal = validEntry().createReversal({
        id: journalEntryIdFromString("reversal-1"),
        occurredOn: LocalDate.parse(occurredOn),
        recordedAt: "2026-08-05T12:00:00.000Z",
        sequence: "8",
        description: "Reverse",
        postingIds: [
          postingIdFromString("reversal-posting-a"),
          postingIdFromString("reversal-posting-b"),
        ],
      });

      expect(reversal.reversalOf).toBe("entry-1");
      expect(reversal.postings.map((posting) => posting.amount.amountMinor)).toEqual([
        -100n,
        100n,
      ]);
    },
  );

  it("does not mutate the original while creating a reversal", () => {
    const entry = validEntry();
    entry.pullDomainFacts();
    const before = entry.toSnapshot();

    entry.createReversal({
      id: journalEntryIdFromString("reversal-1"),
      occurredOn: LocalDate.parse("2026-08-05"),
      recordedAt: "2026-08-05T12:00:00.000Z",
      sequence: "8",
      description: "Reverse",
      postingIds: [
        postingIdFromString("reversal-posting-a"),
        postingIdFromString("reversal-posting-b"),
      ],
    });

    expect(entry.toSnapshot()).toEqual(before);
    expect(entry.pullDomainFacts()).toEqual([]);
  });

  it("records the reversal link and fact on the original", () => {
    const entry = validEntry();
    entry.pullDomainFacts();

    entry.markReversedBy(journalEntryIdFromString("reversal-1"));

    expect(entry.reversedBy).toBe("reversal-1");
    expect(entry.version).toBe(1);
    expect(entry.pullDomainFacts()).toEqual([
      expect.objectContaining({
        type: "JournalEntryReversed",
        aggregateId: "entry-1",
        payload: {
          bookId: "book-1",
          originalId: "entry-1",
          reversalId: "reversal-1",
        },
      }),
    ]);
  });

  it("rejects a second reversal without changing the original", () => {
    const entry = validEntry();
    entry.markReversedBy(journalEntryIdFromString("reversal-1"));
    entry.pullDomainFacts();
    const before = entry.toSnapshot();

    expect(() =>
      entry.createReversal({
        id: journalEntryIdFromString("reversal-2"),
        occurredOn: LocalDate.parse("2026-08-05"),
        recordedAt: "2026-08-05T12:00:00.000Z",
        sequence: "9",
        description: "Reverse again",
        postingIds: [
          postingIdFromString("reversal-posting-a"),
          postingIdFromString("reversal-posting-b"),
        ],
      }),
    ).toThrowError(
      expect.objectContaining({ code: "JOURNAL_ENTRY_ALREADY_REVERSED" }),
    );
    expect(entry.toSnapshot()).toEqual(before);
    expect(entry.pullDomainFacts()).toEqual([]);
  });

  it("rejects a second link without mutating version or facts", () => {
    const entry = validEntry();
    entry.markReversedBy(journalEntryIdFromString("reversal-1"));
    entry.pullDomainFacts();
    const before = entry.toSnapshot();

    expect(() =>
      entry.markReversedBy(journalEntryIdFromString("reversal-2")),
    ).toThrowError(
      expect.objectContaining({ code: "JOURNAL_ENTRY_ALREADY_REVERSED" }),
    );
    expect(entry.toSnapshot()).toEqual(before);
    expect(entry.pullDomainFacts()).toEqual([]);
  });

  it("rejects a reversal with an incomplete posting id list", () => {
    expect(() =>
      validEntry().createReversal({
        id: journalEntryIdFromString("reversal-1"),
        occurredOn: LocalDate.parse("2026-08-05"),
        recordedAt: "2026-08-05T12:00:00.000Z",
        sequence: "8",
        description: "Reverse",
        postingIds: [postingIdFromString("reversal-posting-a")],
      }),
    ).toThrowError(expect.objectContaining({ code: "INVALID_REVERSAL_POSTINGS" }));
  });

  it("rejects a reversal before the original date without mutating it", () => {
    const entry = validEntry();
    entry.pullDomainFacts();
    const before = entry.toSnapshot();

    expect(() =>
      entry.createReversal({
        id: journalEntryIdFromString("reversal-1"),
        occurredOn: LocalDate.parse("2026-08-03"),
        recordedAt: "2026-08-03T12:00:00.000Z",
        sequence: "8",
        description: "Invalid reverse",
        postingIds: [
          postingIdFromString("reversal-posting-a"),
          postingIdFromString("reversal-posting-b"),
        ],
      }),
    ).toThrowError(expect.objectContaining({ code: "REVERSAL_DATE_BEFORE_ORIGINAL" }));
    expect(entry.toSnapshot()).toEqual(before);
    expect(entry.pullDomainFacts()).toEqual([]);
  });

  it("rejects reversing an existing reversal without mutating it", () => {
    const reversal = validEntry().createReversal({
      id: journalEntryIdFromString("reversal-1"),
      occurredOn: LocalDate.parse("2026-08-05"),
      recordedAt: "2026-08-05T12:00:00.000Z",
      sequence: "8",
      description: "Reverse",
      postingIds: [
        postingIdFromString("reversal-posting-a"),
        postingIdFromString("reversal-posting-b"),
      ],
    });
    const before = reversal.toSnapshot();

    expect(() =>
      reversal.createReversal({
        id: journalEntryIdFromString("reversal-2"),
        occurredOn: LocalDate.parse("2026-08-06"),
        recordedAt: "2026-08-06T12:00:00.000Z",
        sequence: "9",
        description: "Reverse twice",
        postingIds: [
          postingIdFromString("second-reversal-a"),
          postingIdFromString("second-reversal-b"),
        ],
      }),
    ).toThrowError(
      expect.objectContaining({ code: "JOURNAL_ENTRY_REVERSAL_NOT_REVERSIBLE" }),
    );
    expect(reversal.toSnapshot()).toEqual(before);
  });

  it.each([
    ["not-an-instant", sequence, "INVALID_RECORDED_AT"],
    [recordedAt, "-1", "INVALID_JOURNAL_SEQUENCE"],
    [recordedAt, "", "INVALID_JOURNAL_SEQUENCE"],
  ] as const)("rejects invalid order metadata", (invalidRecordedAt, invalidSequence, code) => {
    expect(() =>
      JournalEntry.post({
        id: journalEntryIdFromString("entry-invalid"),
        bookId,
        occurredOn: LocalDate.parse("2026-08-04"),
        recordedAt: invalidRecordedAt,
        sequence: invalidSequence,
        description: "Entry",
        currency: usd,
        origin: "MANUAL",
        postings: [posting("posting-a", accountA, 100n), posting("posting-b", accountB, -100n)],
      }),
    ).toThrowError(expect.objectContaining({ code }));
  });
});
