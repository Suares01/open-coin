import {
  GetAccountStatement,
  RecordExpense,
  RecordIncome,
  ReverseJournalEntry,
  SetOpeningBalance,
  TransferMoney,
  type LedgerQueries,
} from "@open-coin/application";
import type { BookId, LedgerAccountSnapshot } from "@open-coin/domain";
import { describe, expect, it } from "vitest";
import { InMemoryLedgerAccountRepository } from "../repositories/in-memory-ledger-account-repository.js";
import { InMemoryLedgerQueries } from "../queries/in-memory-ledger-queries.js";
import { InMemoryStore } from "../store/in-memory-store.js";
import {
  createBook,
  createExpenseCategory,
  createFinancialAccount,
  createHarness,
  createIncomeCategory,
} from "./test-helpers.js";

function useCase(
  store: InMemoryStore,
  queries: LedgerQueries = new InMemoryLedgerQueries(store),
) {
  return new GetAccountStatement(
    new InMemoryLedgerAccountRepository(store),
    queries,
  );
}

async function preparedExpense() {
  const harness = createHarness();
  await createBook(harness);
  await createFinancialAccount(harness);
  await createExpenseCategory(harness);
  const result = await new RecordExpense(
    harness.transactionManager,
    harness.dispatcher,
    harness.ids,
    harness.clock,
  ).execute({
    bookId: "book-1",
    accountId: "account-5",
    categoryId: "account-6",
    amountMinor: "2500",
    currency: "BRL",
    occurredOn: "2026-08-04",
    description: "Lunch",
  });
  if (!result.ok) {
    throw new Error(`Expense fixture failed: ${result.error.code}`);
  }
  harness.publisher.clear();
  return harness;
}

async function completeFlow() {
  const harness = createHarness();
  await createBook(harness);
  await createFinancialAccount(harness, "ASSET");
  await createFinancialAccount(harness, "LIABILITY");
  await createExpenseCategory(harness);
  await createIncomeCategory(harness);

  const opening = await new SetOpeningBalance(
    harness.transactionManager,
    harness.dispatcher,
    harness.ids,
    harness.clock,
  ).execute({
    bookId: "book-1",
    accountId: "account-5",
    amountMinor: "10000",
    currency: "BRL",
    occurredOn: "2026-08-01",
    description: "Opening",
  });
  if (!opening.ok) throw new Error(`Opening fixture failed: ${opening.error.code}`);

  const expense = await new RecordExpense(
    harness.transactionManager,
    harness.dispatcher,
    harness.ids,
    harness.clock,
  ).execute({
    bookId: "book-1",
    accountId: "account-5",
    categoryId: "account-7",
    amountMinor: "2500",
    currency: "BRL",
    occurredOn: "2026-08-02",
    description: "Lunch",
  });
  if (!expense.ok) throw new Error(`Expense fixture failed: ${expense.error.code}`);

  const income = await new RecordIncome(
    harness.transactionManager,
    harness.dispatcher,
    harness.ids,
    harness.clock,
  ).execute({
    bookId: "book-1",
    accountId: "account-5",
    categoryId: "account-8",
    amountMinor: "5000",
    currency: "BRL",
    occurredOn: "2026-08-03",
    description: "Salary",
  });
  if (!income.ok) throw new Error(`Income fixture failed: ${income.error.code}`);

  const transfer = await new TransferMoney(
    harness.transactionManager,
    harness.dispatcher,
    harness.ids,
    harness.clock,
  ).execute({
    bookId: "book-1",
    sourceAccountId: "account-5",
    destinationAccountId: "account-6",
    amountMinor: "2000",
    currency: "BRL",
    occurredOn: "2026-08-04",
    description: "Move to card",
  });
  if (!transfer.ok) throw new Error(`Transfer fixture failed: ${transfer.error.code}`);

  const reversal = await new ReverseJournalEntry(
    harness.transactionManager,
    harness.dispatcher,
    harness.ids,
    harness.clock,
  ).execute({
    bookId: "book-1",
    journalEntryId: expense.value.id,
    occurredOn: "2026-08-05",
    description: "Reverse lunch",
  });
  if (!reversal.ok) throw new Error(`Reversal fixture failed: ${reversal.error.code}`);

  const statement = useCase(harness.store);
  const assetStatement = await statement.execute({ bookId: "book-1", accountId: "account-5" });
  const liabilityStatement = await statement.execute({ bookId: "book-1", accountId: "account-6" });
  if (!assetStatement.ok || !liabilityStatement.ok) {
    throw new Error("Statement fixture failed");
  }

  return {
    harness,
    assetStatement: assetStatement.value,
    liabilityStatement: liabilityStatement.value,
  };
}

function foreignAccountSnapshot(): LedgerAccountSnapshot {
  return {
    id: "account-foreign" as never,
    bookId: "book-2" as BookId,
    name: "Foreign",
    normalizedName: "foreign",
    kind: "ASSET",
    status: "ACTIVE",
    version: 0,
  };
}

describe("GetAccountStatement", () => {
  it("returns exact serializable fields for each posting item", async () => {
    const harness = await preparedExpense();

    const result = await useCase(harness.store).execute({
      bookId: "book-1",
      accountId: "account-5",
    });

    expect(result).toEqual({
      ok: true,
      value: [
        {
          journalEntryId: "entry-1",
          occurredOn: "2026-08-04",
          recordedAt: "2026-08-04T12:00:00.000Z",
          sequence: "1",
          description: "Lunch",
          amountMinor: "-2500",
          runningBalanceMinor: "-2500",
          currency: "BRL",
        },
      ],
    });
  });

  it("returns statement items in descending date and sequence order with chronological balances", async () => {
    const harness = await preparedExpense();
    await new RecordExpense(
      harness.transactionManager,
      harness.dispatcher,
      harness.ids,
      harness.clock,
    ).execute({
      bookId: "book-1",
      accountId: "account-5",
      categoryId: "account-6",
      amountMinor: "1000",
      currency: "BRL",
      occurredOn: "2026-08-05",
      description: "Dinner",
    });

    const result = await useCase(harness.store).execute({
      bookId: "book-1",
      accountId: "account-5",
    });

    expect(result).toEqual({
      ok: true,
      value: [
        {
          journalEntryId: "entry-2",
          occurredOn: "2026-08-05",
          recordedAt: "2026-08-04T12:00:00.000Z",
          sequence: "2",
          description: "Dinner",
          amountMinor: "-1000",
          runningBalanceMinor: "-3500",
          currency: "BRL",
        },
        {
          journalEntryId: "entry-1",
          occurredOn: "2026-08-04",
          recordedAt: "2026-08-04T12:00:00.000Z",
          sequence: "1",
          description: "Lunch",
          amountMinor: "-2500",
          runningBalanceMinor: "-2500",
          currency: "BRL",
        },
      ],
    });
  });

  it("returns an empty statement for a valid account without postings", async () => {
    const harness = createHarness();
    await createBook(harness);
    await createFinancialAccount(harness);

    const result = await useCase(harness.store).execute({
      bookId: "book-1",
      accountId: "account-5",
    });

    expect(result).toEqual({ ok: true, value: [] });
  });

  it("rejects a missing account before querying", async () => {
    const store = new InMemoryStore();
    const queries: LedgerQueries = {
      getAccountBalance: async () => ({ accountId: "missing", accountName: "Missing", accountKind: "ASSET", rawBalanceMinor: "0", displayBalanceMinor: "0", asOf: null, amountMinor: "0", currency: "BRL" }),
      getAccountStatement: async () => {
        throw new Error("missing account should not query");
      },
    };

    const result = await useCase(store, queries).execute({
      bookId: "book-1",
      accountId: "missing",
    });

    expect(result).toMatchObject({ ok: false, error: { code: "ENTITY_NOT_FOUND" } });
  });

  it("rejects an account from another book without exposing its statement", async () => {
    const store = new InMemoryStore();
    store.putAccount(foreignAccountSnapshot());
    const queries: LedgerQueries = {
      getAccountBalance: async () => ({ accountId: "account-foreign", accountName: "Foreign", accountKind: "ASSET", rawBalanceMinor: "0", displayBalanceMinor: "0", asOf: null, amountMinor: "0", currency: "BRL" }),
      getAccountStatement: async () => {
        throw new Error("foreign account should not query");
      },
    };

    const result = await useCase(store, queries).execute({
      bookId: "book-1",
      accountId: "account-foreign",
    });

    expect(result).toMatchObject({ ok: false, error: { code: "ENTITY_NOT_FOUND" } });
  });

  it("rejects a valid account requested under another book without querying", async () => {
    const harness = await preparedExpense();
    const queries: LedgerQueries = {
      getAccountBalance: async () => ({ accountId: "account-5", accountName: "Checking", accountKind: "ASSET", rawBalanceMinor: "0", displayBalanceMinor: "0", asOf: null, amountMinor: "0", currency: "BRL" }),
      getAccountStatement: async () => {
        throw new Error("book mismatch should not query");
      },
    };

    const result = await useCase(harness.store, queries).execute({
      bookId: "book-2",
      accountId: "account-5",
    });

    expect(result).toMatchObject({ ok: false, error: { code: "ENTITY_NOT_FOUND" } });
  });

  it("maps an unexpected statement query failure to the public error boundary", async () => {
    const harness = await preparedExpense();
    const queries: LedgerQueries = {
      getAccountBalance: async () => ({ accountId: "account-5", accountName: "Checking", accountKind: "ASSET", rawBalanceMinor: "0", displayBalanceMinor: "0", asOf: null, amountMinor: "0", currency: "BRL" }),
      getAccountStatement: async () => {
        throw new Error("statement query failed");
      },
    };

    const result = await useCase(harness.store, queries).execute({
      bookId: "book-1",
      accountId: "account-5",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("UNEXPECTED_ERROR");
      expect(result.error.message).toBe("Financial query failed");
    }
  });

  it("reconstructs the complete asset statement with a reversed expense at zero net effect", async () => {
    const result = await completeFlow();

    expect(result.assetStatement).toEqual([
      {
        journalEntryId: "entry-5",
        occurredOn: "2026-08-05",
        recordedAt: "2026-08-04T12:00:00.000Z",
        sequence: "5",
        description: "Reverse lunch",
        amountMinor: "2500",
        runningBalanceMinor: "13000",
        currency: "BRL",
      },
      {
        journalEntryId: "entry-4",
        occurredOn: "2026-08-04",
        recordedAt: "2026-08-04T12:00:00.000Z",
        sequence: "4",
        description: "Move to card",
        amountMinor: "-2000",
        runningBalanceMinor: "10500",
        currency: "BRL",
      },
      {
        journalEntryId: "entry-3",
        occurredOn: "2026-08-03",
        recordedAt: "2026-08-04T12:00:00.000Z",
        sequence: "3",
        description: "Salary",
        amountMinor: "5000",
        runningBalanceMinor: "12500",
        currency: "BRL",
      },
      {
        journalEntryId: "entry-2",
        occurredOn: "2026-08-02",
        recordedAt: "2026-08-04T12:00:00.000Z",
        sequence: "2",
        description: "Lunch",
        amountMinor: "-2500",
        runningBalanceMinor: "7500",
        currency: "BRL",
      },
      {
        journalEntryId: "entry-1",
        occurredOn: "2026-08-01",
        recordedAt: "2026-08-04T12:00:00.000Z",
        sequence: "1",
        description: "Opening",
        amountMinor: "10000",
        runningBalanceMinor: "10000",
        currency: "BRL",
      },
    ]);
  });

  it("reconstructs the liability statement with its normal balance sign", async () => {
    const result = await completeFlow();

    expect(result.liabilityStatement).toEqual([
      {
        journalEntryId: "entry-4",
        occurredOn: "2026-08-04",
        recordedAt: "2026-08-04T12:00:00.000Z",
        sequence: "4",
        description: "Move to card",
        amountMinor: "2000",
        runningBalanceMinor: "-2000",
        currency: "BRL",
      },
    ]);
  });

  it("produces equivalent statements, snapshots and events with fixed adapters", async () => {
    const first = await completeFlow();
    const second = await completeFlow();

    expect(second.assetStatement).toEqual(first.assetStatement);
    expect(second.liabilityStatement).toEqual(first.liabilityStatement);
    expect(second.harness.store.snapshot()).toEqual(first.harness.store.snapshot());
    expect(second.harness.publisher.events).toEqual(first.harness.publisher.events);
  });
});
