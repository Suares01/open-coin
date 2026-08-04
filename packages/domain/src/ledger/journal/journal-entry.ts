import { Currency } from "../../shared/identity/currency.js";
import type {
  BookId,
  JournalEntryId,
  PostingId,
} from "../../shared/identity/ids.js";
import { AggregateRoot } from "../../shared/kernel/aggregate-root.js";
import { DomainError } from "../../shared/kernel/domain-error.js";
import { LocalDate } from "../../shared/local-date.js";
import { Posting } from "./posting.js";
import type { PostingSnapshot } from "./posting.js";

export type JournalEntryOrigin = "MANUAL" | "SYSTEM";

export interface JournalEntrySnapshot {
  readonly id: JournalEntryId;
  readonly bookId: BookId;
  readonly occurredOn: string;
  readonly recordedAt: string;
  readonly sequence: string;
  readonly description: string;
  readonly currency: string;
  readonly origin: JournalEntryOrigin;
  readonly postings: readonly PostingSnapshot[];
  readonly reversalOf?: JournalEntryId;
  readonly reversedBy?: JournalEntryId;
  readonly version: number;
}

export interface PostJournalEntryInput {
  readonly id: JournalEntryId;
  readonly bookId: BookId;
  readonly occurredOn: LocalDate;
  readonly recordedAt: string;
  readonly sequence: string;
  readonly description: string;
  readonly currency: Currency;
  readonly origin: JournalEntryOrigin;
  readonly postings: readonly Posting[];
}

export interface CreateJournalEntryReversalInput {
  readonly id: JournalEntryId;
  readonly occurredOn: LocalDate;
  readonly recordedAt: string;
  readonly sequence: string;
  readonly description: string;
  readonly postingIds: readonly PostingId[];
}

export type RestoreJournalEntryInput = JournalEntrySnapshot;

export class JournalEntry extends AggregateRoot<
  JournalEntryId,
  JournalEntrySnapshot
> {
  private constructor(
    id: JournalEntryId,
    private readonly entryBookId: BookId,
    private readonly entryOccurredOn: LocalDate,
    private readonly entryRecordedAt: string,
    private readonly entrySequence: string,
    private readonly entryDescription: string,
    private readonly entryCurrency: Currency,
    private readonly entryOrigin: JournalEntryOrigin,
    private readonly entryPostings: readonly Posting[],
    private readonly entryReversalOf: JournalEntryId | undefined,
    private entryReversedBy: JournalEntryId | undefined,
    private entryVersion: number,
  ) {
    super(id);
  }

  static post(input: PostJournalEntryInput): JournalEntry {
    const description = input.description.trim();
    if (description.length === 0) {
      throw new DomainError(
        "INVALID_JOURNAL_DESCRIPTION",
        "Journal entry description cannot be empty",
      );
    }

    validateOrderMetadata(input.recordedAt, input.sequence);
    validatePostings(input.postings, input.currency);
    const entry = new JournalEntry(
      input.id,
      input.bookId,
      input.occurredOn,
      input.recordedAt,
      input.sequence,
      description,
      input.currency,
      input.origin,
      input.postings.slice(),
      undefined,
      undefined,
      0,
    );
    entry.recordFact({
      type: "JournalEntryPosted",
      aggregateId: input.id,
      payload: entry.toSnapshot(),
    });
    return entry;
  }

  static restore(snapshot: RestoreJournalEntryInput): JournalEntry {
    const currency = Currency.parse(snapshot.currency);
    const postings = snapshot.postings.map((posting) => Posting.restore(posting));
    validatePostings(postings, currency);

    return new JournalEntry(
      snapshot.id,
      snapshot.bookId,
      LocalDate.parse(snapshot.occurredOn),
      validateRecordedAt(snapshot.recordedAt),
      validateSequence(snapshot.sequence),
      snapshot.description,
      currency,
      snapshot.origin,
      postings,
      snapshot.reversalOf,
      snapshot.reversedBy,
      snapshot.version,
    );
  }

  get bookId(): BookId {
    return this.entryBookId;
  }

  get occurredOn(): LocalDate {
    return this.entryOccurredOn;
  }

  get recordedAt(): string {
    return this.entryRecordedAt;
  }

  get sequence(): string {
    return this.entrySequence;
  }

  get description(): string {
    return this.entryDescription;
  }

  get currency(): Currency {
    return this.entryCurrency;
  }

  get origin(): JournalEntryOrigin {
    return this.entryOrigin;
  }

  get postings(): readonly Posting[] {
    return this.entryPostings.slice();
  }

  get reversalOf(): JournalEntryId | undefined {
    return this.entryReversalOf;
  }

  get reversedBy(): JournalEntryId | undefined {
    return this.entryReversedBy;
  }

  get version(): number {
    return this.entryVersion;
  }

  createReversal(input: CreateJournalEntryReversalInput): JournalEntry {
    if (this.reversedBy !== undefined) {
      throw new DomainError(
        "JOURNAL_ENTRY_ALREADY_REVERSED",
        "Journal entry has already been reversed",
      );
    }

    if (input.postingIds.length !== this.postings.length) {
      throw new DomainError(
        "INVALID_REVERSAL_POSTINGS",
        "A reversal requires one posting id for each original posting",
      );
    }

    const reversedPostings = this.postings.map((posting, index) => {
      const postingId = input.postingIds[index];
      if (postingId === undefined) {
        throw new DomainError(
          "INVALID_REVERSAL_POSTINGS",
          "A reversal requires one posting id for each original posting",
        );
      }

      return posting.reverse(postingId);
    });
    const description = input.description.trim();
    if (description.length === 0) {
      throw new DomainError(
        "INVALID_JOURNAL_DESCRIPTION",
        "Journal entry description cannot be empty",
      );
    }

    const reversal = new JournalEntry(
      input.id,
      this.bookId,
      input.occurredOn,
      input.recordedAt,
      input.sequence,
      description,
      this.currency,
      "SYSTEM",
      reversedPostings,
      this.id,
      undefined,
      0,
    );
    reversal.recordFact({
      type: "JournalEntryPosted",
      aggregateId: reversal.id,
      payload: reversal.toSnapshot(),
    });
    return reversal;
  }

  markReversedBy(id: JournalEntryId): void {
    if (this.reversedBy !== undefined) {
      throw new DomainError(
        "JOURNAL_ENTRY_ALREADY_REVERSED",
        "Journal entry has already been reversed",
      );
    }

    this.entryReversedBy = id;
    this.entryVersion += 1;
    this.recordFact({
      type: "JournalEntryReversed",
      aggregateId: this.id,
      payload: {
        bookId: this.bookId,
        originalId: this.id,
        reversalId: id,
      },
    });
  }

  toSnapshot(): JournalEntrySnapshot {
    return {
      id: this.id,
      bookId: this.bookId,
      occurredOn: this.occurredOn.value,
      recordedAt: this.recordedAt,
      sequence: this.sequence,
      description: this.description,
      currency: this.currency.code,
      origin: this.origin,
      postings: this.postings.map((posting) => posting.toSnapshot()),
      ...(this.reversalOf === undefined ? {} : { reversalOf: this.reversalOf }),
      ...(this.reversedBy === undefined ? {} : { reversedBy: this.reversedBy }),
      version: this.version,
    };
  }
}

function validateOrderMetadata(recordedAt: string, sequence: string): void {
  validateRecordedAt(recordedAt);
  validateSequence(sequence);
}

function validateRecordedAt(recordedAt: string): string {
  if (
    typeof recordedAt !== "string" ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?(?:Z|[+-]\d{2}:\d{2})$/.test(recordedAt) ||
    Number.isNaN(Date.parse(recordedAt))
  ) {
    throw new DomainError(
      "INVALID_RECORDED_AT",
      "Journal entry recordedAt must be a valid ISO 8601 instant",
    );
  }

  return recordedAt;
}

function validateSequence(sequence: string): string {
  if (typeof sequence !== "string" || !/^(0|[1-9]\d*)$/.test(sequence)) {
    throw new DomainError(
      "INVALID_JOURNAL_SEQUENCE",
      "Journal entry sequence must be a non-negative decimal string",
    );
  }

  return sequence;
}

function validatePostings(
  postings: readonly Posting[],
  currency: Currency,
): void {
  if (postings.length < 2) {
    throw new DomainError(
      "INSUFFICIENT_POSTINGS",
      "A journal entry requires at least two postings",
    );
  }

  if (new Set(postings.map((posting) => posting.accountId)).size < 2) {
    throw new DomainError(
      "INSUFFICIENT_ACCOUNTS",
      "A journal entry requires at least two distinct accounts",
    );
  }

  let total = 0n;
  for (const posting of postings) {
    if (posting.amount.amountMinor === 0n) {
      throw new DomainError(
        "ZERO_POSTING_AMOUNT",
        "Posting amount cannot be zero",
      );
    }

    if (!posting.amount.currency.equals(currency)) {
      throw new DomainError(
        "CURRENCY_MISMATCH",
        "Journal entry postings must use the entry currency",
      );
    }

    total += posting.amount.amountMinor;
  }

  if (total !== 0n) {
    throw new DomainError(
      "UNBALANCED_JOURNAL_ENTRY",
      "Journal entry postings must sum to zero",
    );
  }
}
