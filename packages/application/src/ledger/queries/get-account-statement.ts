import {
  bookIdFromString,
  ledgerAccountIdFromString,
  Result,
} from "@open-coin/domain";
import type { Result as ResultType } from "@open-coin/domain";
import type {
  AccountStatementItemView,
  AccountStatementQuery,
  LedgerAccountRepository,
  LedgerQueries,
} from "../../ports/index.js";
import { ApplicationError } from "../../ports/errors.js";
import { toApplicationError } from "../../core/use-case-executor.js";

export class GetAccountStatement {
  constructor(
    private readonly accounts: LedgerAccountRepository,
    private readonly queries: LedgerQueries,
  ) {}

  async execute(
    query: AccountStatementQuery,
  ): Promise<ResultType<readonly AccountStatementItemView[], ApplicationError>> {
    try {
      const bookId = bookIdFromString(query.bookId);
      const accountId = ledgerAccountIdFromString(query.accountId);
      const account = await this.accounts.findById(accountId);
      if (account === null || account.bookId !== bookId) {
        return Result.fail(
          new ApplicationError(
            "ENTITY_NOT_FOUND",
            `Ledger account ${query.accountId} was not found in book ${query.bookId}`,
          ),
        );
      }

      const items = await this.queries.getAccountStatement({ bookId, accountId });
      return Result.ok(items.map((item) => ({
        journalEntryId: item.journalEntryId,
        occurredOn: item.occurredOn,
        description: item.description,
        amountMinor: item.amountMinor,
        runningBalanceMinor: item.runningBalanceMinor,
        currency: item.currency,
      })));
    } catch (error: unknown) {
      return Result.fail(toApplicationError(error));
    }
  }
}
