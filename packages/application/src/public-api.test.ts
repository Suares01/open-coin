import * as api from "./index.js";
import { describe, expect, it } from "vitest";

describe("application public query API", () => {
  it("exports the seven ledger read handlers", () => {
    expect(api.GetAccountBalance).toBeTypeOf("function");
    expect(api.GetAccountStatement).toBeTypeOf("function");
    expect(api.ListAccountBalances).toBeTypeOf("function");
    expect(api.ListAccountStatement).toBeTypeOf("function");
    expect(api.ListJournalEntries).toBeTypeOf("function");
    expect(api.GetMonthlyCashFlow).toBeTypeOf("function");
    expect(api.GetCategorySpending).toBeTypeOf("function");
    expect(api.GetNetWorth).toBeTypeOf("function");
  });
});
