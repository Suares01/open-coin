import { describe, expect, it } from "vitest";
import {
  JournalEntryMapper,
  type JournalEntryRow,
} from "./journal-entry-mapper.js";

function row(overrides: Partial<JournalEntryRow> = {}): JournalEntryRow {
  return {
    id: "entry-1",
    book_id: "book-1",
    occurred_on: "2026-08-04",
    recorded_at: "2026-08-04T12:00:00.000Z",
    sequence: "1",
    description: "Opening",
    currency: "BRL",
    origin: "SYSTEM",
    reversal_of_id: "entry-original",
    reversed_by_id: "entry-reversal",
    version: 1,
    posting_id: "posting-1",
    posting_book_id: "book-1",
    posting_journal_entry_id: "entry-1",
    posting_account_id: "account-1",
    posting_position: 0,
    posting_amount_minor: "9007199254740993",
    posting_currency: "BRL",
    ...overrides,
  };
}

describe("JournalEntryMapper", () => {
  it("round-trips entry, links and exact textual amounts", () => {
    const entry = JournalEntryMapper.toDomain([
      row(),
      row({
        posting_id: "posting-2",
        posting_account_id: "account-2",
        posting_position: 1,
        posting_amount_minor: "-9007199254740993",
      }),
    ]);

    expect(JournalEntryMapper.toPersistence(entry)).toEqual({
      entry: {
        id: "entry-1",
        book_id: "book-1",
        occurred_on: "2026-08-04",
        recorded_at: "2026-08-04T12:00:00.000Z",
        sequence: "1",
        description: "Opening",
        currency: "BRL",
        origin: "SYSTEM",
        reversal_of_id: "entry-original",
        reversed_by_id: "entry-reversal",
        version: 1,
      },
      postings: [
        {
          id: "posting-1",
          book_id: "book-1",
          journal_entry_id: "entry-1",
          account_id: "account-1",
          position: 0,
          amount_minor: "9007199254740993",
          currency: "BRL",
        },
        {
          id: "posting-2",
          book_id: "book-1",
          journal_entry_id: "entry-1",
          account_id: "account-2",
          position: 1,
          amount_minor: "-9007199254740993",
          currency: "BRL",
        },
      ],
    });
  });

  it("uses row order for postings and returns an independent postings array", () => {
    const rows = [
      row({ posting_id: "posting-2", posting_account_id: "account-2", posting_position: 9, posting_amount_minor: "-10" }),
      row({ posting_id: "posting-1", posting_account_id: "account-1", posting_position: 4, posting_amount_minor: "10" }),
    ];
    const entry = JournalEntryMapper.toDomain(rows);

    expect(entry.postings.map((posting) => posting.id)).toEqual([
      "posting-2",
      "posting-1",
    ]);
    expect(entry.postings).not.toBe(rows);
  });

  it("preserves amounts above Number.MAX_SAFE_INTEGER as bigint values", () => {
    const entry = JournalEntryMapper.toDomain([
      row(),
      row({
        posting_id: "posting-2",
        posting_account_id: "account-2",
        posting_position: 1,
        posting_amount_minor: "-9007199254740993",
      }),
    ]);

    expect(entry.postings[0]?.amount.amountMinor).toBe(9007199254740993n);
    expect(entry.postings[1]?.amount.amountMinor).toBe(-9007199254740993n);
  });

  it("rejects an amount outside signed 64-bit before restoring", () => {
    let error: unknown;
    try {
      JournalEntryMapper.toDomain([
        row({ posting_amount_minor: "9223372036854775808" }),
      ]);
    } catch (caught) {
      error = caught;
    }

    expect(error).toMatchObject({
      code: "UNEXPECTED_ERROR",
      message: "amountMinor is outside the supported SQLite range",
    });
  });

  it("rejects empty and inconsistent row groups", () => {
    expect(() => JournalEntryMapper.toDomain([])).toThrow(
      "Cannot restore a journal entry without postings",
    );
    expect(() =>
      JournalEntryMapper.toDomain([
        row(),
        row({ id: "entry-2", posting_id: "posting-2", posting_account_id: "account-2", posting_amount_minor: "-9007199254740993" }),
      ]),
    ).toThrow("Inconsistent journal_entries rows");
  });

  it("rejects invalid enums and relational row fields", () => {
    expect(() =>
      JournalEntryMapper.toDomain([row({ origin: "IMPORT" })]),
    ).toThrow("Invalid journal row origin");
    expect(() =>
      JournalEntryMapper.toDomain([row({ posting_book_id: "book-2" })]),
    ).toThrow("Inconsistent posting relationship");
  });

  it("restores without collecting domain facts", () => {
    const entry = JournalEntryMapper.toDomain([
      row(),
      row({
        posting_id: "posting-2",
        posting_account_id: "account-2",
        posting_position: 1,
        posting_amount_minor: "-9007199254740993",
      }),
    ]);

    expect(entry.pullDomainFacts()).toEqual([]);
  });
});
