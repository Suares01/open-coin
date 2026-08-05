import {
  type LedgerAccountId,
  type BookId,
  type LocalDate,
} from "@open-coin/domain";
import type {
  AccountBalanceView,
  AccountBalanceItemView,
  AccountStatementItem,
  AccountStatementItemView,
  ListAccountStatementInput,
  QuerySlice,
  StatementCursorKey,
  ListAccountBalancesInput,
  LedgerQueries,
} from "@open-coin/application";
import type { LedgerAccountKind } from "@open-coin/domain";
import type { SqliteDatabase, SqliteReader } from "../database/index.js";
import {
  compareDecimalStrings,
  readAccountKind,
  readAccountStatus,
  readBigInt,
  readInteger,
  readJournalOrigin,
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
  public constructor(private readonly executor: SqliteDatabase) {}

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

  public async listAccountStatement(
    input: ListAccountStatementInput,
  ): Promise<QuerySlice<AccountStatementItem, StatementCursorKey>> {
    return this.executor.readTransaction(async (reader) => {
      const rows = await this.readStatementPage(reader, input);
      const hasMore = rows.length > input.limit;
      const pageRows = hasMore ? rows.slice(0, input.limit) : rows;
      const counterparties = await this.readCounterparties(
        reader,
        input,
        pageRows.map((row) => readString(row.entry_id, "entry_id")),
      );
      const accountKind = pageRows[0] === undefined
        ? undefined
        : readAccountKind(pageRows[0].account_kind);
      if (pageRows.length > 0 && accountKind === undefined) {
        throw new TypeError("Missing statement account kind");
      }
      const items = pageRows.map((row) => {
        const rawAmountMinor = readBigInt(row.raw_amount_minor, "raw_amount_minor");
        const rawRunningBalanceMinor = readBigInt(
          row.raw_running_balance_minor,
          "raw_running_balance_minor",
        );
        const entryId = readString(row.entry_id, "entry_id");
        return {
          entryId,
          postingId: readString(row.posting_id, "posting_id"),
          occurredOn: readString(row.occurred_on, "occurred_on"),
          recordedAt: readString(row.recorded_at, "recorded_at"),
          sequence: readString(row.sequence, "sequence"),
          description: readString(row.description, "description"),
          rawAmountMinor: rawAmountMinor.toString(),
          displayAmountMinor: toDisplayMinor(rawAmountMinor, accountKind as LedgerAccountKind),
          runningBalanceMinor: toDisplayMinor(
            rawRunningBalanceMinor,
            accountKind as LedgerAccountKind,
          ),
          currency: readString(row.currency, "currency"),
          origin: readJournalOrigin(row.origin),
          counterpartyAccounts: counterparties.get(entryId) ?? [],
          isReversal: row.reversal_of_id !== null,
          isReversed: row.reversed_by_id !== null,
        } satisfies AccountStatementItem;
      });
      const last = items.at(-1);
      return {
        items,
        nextKey: hasMore && last !== undefined
          ? {
              occurredOn: last.occurredOn,
              sequence: last.sequence,
              postingPosition: readInteger(
                pageRows.at(-1)?.posting_position,
                "posting_position",
              ),
            }
          : null,
      };
    });
  }

  private async readStatementPage(
    reader: SqliteReader,
    input: ListAccountStatementInput,
  ): Promise<readonly StatementRow[]> {
    const parameters: (string | number)[] = [input.bookId, input.accountId];
    let sql =
      "WITH history AS (" +
      "SELECT p.id AS posting_id, p.position AS posting_position, " +
      "e.id AS entry_id, e.occurred_on, e.recorded_at, " +
      "CAST(e.sequence AS TEXT) AS sequence, e.description, e.currency, e.origin, " +
      "e.reversal_of_id, e.reversed_by_id, a.kind AS account_kind, " +
      "CAST(p.amount_minor AS TEXT) AS raw_amount_minor, " +
      "CAST(SUM(p.amount_minor) OVER (" +
      "ORDER BY e.occurred_on ASC, length(e.sequence) ASC, " +
      "e.sequence ASC, p.position ASC ROWS UNBOUNDED PRECEDING" +
      ") AS TEXT) AS raw_running_balance_minor " +
      "FROM postings p JOIN journal_entries e " +
      "ON e.id = p.journal_entry_id AND e.book_id = p.book_id " +
      "JOIN ledger_accounts a ON a.id = p.account_id AND a.book_id = p.book_id " +
      "WHERE p.book_id = ? AND p.account_id = ?" +
      ") SELECT * FROM history WHERE 1 = 1";

    if (input.from !== undefined) {
      sql += " AND occurred_on >= ?";
      parameters.push(input.from.value);
    }
    if (input.to !== undefined) {
      sql += " AND occurred_on <= ?";
      parameters.push(input.to.value);
    }
    if (input.cursor !== undefined) {
      sql +=
        " AND (occurred_on < ? OR (occurred_on = ? AND (" +
        "length(sequence) < length(?) OR (length(sequence) = length(?) AND " +
        "(sequence < ? OR (sequence = ? AND posting_position < ?))))))";
      parameters.push(
        input.cursor.occurredOn,
        input.cursor.occurredOn,
        input.cursor.sequence,
        input.cursor.sequence,
        input.cursor.sequence,
        input.cursor.sequence,
        input.cursor.postingPosition,
      );
    }

    sql +=
      " ORDER BY occurred_on DESC, length(sequence) DESC, sequence DESC, " +
      "posting_position DESC LIMIT ?";
    parameters.push(input.limit + 1);
    return reader.query<StatementRow>(sql, parameters);
  }

  private async readCounterparties(
    reader: SqliteReader,
    input: ListAccountStatementInput,
    entryIds: readonly string[],
  ): Promise<ReadonlyMap<string, readonly AccountSummaryRow[]>> {
    const rows = entryIds.length === 0
      ? await reader.query<CounterpartyRow>(
          "SELECT p.journal_entry_id AS entry_id, a.id AS account_id, " +
            "a.name AS account_name, a.kind AS account_kind " +
            "FROM postings p JOIN ledger_accounts a ON a.id = p.account_id " +
            "AND a.book_id = p.book_id WHERE 1 = 0",
        )
      : await reader.query<CounterpartyRow>(
          "SELECT DISTINCT p.journal_entry_id AS entry_id, a.id AS account_id, " +
            "a.name AS account_name, a.kind AS account_kind " +
            "FROM postings p JOIN ledger_accounts a ON a.id = p.account_id " +
            "AND a.book_id = p.book_id WHERE p.book_id = ? " +
            `AND p.journal_entry_id IN (${entryIds.map(() => "?").join(", ")}) ` +
            "AND p.account_id <> ? ORDER BY a.name ASC, a.id ASC",
          [input.bookId, ...entryIds, input.accountId],
        );
    const grouped = new Map<string, AccountSummaryRow[]>();
    for (const row of rows) {
      const entryId = readString(row.entry_id, "entry_id");
      const current = grouped.get(entryId) ?? [];
      current.push({
        id: readString(row.account_id, "account_id"),
        name: readString(row.account_name, "account_name"),
        kind: readAccountKind(row.account_kind),
      });
      grouped.set(entryId, current);
    }
    return grouped;
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

type StatementRow = {
  readonly posting_id: unknown;
  readonly posting_position: unknown;
  readonly entry_id: unknown;
  readonly occurred_on: unknown;
  readonly recorded_at: unknown;
  readonly sequence: unknown;
  readonly description: unknown;
  readonly currency: unknown;
  readonly origin: unknown;
  readonly reversal_of_id: unknown;
  readonly reversed_by_id: unknown;
  readonly account_kind: unknown;
  readonly raw_amount_minor: unknown;
  readonly raw_running_balance_minor: unknown;
};

type CounterpartyRow = {
  readonly entry_id: unknown;
  readonly account_id: unknown;
  readonly account_name: unknown;
  readonly account_kind: unknown;
};

type AccountSummaryRow = {
  readonly id: string;
  readonly name: string;
  readonly kind: LedgerAccountKind;
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
