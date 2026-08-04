import {
  CreateExpenseCategory,
  CreateFinancialAccount,
  CreateFinancialBook,
  CreateIncomeCategory,
  DomainEventDispatcher,
  GetAccountBalance,
  GetAccountStatement,
  RecordExpense,
  RecordIncome,
  ReverseJournalEntry,
  SetOpeningBalance,
  TransferMoney,
  type LedgerAccountRepository,
  type LedgerQueries,
  type TransactionManager,
} from "@open-coin/application";
import {
  CollectingDomainEventPublisher,
  FixedClock,
  InMemoryLedgerAccountRepository,
  InMemoryLedgerQueries,
  InMemoryStore,
  InMemoryTransactionManager,
  SequentialIdGenerator,
} from "@open-coin/infrastructure-memory";
import { describe, expect, it } from "vitest";
import { initializeSqliteDatabase } from "../../src/database/initialize-sqlite-database.js";
import { SqliteLedgerAccountRepository } from "../../src/repositories/sqlite-ledger-account-repository.js";
import { SqliteLedgerQueries } from "../../src/queries/sqlite-ledger-queries.js";
import { SqliteTransactionManager } from "../../src/transaction/sqlite-transaction-manager.js";
import { BetterSqliteDatabase } from "../support/better-sqlite-database.js";

type QueryAdapter = {
  readonly transactionManager: TransactionManager;
  readonly dispatcher: DomainEventDispatcher;
  readonly ids: SequentialIdGenerator;
  readonly clock: FixedClock;
  readonly publisher: CollectingDomainEventPublisher;
  readonly accounts: LedgerAccountRepository;
  readonly queries: LedgerQueries;
  close(): Promise<void>;
};

type AdapterFactory = () => Promise<QueryAdapter>;

const bookCommand = {
  name: "Personal book",
  baseCurrency: "BRL",
  timezone: "America/Sao_Paulo",
};

function createDispatcher(
  ids: SequentialIdGenerator,
  publisher: CollectingDomainEventPublisher,
): DomainEventDispatcher {
  return new DomainEventDispatcher(
    new FixedClock("2026-08-04T12:00:00.000Z", "2026-08-04"),
    ids,
    publisher,
  );
}

const memoryFactory: AdapterFactory = async () => {
  const store = new InMemoryStore();
  const ids = new SequentialIdGenerator();
  const publisher = new CollectingDomainEventPublisher();
  return {
    transactionManager: new InMemoryTransactionManager(store),
    dispatcher: createDispatcher(ids, publisher),
    ids,
    clock: new FixedClock("2026-08-04T12:00:00.000Z", "2026-08-04"),
    publisher,
    accounts: new InMemoryLedgerAccountRepository(store),
    queries: new InMemoryLedgerQueries(store),
    close: async () => undefined,
  };
};

const sqliteFactory: AdapterFactory = async () => {
  const database = new BetterSqliteDatabase();
  await initializeSqliteDatabase(database, { inMemory: true });
  const ids = new SequentialIdGenerator();
  const publisher = new CollectingDomainEventPublisher();
  return {
    transactionManager: new SqliteTransactionManager(database),
    dispatcher: createDispatcher(ids, publisher),
    ids,
    clock: new FixedClock("2026-08-04T12:00:00.000Z", "2026-08-04"),
    publisher,
    accounts: new SqliteLedgerAccountRepository(database),
    queries: new SqliteLedgerQueries(database),
    close: () => database.close(),
  };
};

async function withAdapter<T>(
  factory: AdapterFactory,
  work: (adapter: QueryAdapter) => Promise<T>,
): Promise<T> {
  const adapter = await factory();
  try {
    return await work(adapter);
  } finally {
    await adapter.close();
  }
}

async function createBook(adapter: QueryAdapter): Promise<void> {
  const result = await new CreateFinancialBook(
    adapter.transactionManager,
    adapter.dispatcher,
    adapter.ids,
  ).execute(bookCommand);
  expect(result).toMatchObject({ ok: true, value: { id: "book-1" } });
  adapter.publisher.clear();
}

async function createFinancialAccount(
  adapter: QueryAdapter,
  kind: "ASSET" | "LIABILITY" = "ASSET",
  name = kind === "ASSET" ? "Checking" : "Credit card",
): Promise<void> {
  const result = await new CreateFinancialAccount(
    adapter.transactionManager,
    adapter.dispatcher,
    adapter.ids,
  ).execute({ bookId: "book-1", name, kind });
  expect(result).toMatchObject({ ok: true, value: { bookId: "book-1", kind } });
  adapter.publisher.clear();
}

async function createExpenseCategory(adapter: QueryAdapter): Promise<void> {
  const result = await new CreateExpenseCategory(
    adapter.transactionManager,
    adapter.dispatcher,
    adapter.ids,
  ).execute({ bookId: "book-1", name: "Food", kind: "EXPENSE" });
  expect(result).toMatchObject({ ok: true, value: { bookId: "book-1", kind: "EXPENSE" } });
  adapter.publisher.clear();
}

async function createIncomeCategory(adapter: QueryAdapter): Promise<void> {
  const result = await new CreateIncomeCategory(
    adapter.transactionManager,
    adapter.dispatcher,
    adapter.ids,
  ).execute({ bookId: "book-1", name: "Salary", kind: "INCOME" });
  expect(result).toMatchObject({ ok: true, value: { bookId: "book-1", kind: "INCOME" } });
  adapter.publisher.clear();
}

function balance(adapter: QueryAdapter, queries = adapter.queries): GetAccountBalance {
  return new GetAccountBalance(adapter.accounts, queries);
}

function statement(adapter: QueryAdapter, queries = adapter.queries): GetAccountStatement {
  return new GetAccountStatement(adapter.accounts, queries);
}

async function preparedExpense(
  adapter: QueryAdapter,
  amountMinor = "2500",
): Promise<void> {
  await createBook(adapter);
  await createFinancialAccount(adapter);
  await createExpenseCategory(adapter);
  const result = await new RecordExpense(
    adapter.transactionManager,
    adapter.dispatcher,
    adapter.ids,
    adapter.clock,
  ).execute({
    bookId: "book-1",
    accountId: "account-5",
    categoryId: "account-6",
    amountMinor,
    currency: "BRL",
    occurredOn: "2026-08-04",
    description: "Lunch",
  });
  expect(result).toMatchObject({ ok: true, value: { id: "entry-1" } });
  adapter.publisher.clear();
}

async function completeFlow(adapter: QueryAdapter): Promise<{
  readonly asset: readonly unknown[];
  readonly liability: readonly unknown[];
  readonly events: readonly unknown[];
}> {
  await createBook(adapter);
  await createFinancialAccount(adapter, "ASSET");
  await createFinancialAccount(adapter, "LIABILITY");
  await createExpenseCategory(adapter);
  await createIncomeCategory(adapter);

  const opening = await new SetOpeningBalance(
    adapter.transactionManager,
    adapter.dispatcher,
    adapter.ids,
    adapter.clock,
  ).execute({
    bookId: "book-1",
    accountId: "account-5",
    amountMinor: "10000",
    currency: "BRL",
    occurredOn: "2026-08-01",
    description: "Opening",
  });
  expect(opening).toMatchObject({ ok: true, value: { id: "entry-1" } });

  const expense = await new RecordExpense(
    adapter.transactionManager,
    adapter.dispatcher,
    adapter.ids,
    adapter.clock,
  ).execute({
    bookId: "book-1",
    accountId: "account-5",
    categoryId: "account-7",
    amountMinor: "2500",
    currency: "BRL",
    occurredOn: "2026-08-02",
    description: "Lunch",
  });
  expect(expense).toMatchObject({ ok: true, value: { id: "entry-2" } });

  const income = await new RecordIncome(
    adapter.transactionManager,
    adapter.dispatcher,
    adapter.ids,
    adapter.clock,
  ).execute({
    bookId: "book-1",
    accountId: "account-5",
    categoryId: "account-8",
    amountMinor: "5000",
    currency: "BRL",
    occurredOn: "2026-08-03",
    description: "Salary",
  });
  expect(income).toMatchObject({ ok: true, value: { id: "entry-3" } });

  const transfer = await new TransferMoney(
    adapter.transactionManager,
    adapter.dispatcher,
    adapter.ids,
    adapter.clock,
  ).execute({
    bookId: "book-1",
    sourceAccountId: "account-5",
    destinationAccountId: "account-6",
    amountMinor: "2000",
    currency: "BRL",
    occurredOn: "2026-08-04",
    description: "Move to card",
  });
  expect(transfer).toMatchObject({ ok: true, value: { id: "entry-4" } });

  const reversal = await new ReverseJournalEntry(
    adapter.transactionManager,
    adapter.dispatcher,
    adapter.ids,
    adapter.clock,
  ).execute({
    bookId: "book-1",
    journalEntryId: "entry-2",
    occurredOn: "2026-08-05",
    description: "Reverse lunch",
  });
  expect(reversal).toMatchObject({ ok: true, value: { id: "entry-5" } });

  const result = await Promise.all([
    statement(adapter).execute({ bookId: "book-1", accountId: "account-5" }),
    statement(adapter).execute({ bookId: "book-1", accountId: "account-6" }),
  ]);
  expect(result[0]).toMatchObject({ ok: true });
  expect(result[1]).toMatchObject({ ok: true });
  if (!result[0].ok || !result[1].ok) {
    throw new Error("Statement fixture failed");
  }
  return { asset: result[0].value, liability: result[1].value, events: adapter.publisher.events };
}

function throwingQueries(message: string): LedgerQueries {
  return {
    getAccountBalance: async () => {
      throw new Error(message);
    },
    getAccountStatement: async () => {
      throw new Error(message);
    },
  };
}

function defineQueryContracts(name: string, factory: AdapterFactory): void {
  describe(name, () => {
    it("returns exact serializable balance, currency and as-of date", async () => withAdapter(factory, async (adapter) => {
      await preparedExpense(adapter, "9007199254740993");
      await expect(balance(adapter).execute({ bookId: "book-1", accountId: "account-5", asOf: "2026-08-04" })).resolves.toEqual({
        ok: true,
        value: { accountId: "account-5", asOf: "2026-08-04", amountMinor: "-9007199254740993", currency: "BRL" },
      });
    }));

    it("exposes a liability balance with its displayed sign", async () => withAdapter(factory, async (adapter) => {
      await createBook(adapter);
      await createFinancialAccount(adapter, "LIABILITY");
      await createIncomeCategory(adapter);
      await new RecordIncome(adapter.transactionManager, adapter.dispatcher, adapter.ids, adapter.clock).execute({ bookId: "book-1", accountId: "account-5", categoryId: "account-6", amountMinor: "100", currency: "BRL", occurredOn: "2026-08-01", description: "Charge" });
      await expect(balance(adapter).execute({ bookId: "book-1", accountId: "account-5" })).resolves.toMatchObject({ ok: true, value: { amountMinor: "-100", asOf: null, currency: "BRL" } });
    }));

    it("returns ENTITY_NOT_FOUND for a missing account without querying", async () => withAdapter(factory, async (adapter) => {
      await expect(balance(adapter, throwingQueries("missing account should not query")).execute({ bookId: "book-1", accountId: "missing" })).resolves.toMatchObject({ ok: false, error: { code: "ENTITY_NOT_FOUND" } });
    }));

    it("returns ENTITY_NOT_FOUND for an account from another book without querying", async () => withAdapter(factory, async (adapter) => {
      await createBook(adapter);
      await createFinancialAccount(adapter);
      await expect(balance(adapter, throwingQueries("cross-book query should not run")).execute({ bookId: "book-2", accountId: "account-5" })).resolves.toMatchObject({ ok: false, error: { code: "ENTITY_NOT_FOUND" } });
    }));

    it("rejects an invalid as-of date with the stable date error", async () => withAdapter(factory, async (adapter) => {
      await createBook(adapter);
      await createFinancialAccount(adapter);
      await expect(balance(adapter, throwingQueries("invalid date should stop before querying")).execute({ bookId: "book-1", accountId: "account-5", asOf: "2026-02-30" })).resolves.toMatchObject({ ok: false, error: { code: "INVALID_DATE" } });
    }));

    it("maps an unexpected query failure to the public error boundary", async () => withAdapter(factory, async (adapter) => {
      await createBook(adapter);
      await createFinancialAccount(adapter);
      await expect(balance(adapter, throwingQueries("query failed")).execute({ bookId: "book-1", accountId: "account-5" })).resolves.toMatchObject({ ok: false, error: { code: "UNEXPECTED_ERROR", message: "query failed" } });
    }));

    it("returns exact serializable fields for each posting item", async () => withAdapter(factory, async (adapter) => {
      await preparedExpense(adapter);
      await expect(statement(adapter).execute({ bookId: "book-1", accountId: "account-5" })).resolves.toEqual({
        ok: true,
        value: [{ journalEntryId: "entry-1", occurredOn: "2026-08-04", recordedAt: "2026-08-04T12:00:00.000Z", sequence: "1", description: "Lunch", amountMinor: "-2500", runningBalanceMinor: "-2500", currency: "BRL" }],
      });
    }));

    it("returns statement items in descending date and sequence order with chronological balances", async () => withAdapter(factory, async (adapter) => {
      await preparedExpense(adapter);
      await new RecordExpense(adapter.transactionManager, adapter.dispatcher, adapter.ids, adapter.clock).execute({ bookId: "book-1", accountId: "account-5", categoryId: "account-6", amountMinor: "1000", currency: "BRL", occurredOn: "2026-08-05", description: "Dinner" });
      await expect(statement(adapter).execute({ bookId: "book-1", accountId: "account-5" })).resolves.toEqual({
        ok: true,
        value: [
          { journalEntryId: "entry-2", occurredOn: "2026-08-05", recordedAt: "2026-08-04T12:00:00.000Z", sequence: "2", description: "Dinner", amountMinor: "-1000", runningBalanceMinor: "-3500", currency: "BRL" },
          { journalEntryId: "entry-1", occurredOn: "2026-08-04", recordedAt: "2026-08-04T12:00:00.000Z", sequence: "1", description: "Lunch", amountMinor: "-2500", runningBalanceMinor: "-2500", currency: "BRL" },
        ],
      });
    }));

    it("returns an empty statement for a valid account without postings", async () => withAdapter(factory, async (adapter) => {
      await createBook(adapter);
      await createFinancialAccount(adapter);
      await expect(statement(adapter).execute({ bookId: "book-1", accountId: "account-5" })).resolves.toEqual({ ok: true, value: [] });
    }));

    it("rejects a missing account before querying", async () => withAdapter(factory, async (adapter) => {
      await expect(statement(adapter, throwingQueries("missing account should not query")).execute({ bookId: "book-1", accountId: "missing" })).resolves.toMatchObject({ ok: false, error: { code: "ENTITY_NOT_FOUND" } });
    }));

    it("rejects an account from another book without exposing its statement", async () => withAdapter(factory, async (adapter) => {
      await createBook(adapter);
      await createFinancialAccount(adapter);
      await expect(statement(adapter, throwingQueries("foreign account should not query")).execute({ bookId: "book-2", accountId: "account-5" })).resolves.toMatchObject({ ok: false, error: { code: "ENTITY_NOT_FOUND" } });
    }));

    it("rejects a valid account requested under another book without querying", async () => withAdapter(factory, async (adapter) => {
      await preparedExpense(adapter);
      await expect(statement(adapter, throwingQueries("book mismatch should not query")).execute({ bookId: "book-2", accountId: "account-5" })).resolves.toMatchObject({ ok: false, error: { code: "ENTITY_NOT_FOUND" } });
    }));

    it("maps an unexpected statement query failure to the public error boundary", async () => withAdapter(factory, async (adapter) => {
      await preparedExpense(adapter);
      await expect(statement(adapter, throwingQueries("statement query failed")).execute({ bookId: "book-1", accountId: "account-5" })).resolves.toMatchObject({ ok: false, error: { code: "UNEXPECTED_ERROR", message: "statement query failed" } });
    }));

    it("reconstructs the complete asset statement with a reversed expense at zero net effect", async () => withAdapter(factory, async (adapter) => {
      const result = await completeFlow(adapter);
      expect(result.asset).toEqual([
        { journalEntryId: "entry-5", occurredOn: "2026-08-05", recordedAt: "2026-08-04T12:00:00.000Z", sequence: "5", description: "Reverse lunch", amountMinor: "2500", runningBalanceMinor: "13000", currency: "BRL" },
        { journalEntryId: "entry-4", occurredOn: "2026-08-04", recordedAt: "2026-08-04T12:00:00.000Z", sequence: "4", description: "Move to card", amountMinor: "-2000", runningBalanceMinor: "10500", currency: "BRL" },
        { journalEntryId: "entry-3", occurredOn: "2026-08-03", recordedAt: "2026-08-04T12:00:00.000Z", sequence: "3", description: "Salary", amountMinor: "5000", runningBalanceMinor: "12500", currency: "BRL" },
        { journalEntryId: "entry-2", occurredOn: "2026-08-02", recordedAt: "2026-08-04T12:00:00.000Z", sequence: "2", description: "Lunch", amountMinor: "-2500", runningBalanceMinor: "7500", currency: "BRL" },
        { journalEntryId: "entry-1", occurredOn: "2026-08-01", recordedAt: "2026-08-04T12:00:00.000Z", sequence: "1", description: "Opening", amountMinor: "10000", runningBalanceMinor: "10000", currency: "BRL" },
      ]);
    }));

    it("reconstructs the liability statement with its normal balance sign", async () => withAdapter(factory, async (adapter) => {
      const result = await completeFlow(adapter);
      expect(result.liability).toEqual([{ journalEntryId: "entry-4", occurredOn: "2026-08-04", recordedAt: "2026-08-04T12:00:00.000Z", sequence: "4", description: "Move to card", amountMinor: "2000", runningBalanceMinor: "-2000", currency: "BRL" }]);
    }));

    it("produces equivalent statements and events with fixed adapters", async () => {
      const first = await withAdapter(factory, completeFlow);
      const second = await withAdapter(factory, completeFlow);
      expect(second).toEqual(first);
    });
  });
}

defineQueryContracts("memory query use cases", memoryFactory);
defineQueryContracts("sqlite query use cases", sqliteFactory);
