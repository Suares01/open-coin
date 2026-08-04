import type {
  BookId,
  LedgerAccountId,
  LocalDate,
} from "@open-coin/domain";

export interface AccountBalanceView {
  readonly accountId: string;
  readonly asOf: string | null;
  readonly amountMinor: string;
  readonly currency: string;
}

export interface AccountStatementItemView {
  readonly journalEntryId: string;
  readonly occurredOn: string;
  readonly description: string;
  readonly amountMinor: string;
  readonly runningBalanceMinor: string;
  readonly currency: string;
}

export interface LedgerQueries {
  getAccountBalance(input: {
    bookId: BookId;
    accountId: LedgerAccountId;
    asOf?: LocalDate;
  }): Promise<AccountBalanceView>;
  getAccountStatement(input: {
    bookId: BookId;
    accountId: LedgerAccountId;
  }): Promise<readonly AccountStatementItemView[]>;
}
