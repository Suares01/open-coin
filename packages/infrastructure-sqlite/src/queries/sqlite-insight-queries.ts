import type {
  CategorySpendingItem,
  GetCategorySpendingInput,
  GetMonthlyCashFlowInput,
  GetNetWorthInput,
  InsightQueries,
  MonthlyCashFlowItem,
  NetWorthView,
} from "@open-coin/application";
import type { SqliteDatabase } from "../database/index.js";
import {
  readAccountKind,
  readBigInt,
  readString,
  toDisplayMinor,
} from "./sqlite-query-values.js";

export class SqliteInsightQueries implements InsightQueries {
  public constructor(private readonly database: SqliteDatabase) {}

  public async getMonthlyCashFlow(
    input: GetMonthlyCashFlowInput,
  ): Promise<readonly MonthlyCashFlowItem[]> {
    const rows = await this.database.query<MonthlyCashFlowRow>(
      "SELECT b.base_currency, substr(e.occurred_on, 1, 7) AS month, " +
        "a.kind AS account_kind, " +
        "CAST(COALESCE(SUM(p.amount_minor), 0) AS TEXT) AS amount_minor " +
        "FROM financial_books b " +
        "LEFT JOIN journal_entries e ON e.book_id = b.id " +
        "AND e.occurred_on >= ? AND e.occurred_on < ? " +
        "LEFT JOIN postings p ON p.book_id = e.book_id " +
        "AND p.journal_entry_id = e.id " +
        "LEFT JOIN ledger_accounts a ON a.book_id = p.book_id " +
        "AND a.id = p.account_id " +
        "AND a.kind IN ('INCOME', 'EXPENSE') " +
        "WHERE b.id = ? " +
        "GROUP BY b.base_currency, substr(e.occurred_on, 1, 7), a.kind " +
        "ORDER BY month ASC, a.kind ASC",
      [
        `${input.fromMonth}-01`,
        monthAfter(input.toMonth),
        input.bookId,
      ],
    );
    const currency = rows[0] === undefined
      ? await this.readBookCurrency(input.bookId)
      : readString(rows[0].base_currency, "base_currency");
    const totals = new Map<string, { income: bigint; expense: bigint }>();
    for (const row of rows) {
      if (row.month === null || row.account_kind === null) {
        continue;
      }
      const month = readString(row.month, "month");
      const current = totals.get(month) ?? { income: 0n, expense: 0n };
      const amount = readBigInt(row.amount_minor, "amount_minor");
      const kind = readAccountKind(row.account_kind);
      if (kind === "INCOME") {
        current.income += BigInt(toDisplayMinor(amount, kind));
      } else {
        current.expense += BigInt(toDisplayMinor(amount, kind));
      }
      totals.set(month, current);
    }

    const result: MonthlyCashFlowItem[] = [];
    for (const month of monthsBetween(input.fromMonth, input.toMonth)) {
      const total = totals.get(month) ?? { income: 0n, expense: 0n };
      result.push({
        month,
        incomeMinor: total.income.toString(),
        expenseMinor: total.expense.toString(),
        netMinor: (total.income - total.expense).toString(),
        currency,
      });
    }
    return result;
  }

  public async getCategorySpending(
    input: GetCategorySpendingInput,
  ): Promise<readonly CategorySpendingItem[]> {
    void input;
    throw new Error("Category spending is not implemented yet");
  }

  public async getNetWorth(input: GetNetWorthInput): Promise<NetWorthView> {
    void input;
    throw new Error("Net worth is not implemented yet");
  }

  private async readBookCurrency(bookId: string): Promise<string> {
    const rows = await this.database.query<{ readonly base_currency: unknown }>(
      "SELECT base_currency FROM financial_books WHERE id = ?",
      [bookId],
    );
    const currency = rows[0]?.base_currency;
    if (currency === undefined) {
      throw new Error(`Financial book ${bookId} was not found`);
    }
    return readString(currency, "base_currency");
  }
}

type MonthlyCashFlowRow = {
  readonly base_currency: unknown;
  readonly month: unknown;
  readonly account_kind: unknown;
  readonly amount_minor: unknown;
};

function monthAfter(month: string): string {
  const [yearText, monthText] = month.split("-");
  const year = Number(yearText);
  const monthNumber = Number(monthText);
  return monthNumber === 12
    ? `${year + 1}-01-01`
    : `${yearText}-${String(monthNumber + 1).padStart(2, "0")}-01`;
}

function monthsBetween(from: string, to: string): readonly string[] {
  const result: string[] = [];
  let current = from;
  while (current <= to) {
    result.push(current);
    current = current.endsWith("12")
      ? `${Number(current.slice(0, 4)) + 1}-01`
      : `${current.slice(0, 5)}${String(Number(current.slice(5)) + 1).padStart(2, "0")}`;
  }
  return result;
}
