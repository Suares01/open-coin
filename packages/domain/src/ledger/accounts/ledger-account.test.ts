import { describe, expect, it } from "vitest";
import {
  isCategoryAccount,
  isFinancialAccount,
  LedgerAccount,
  normalBalanceOf,
  normalizeAccountName,
} from "./ledger-account.js";
import { bookIdFromString, ledgerAccountIdFromString } from "../../shared/identity/ids.js";

const bookId = bookIdFromString("book-1");

function createAccount(kind: "ASSET" | "LIABILITY" | "INCOME" | "EXPENSE" | "EQUITY" = "ASSET") {
  return LedgerAccount.create({
    id: ledgerAccountIdFromString(`account-${kind}`),
    bookId,
    name: "  Caixa  ",
    kind,
  });
}

describe("LedgerAccount", () => {
  it.each([
    ["ASSET", "DEBIT"],
    ["EXPENSE", "DEBIT"],
    ["LIABILITY", "CREDIT"],
    ["INCOME", "CREDIT"],
    ["EQUITY", "CREDIT"],
  ] as const)("returns %s normal balance as %s", (kind, expected) => {
    expect(normalBalanceOf(kind)).toBe(expected);
  });

  it("classifies financial and category accounts", () => {
    expect(isFinancialAccount(createAccount("ASSET"))).toBe(true);
    expect(isFinancialAccount(createAccount("LIABILITY"))).toBe(true);
    expect(isFinancialAccount(createAccount("INCOME"))).toBe(false);
    expect(isCategoryAccount(createAccount("INCOME"))).toBe(true);
    expect(isCategoryAccount(createAccount("EXPENSE"))).toBe(true);
    expect(isCategoryAccount(createAccount("EQUITY"))).toBe(false);
  });

  it("trims and normalizes the account name", () => {
    const account = LedgerAccount.create({
      id: ledgerAccountIdFromString("account-1"),
      bookId,
      name: "  Café  ",
      kind: "ASSET",
    });

    expect(account.name).toBe("Café");
    expect(account.normalizedName).toBe("café");
    expect(normalizeAccountName("  CAFÉ  ")).toBe("café");
  });

  it("starts active at version zero with no system purpose", () => {
    const account = createAccount();

    expect(account.status).toBe("ACTIVE");
    expect(account.version).toBe(0);
    expect(account.systemPurpose).toBeUndefined();
  });

  it("rejects an empty name with a stable error", () => {
    expect(() =>
      LedgerAccount.create({
        id: ledgerAccountIdFromString("account-1"),
        bookId,
        name: " ",
        kind: "ASSET",
      }),
    ).toThrowError(expect.objectContaining({ code: "INVALID_ACCOUNT_NAME" }));
  });

  it("creates a system account with its protected purpose", () => {
    const account = LedgerAccount.create({
      id: ledgerAccountIdFromString("opening"),
      bookId,
      name: "Opening balance",
      kind: "EQUITY",
      systemPurpose: "OPENING_BALANCE",
    });

    expect(account.systemPurpose).toBe("OPENING_BALANCE");
    expect(account.toSnapshot().systemPurpose).toBe("OPENING_BALANCE");
  });

  it("archives a non-system account and increments its version", () => {
    const account = createAccount();

    account.archive();

    expect(account.status).toBe("ARCHIVED");
    expect(account.version).toBe(1);
  });

  it("does not increment version when archiving an archived account", () => {
    const account = createAccount();
    account.archive();

    account.archive();

    expect(account.version).toBe(1);
  });

  it("changes a non-system account kind and increments its version", () => {
    const account = createAccount("ASSET");

    account.changeKind("LIABILITY");

    expect(account.kind).toBe("LIABILITY");
    expect(account.normalBalance).toBe("CREDIT");
    expect(account.version).toBe(1);
  });

  it("does not mutate a non-system account when its kind is unchanged", () => {
    const account = createAccount("ASSET");

    account.changeKind("ASSET");

    expect(account.version).toBe(0);
    expect(account.kind).toBe("ASSET");
  });

  it.each(["archive", "changeKind"] as const)(
    "protects system accounts from %s without mutation",
    (operation) => {
      const account = LedgerAccount.create({
        id: ledgerAccountIdFromString("system"),
        bookId,
        name: "System",
        kind: "EQUITY",
        systemPurpose: "OPENING_BALANCE",
      });
      const before = account.toSnapshot();

      expect(() => {
        if (operation === "archive") {
          account.archive();
        } else {
          account.changeKind("ASSET");
        }
      }).toThrowError(expect.objectContaining({ code: "SYSTEM_ACCOUNT_PROTECTED" }));
      expect(account.toSnapshot()).toEqual(before);
    },
  );

  it("round trips every field without restoring pending facts", () => {
    const account = LedgerAccount.create({
      id: ledgerAccountIdFromString("system"),
      bookId,
      name: "System",
      kind: "EQUITY",
      systemPurpose: "OPENING_BALANCE",
    });
    account.pullDomainFacts();
    const snapshot = {
      ...account.toSnapshot(),
      status: "ACTIVE" as const,
      version: 3,
    };

    const restored = LedgerAccount.restore(snapshot);

    expect(restored.toSnapshot()).toEqual(snapshot);
    expect(restored.pullDomainFacts()).toEqual([]);
  });

  it("exposes immutable properties through getters", () => {
    const account = createAccount();

    expect(Object.getOwnPropertyDescriptor(LedgerAccount.prototype, "kind"))
      .toMatchObject({ get: expect.any(Function), set: undefined });
    expect(account.kind).toBe("ASSET");
  });
});
