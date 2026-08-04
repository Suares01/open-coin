export interface CreateFinancialBookCommand {
  readonly name: string;
  readonly baseCurrency: string;
  readonly timezone: string;
}

export interface CreateFinancialAccountCommand {
  readonly bookId: string;
  readonly name: string;
  readonly kind: string;
}

export interface CreateCategoryCommand {
  readonly bookId: string;
  readonly name: string;
  readonly kind: string;
}

export interface JournalEntryCommand {
  readonly bookId: string;
  readonly accountId: string;
  readonly categoryId: string;
  readonly amountMinor: string;
  readonly currency: string;
  readonly occurredOn: string;
  readonly description: string;
}

export interface TransferMoneyCommand {
  readonly bookId: string;
  readonly sourceAccountId: string;
  readonly destinationAccountId: string;
  readonly amountMinor: string;
  readonly currency: string;
  readonly occurredOn: string;
  readonly description: string;
}

export interface SetOpeningBalanceCommand {
  readonly bookId: string;
  readonly accountId: string;
  readonly amountMinor: string;
  readonly currency: string;
  readonly occurredOn: string;
  readonly description: string;
}

export interface ReverseJournalEntryCommand {
  readonly bookId: string;
  readonly journalEntryId: string;
  readonly occurredOn: string;
  readonly description: string;
}

export interface AccountBalanceQuery {
  readonly bookId: string;
  readonly accountId: string;
  readonly asOf?: string;
}

export interface AccountStatementQuery {
  readonly bookId: string;
  readonly accountId: string;
}

export interface BookDto {
  readonly id: string;
  readonly name: string;
  readonly baseCurrency: string;
  readonly timezone: string;
  readonly version: number;
}

export interface AccountDto {
  readonly id: string;
  readonly bookId: string;
  readonly name: string;
  readonly kind: string;
  readonly status: string;
  readonly version: number;
}

export interface JournalEntryDto {
  readonly id: string;
  readonly bookId: string;
  readonly occurredOn: string;
  readonly description: string;
  readonly currency: string;
  readonly version: number;
}
