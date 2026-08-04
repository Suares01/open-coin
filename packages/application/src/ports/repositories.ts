import type {
  FinancialBook,
  JournalEntry,
  LedgerAccount,
  LedgerAccountKind,
  SystemAccountPurpose,
} from "@open-coin/domain";
import type {
  BookId,
  JournalEntryId,
  LedgerAccountId,
} from "@open-coin/domain";
import type { DomainFact } from "@open-coin/domain";

export interface FinancialBookRepository {
  findById(id: BookId): Promise<FinancialBook | null>;
  add(book: FinancialBook): Promise<void>;
  save(book: FinancialBook, expectedVersion: number): Promise<void>;
}

export interface LedgerAccountRepository {
  findById(id: LedgerAccountId): Promise<LedgerAccount | null>;
  findBySystemPurpose(
    bookId: BookId,
    purpose: SystemAccountPurpose,
  ): Promise<LedgerAccount | null>;
  existsWithName(
    bookId: BookId,
    kind: LedgerAccountKind,
    normalizedName: string,
  ): Promise<boolean>;
  add(account: LedgerAccount): Promise<void>;
  save(account: LedgerAccount, expectedVersion: number): Promise<void>;
}

export interface JournalEntryRepository {
  findById(id: JournalEntryId): Promise<JournalEntry | null>;
  add(entry: JournalEntry): Promise<void>;
  save(entry: JournalEntry, expectedVersion: number): Promise<void>;
}

export interface DomainFactCollector {
  record(facts: readonly DomainFact[]): void;
  pull(): readonly DomainFact[];
}

export interface RepositoryContext {
  readonly books: FinancialBookRepository;
  readonly accounts: LedgerAccountRepository;
  readonly journalEntries: JournalEntryRepository;
  readonly facts: DomainFactCollector;
}
