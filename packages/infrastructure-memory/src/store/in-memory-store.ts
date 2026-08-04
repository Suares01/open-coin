import type {
  FinancialBookSnapshot,
  JournalEntrySnapshot,
  LedgerAccountSnapshot,
} from "@open-coin/domain";
import type { BookId, JournalEntryId, LedgerAccountId } from "@open-coin/domain";

export interface InMemoryStoreSnapshot {
  readonly books: readonly FinancialBookSnapshot[];
  readonly accounts: readonly LedgerAccountSnapshot[];
  readonly journalEntries: readonly JournalEntrySnapshot[];
}

export class InMemoryStore {
  private readonly books = new Map<string, FinancialBookSnapshot>();
  private readonly accounts = new Map<string, LedgerAccountSnapshot>();
  private readonly journalEntries = new Map<string, JournalEntrySnapshot>();

  snapshot(): InMemoryStoreSnapshot {
    return {
      books: [...this.books.values()].map(cloneBook),
      accounts: [...this.accounts.values()].map(cloneAccount),
      journalEntries: [...this.journalEntries.values()].map(cloneJournalEntry),
    };
  }

  restore(snapshot: InMemoryStoreSnapshot): void {
    this.books.clear();
    this.accounts.clear();
    this.journalEntries.clear();

    for (const book of snapshot.books) {
      this.books.set(book.id, cloneBook(book));
    }
    for (const account of snapshot.accounts) {
      this.accounts.set(account.id, cloneAccount(account));
    }
    for (const entry of snapshot.journalEntries) {
      this.journalEntries.set(entry.id, cloneJournalEntry(entry));
    }
  }

  getBook(id: BookId): FinancialBookSnapshot | undefined {
    const snapshot = this.books.get(id);
    return snapshot === undefined ? undefined : cloneBook(snapshot);
  }

  getAccount(id: LedgerAccountId): LedgerAccountSnapshot | undefined {
    const snapshot = this.accounts.get(id);
    return snapshot === undefined ? undefined : cloneAccount(snapshot);
  }

  getJournalEntry(id: JournalEntryId): JournalEntrySnapshot | undefined {
    const snapshot = this.journalEntries.get(id);
    return snapshot === undefined ? undefined : cloneJournalEntry(snapshot);
  }

  listBooks(): readonly FinancialBookSnapshot[] {
    return [...this.books.values()].map(cloneBook);
  }

  listAccounts(): readonly LedgerAccountSnapshot[] {
    return [...this.accounts.values()].map(cloneAccount);
  }

  listJournalEntries(): readonly JournalEntrySnapshot[] {
    return [...this.journalEntries.values()].map(cloneJournalEntry);
  }

  putBook(snapshot: FinancialBookSnapshot): void {
    this.books.set(snapshot.id, cloneBook(snapshot));
  }

  putAccount(snapshot: LedgerAccountSnapshot): void {
    this.accounts.set(snapshot.id, cloneAccount(snapshot));
  }

  putJournalEntry(snapshot: JournalEntrySnapshot): void {
    this.journalEntries.set(snapshot.id, cloneJournalEntry(snapshot));
  }
}

function cloneBook(snapshot: FinancialBookSnapshot): FinancialBookSnapshot {
  return { ...snapshot };
}

function cloneAccount(snapshot: LedgerAccountSnapshot): LedgerAccountSnapshot {
  return { ...snapshot };
}

function cloneJournalEntry(snapshot: JournalEntrySnapshot): JournalEntrySnapshot {
  return {
    ...snapshot,
    postings: snapshot.postings.map((posting) => ({ ...posting })),
  };
}
