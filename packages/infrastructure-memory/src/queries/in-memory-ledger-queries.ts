import {
  normalBalanceOf,
  type BookId,
  type LedgerAccountId,
  type LocalDate,
} from "@open-coin/domain";
import type {
  AccountBalanceView,
  AccountStatementItemView,
  LedgerQueries,
} from "@open-coin/application";
import { InMemoryStore } from "../store/in-memory-store.js";

export class InMemoryLedgerQueries implements LedgerQueries {
  constructor(private readonly store: InMemoryStore) {}

  async getAccountBalance(input: {
    bookId: BookId;
    accountId: LedgerAccountId;
    asOf?: LocalDate;
  }): Promise<AccountBalanceView> {
    const account = this.store.getAccount(input.accountId);
    if (account === undefined) {
      throw new Error(`Ledger account ${input.accountId} was not found`);
    }

    const entries = this.entriesForAccount(input.bookId, input.accountId)
      .filter((entry) => input.asOf === undefined || entry.occurredOn <= input.asOf.value);
    const rawBalance = entries.reduce(
      (balance, entry) => balance + entry.amountMinor,
      0n,
    );

    return {
      accountId: account.id,
      asOf: input.asOf?.value ?? null,
      amountMinor: toDisplayedAmount(rawBalance, account.kind),
      currency: this.currencyForBook(input.bookId, entries[0]?.currency),
    };
  }

  async getAccountStatement(input: {
    bookId: BookId;
    accountId: LedgerAccountId;
  }): Promise<readonly AccountStatementItemView[]> {
    const account = this.store.getAccount(input.accountId);
    if (account === undefined) {
      throw new Error(`Ledger account ${input.accountId} was not found`);
    }

    const entries = this.entriesForAccount(input.bookId, input.accountId).sort(compareAscending);
    let rawRunningBalance = 0n;
    const statement = entries.map((entry) => {
      rawRunningBalance += entry.amountMinor;
      return {
        journalEntryId: entry.journalEntryId,
        occurredOn: entry.occurredOn,
        description: entry.description,
        amountMinor: entry.amountMinor.toString(),
        runningBalanceMinor: toDisplayedAmount(rawRunningBalance, account.kind),
        currency: entry.currency,
      } satisfies AccountStatementItemView;
    });

    return statement.reverse();
  }

  private entriesForAccount(bookId: BookId, accountId: LedgerAccountId): AccountPosting[] {
    return this.store
      .listJournalEntries()
      .filter((entry) => entry.bookId === bookId)
      .flatMap((entry) =>
        entry.postings
          .filter((posting) => posting.accountId === accountId)
          .map((posting) => ({
            journalEntryId: entry.id,
            occurredOn: entry.occurredOn,
            description: entry.description,
            amountMinor: posting.amountMinor,
            currency: posting.currency,
          })),
      );
  }

  private currencyForBook(bookId: BookId, fallback: string | undefined): string {
    return this.store.getBook(bookId)?.baseCurrency ?? fallback ?? "";
  }
}

interface AccountPosting {
  readonly journalEntryId: string;
  readonly occurredOn: string;
  readonly description: string;
  readonly amountMinor: bigint;
  readonly currency: string;
}

function compareAscending(left: AccountPosting, right: AccountPosting): number {
  const dateOrder = left.occurredOn.localeCompare(right.occurredOn);
  return dateOrder === 0
    ? left.journalEntryId.localeCompare(right.journalEntryId)
    : dateOrder;
}

function toDisplayedAmount(amountMinor: bigint, kind: Parameters<typeof normalBalanceOf>[0]): string {
  return (normalBalanceOf(kind) === "DEBIT" ? amountMinor : -amountMinor).toString();
}
