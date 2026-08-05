import {
  type LedgerAccountId,
  type BookId,
  type LocalDate,
} from "@open-coin/domain";
import type {
  AccountBalanceView,
  AccountBalanceItemView,
  AccountStatementItemView,
  ListAccountBalancesInput,
  LedgerQueries,
} from "@open-coin/application";
import type { SqliteExecutor } from "../database/sqlite-executor.js";
import {
  compareDecimalStrings,
  readAccountKind,
  readAccountStatus,
  readBigInt,
  readString,
  toDisplayMinor,
} from "./sqlite-query-values.js";

type AccountRow = {
  readonly account_id: unknown;
  readonly account_name: unknown;
  readonly kind: unknown;
  readonly base_currency: unknown;
  readonly status: unknown;
};

type PostingRow = {
  readonly journal_entry_id: unknown;
  readonly occurred_on: unknown;
  readonly recorded_at: unknown;
  readonly sequence: unknown;
  readonly description: unknown;
  readonly amount_minor: unknown;
  readonly currency: unknown;
};

export class SqliteLedgerQueries implements LedgerQueries {
  public constructor(private readonly executor: SqliteExecutor) {}

  public async getAccountBalance(input: {
    bookId: BookId;
    accountId: LedgerAccountId;
    asOf?: LocalDate;
  }): Promise<AccountBalanceView> {
    const account = await this.findAccount(input.bookId, input.accountId);
    let parameters: readonly (string | null)[] = [input.bookId, input.accountId];
    let sql =
      "SELECT CAST(p.amount_minor AS TEXT) AS amount_minor " +
      "FROM postings p JOIN journal_entries e " +
      "ON e.id = p.journal_entry_id AND e.book_id = p.book_id " +
      "WHERE p.book_id = ? AND p.account_id = ?";

    if (input.asOf !== undefined) {
      sql += " AND e.occurred_on <= ?";
      parameters = [input.bookId, input.accountId, input.asOf.value];
    }

    const rows = await this.executor.query<Pick<PostingRow, "amount_minor">>(
      sql,
      parameters,
    );
    const rawBalance = rows.reduce(
      (balance, row) => balance + readBigInt(row.amount_minor, "amount_minor"),
      0n,
    );

    return {
      accountId: readString(account.account_id, "account_id"),
      accountName: readString(account.account_name, "account_name"),
      accountKind: readAccountKind(account.kind),
      rawBalanceMinor: rawBalance.toString(),
      displayBalanceMinor: toDisplayMinor(rawBalance, readAccountKind(account.kind)),
      asOf: input.asOf?.value ?? null,
      amountMinor: toDisplayMinor(rawBalance, readAccountKind(account.kind)),
      currency: readString(account.base_currency, "base_currency"),
    };
  }

  public async getAccountStatement(input: {
    bookId: BookId;
    accountId: LedgerAccountId;
  }): Promise<readonly AccountStatementItemView[]> {
    const account = await this.findAccount(input.bookId, input.accountId);
    const rows = await this.executor.query<PostingRow>(
      "SELECT e.id AS journal_entry_id, e.occurred_on, e.recorded_at, " +
        "CAST(e.sequence AS TEXT) AS sequence, e.description, " +
        "CAST(p.amount_minor AS TEXT) AS amount_minor, p.currency " +
        "FROM postings p JOIN journal_entries e " +
        "ON e.id = p.journal_entry_id AND e.book_id = p.book_id " +
        "WHERE p.book_id = ? AND p.account_id = ? " +
        "ORDER BY e.occurred_on ASC",
      [input.bookId, input.accountId],
    );
    const orderedRows = rows.slice().sort(compareAscending);
    const kind = readAccountKind(account.kind);
    let rawRunningBalance = 0n;
    const statement = orderedRows.map((row) => {
      const amountMinor = readBigInt(row.amount_minor, "amount_minor");
      rawRunningBalance += amountMinor;

      return {
        journalEntryId: readString(row.journal_entry_id, "journal_entry_id"),
        occurredOn: readString(row.occurred_on, "occurred_on"),
        recordedAt: readString(row.recorded_at, "recorded_at"),
        sequence: readString(row.sequence, "sequence"),
        description: readString(row.description, "description"),
        amountMinor: amountMinor.toString(),
        runningBalanceMinor: toDisplayMinor(rawRunningBalance, kind),
        currency: readString(row.currency, "currency"),
      } satisfies AccountStatementItemView;
    });

    return statement.reverse();
  }

  public async listAccountBalances(
    input: ListAccountBalancesInput,
  ): Promise<readonly AccountBalanceItemView[]> {
    if (input.accountKinds !== undefined && input.accountKinds.length === 0) {
      return [];
    }

    const parameters: (string | null)[] = [];
    let sql =
      "SELECT a.id AS account_id, a.name AS account_name, a.kind, a.status, " +
      "b.base_currency, " +
      "CAST(COALESCE(SUM(CASE WHEN e.id IS NOT NULL " +
      "THEN p.amount_minor ELSE 0 END), 0) AS TEXT) AS raw_balance_minor " +
      "FROM ledger_accounts a JOIN financial_books b " +
      "ON b.id = a.book_id " +
      "LEFT JOIN postings p ON p.book_id = a.book_id " +
      "AND p.account_id = a.id " +
      "LEFT JOIN journal_entries e ON e.id = p.journal_entry_id " +
      "AND e.book_id = p.book_id";

    if (input.asOf !== undefined) {
      sql += " AND e.occurred_on <= ?";
      parameters.push(input.asOf.value);
    }

    sql += " WHERE a.book_id = ?";
    parameters.push(input.bookId);

    if (input.accountKinds !== undefined) {
      sql += ` AND a.kind IN (${input.accountKinds.map(() => "?").join(", ")})`;
      parameters.push(...input.accountKinds);
    }

    sql +=
      " GROUP BY a.id, a.name, a.kind, a.status, b.base_currency " +
      "ORDER BY a.kind ASC, a.name ASC, a.id ASC";

    const rows = await this.executor.query<AccountBalanceRow>(sql, parameters);
    return rows.flatMap((row) => {
      const status = readAccountStatus(row.status);
      if (!input.includeArchived && status === "ARCHIVED") {
        return [];
      }

      const kind = readAccountKind(row.kind);
      const rawBalanceMinor = readBigInt(row.raw_balance_minor, "raw_balance_minor");
      if (!input.includeZeroBalance && rawBalanceMinor === 0n) {
        return [];
      }

      const displayBalanceMinor = toDisplayMinor(rawBalanceMinor, kind);
      return [{
        accountId: readString(row.account_id, "account_id"),
        accountName: readString(row.account_name, "account_name"),
        accountKind: kind,
        rawBalanceMinor: rawBalanceMinor.toString(),
        displayBalanceMinor,
        amountMinor: displayBalanceMinor,
        currency: readString(row.base_currency, "base_currency"),
        asOf: input.asOf?.value ?? null,
        archived: status === "ARCHIVED",
      } satisfies AccountBalanceItemView];
    });
  }

  private async findAccount(bookId: BookId, accountId: LedgerAccountId): Promise<AccountRow> {
    const rows = await this.executor.query<AccountRow>(
      "SELECT a.id AS account_id, a.name AS account_name, a.kind, b.base_currency " +
        "FROM ledger_accounts a JOIN financial_books b ON b.id = a.book_id " +
        "WHERE a.book_id = ? AND a.id = ?",
      [bookId, accountId],
    );
    const row = rows[0];
    if (row === undefined) {
      throw new Error(`Ledger account ${accountId} was not found`);
    }

    return row;
  }
}

type AccountBalanceRow = {
  readonly account_id: unknown;
  readonly account_name: unknown;
  readonly kind: unknown;
  readonly status: unknown;
  readonly base_currency: unknown;
  readonly raw_balance_minor: unknown;
};

function compareAscending(left: PostingRow, right: PostingRow): number {
  const dateOrder = readString(left.occurred_on, "occurred_on").localeCompare(
    readString(right.occurred_on, "occurred_on"),
  );
  if (dateOrder !== 0) {
    return dateOrder;
  }

  return compareDecimalStrings(
    readString(left.sequence, "sequence"),
    readString(right.sequence, "sequence"),
  );
}
