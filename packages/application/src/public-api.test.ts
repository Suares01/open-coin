import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import * as api from "./index.js";
import { describe, expect, it } from "vitest";

function sourceFiles(directory: string): readonly string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      return sourceFiles(path);
    }
    return path.endsWith(".ts") && !path.endsWith(".test.ts") ? [path] : [];
  });
}

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

  it("keeps the application source graph independent from SQLite infrastructure", () => {
    const forbiddenPackage = ["@open-coin", "infrastructure-sqlite"].join("/");
    const applicationSource = sourceFiles(new URL(".", import.meta.url).pathname)
      .map((path) => readFileSync(path, "utf8"))
      .join("\n");

    expect(applicationSource).not.toContain(forbiddenPackage);
  });
});
