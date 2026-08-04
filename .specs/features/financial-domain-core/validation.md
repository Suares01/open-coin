# financial-domain-core Validation

**Date**: 2026-08-04
**Spec**: `.specs/features/financial-domain-core/spec.md`
**Diff range**: `6b614fb..HEAD`
**Verifier**: standalone fresh-eyes fallback; no sub-agent tool was exposed for the mandatory verifier role.

## Validation: financial-domain-core - PASS

## Task Completion

| Task range | Status | Evidence |
| --- | --- | --- |
| T1-T28 | ✅ Done | Prior phase commits through `6b614fb`; no unchecked task remains. |
| T29 | ✅ Done | `packages/infrastructure-memory/src/use-cases/transfer-money.test.ts:85` |
| T30 | ✅ Done | `packages/infrastructure-memory/src/use-cases/reverse-journal-entry.test.ts:100` |
| T31 | ✅ Done | `packages/infrastructure-memory/src/queries/in-memory-ledger-queries.test.ts:92` |
| T32 | ✅ Done | `packages/infrastructure-memory/src/use-cases/get-account-balance.test.ts:82` |
| T33 | ✅ Done | `packages/infrastructure-memory/src/use-cases/get-account-statement.test.ts:319` |

## Spec-Anchored Acceptance Criteria

The independent review re-derived all 58 requirements. Existing T1-T28 tests cover FDC-01 through FDC-31 and the repository/application contracts FDC-45 through FDC-57; Phase 5 evidence is listed below. Every precise outcome has an exact assertion and no uncovered criterion was found.

| Requirement | Spec-defined outcome | Evidence assertion | Result |
| --- | --- | --- | --- |
| FDC-01-FDC-05 | bigint-safe primitives, valid dates, injected IDs/clock and framework-free domain | `packages/domain/src/shared/money.test.ts:31` - `expect(result.amountMinor).toBe(200n)`; `packages/domain/src/shared/local-date.test.ts:11` - `expect((error as DomainError).code).toBe("INVALID_DATE")`; `packages/application/src/core/use-case-executor.test.ts:73` - deterministic envelope assertions | ✅ PASS |
| FDC-06-FDC-11 | normalized book, four system accounts, rollback, immutable currency and book isolation | `packages/infrastructure-memory/src/use-cases/create-financial-book.test.ts:48` - exact book DTO; `packages/infrastructure-memory/src/use-cases/create-financial-book.test.ts:92` - exact five-event order; `packages/infrastructure-memory/src/use-cases/create-financial-book.test.ts:206` - rollback snapshot equals empty state | ✅ PASS |
| FDC-12-FDC-17 | five account kinds, valid account/category outputs, protected system accounts and normalized duplicate handling | `packages/domain/src/ledger/accounts/ledger-account.test.ts:29` - exact normal-balance mapping; `packages/infrastructure-memory/src/use-cases/create-financial-account.test.ts:51` - exact account result; `packages/infrastructure-memory/src/use-cases/create-financial-account.test.ts:95` - `DUPLICATE_ENTITY` and unchanged snapshot | ✅ PASS |
| FDC-18-FDC-24 | journal structure, currencies, balance, account status/book and description errors | `packages/domain/src/ledger/journal/journal-entry.test.ts:92` - `CURRENCY_MISMATCH`; `packages/infrastructure-memory/src/use-cases/record-expense.test.ts:134` - `INVALID_ACCOUNT_STATUS` plus unchanged state/events; `packages/infrastructure-memory/src/use-cases/record-income.test.ts:144` - `ENTITY_NOT_FOUND` plus unchanged state/events | ✅ PASS |
| FDC-25-FDC-31 | opening, expense and income postings with exact signs and immutable entries | `packages/infrastructure-memory/src/use-cases/set-opening-balance.test.ts:44` - exact asset postings; `packages/infrastructure-memory/src/use-cases/record-expense.test.ts:57` - exact expense postings; `packages/infrastructure-memory/src/use-cases/record-income.test.ts:57` - exact income postings | ✅ PASS |
| FDC-32 | transfer creates source credit and destination debit | `packages/infrastructure-memory/src/use-cases/transfer-money.test.ts:85` - exact account IDs and `-2500n`/`2500n` amounts | ✅ PASS |
| FDC-33 | equal/non-financial/inactive/foreign/currency/description/non-positive inputs fail without state or events | `packages/infrastructure-memory/src/use-cases/transfer-money.test.ts:133`, `:155`, `:170`, `:196`, `:209`, `:222`, `:238` - exact error codes and unchanged snapshot/events | ✅ PASS |
| FDC-34 | transfer has no income or expense posting | `packages/infrastructure-memory/src/use-cases/transfer-money.test.ts:89` - posting account list excludes both category IDs | ✅ PASS |
| FDC-35 | reversal has new identity and exact opposite postings | `packages/infrastructure-memory/src/use-cases/reverse-journal-entry.test.ts:104` - `reversalOf` and exact opposite posting amounts | ✅ PASS |
| FDC-36 | original and reversor persist atomically with exact links | `packages/infrastructure-memory/src/use-cases/reverse-journal-entry.test.ts:100` - `reversedBy` and version; `:104` - `reversalOf`; `:219` - conflict leaves prior snapshot | ✅ PASS |
| FDC-37 | repeated reversal returns `JOURNAL_ENTRY_ALREADY_REVERSED` without partial state/events | `packages/infrastructure-memory/src/use-cases/reverse-journal-entry.test.ts:163` - exact code; `:164`-`:165` - unchanged state/events | ✅ PASS |
| FDC-38 | original postings and financial fields remain unchanged | `packages/infrastructure-memory/src/use-cases/reverse-journal-entry.test.ts:149` - postings; `:150`-`:152` - date, description and currency | ✅ PASS |
| FDC-39 | as-of balance includes only postings up to the requested date | `packages/infrastructure-memory/src/queries/in-memory-ledger-queries.test.ts:92` - exact `asOf` and `amountMinor: "60"`; `packages/infrastructure-memory/src/use-cases/get-account-balance.test.ts:82` - exact serializable DTO | ✅ PASS |
| FDC-40 | displayed signs follow normal balance for all five kinds | `packages/infrastructure-memory/src/queries/in-memory-ledger-queries.test.ts:121` - exact ASSET/LIABILITY/INCOME/EXPENSE/EQUITY expected values; `packages/infrastructure-memory/src/use-cases/get-account-balance.test.ts:104` - liability `"-100"` | ✅ PASS |
| FDC-41 | statement contains journal ID, date, description, signed amount and running balance | `packages/infrastructure-memory/src/queries/in-memory-ledger-queries.test.ts:146` - exact item fields; `packages/infrastructure-memory/src/use-cases/get-account-statement.test.ts:172` - serializable DTO fields | ✅ PASS |
| FDC-42 | same-day items are ordered by date and journal ID descending | `packages/infrastructure-memory/src/queries/in-memory-ledger-queries.test.ts:177` - exact `["entry-b", "entry-a"]`; `packages/infrastructure-memory/src/use-cases/get-account-statement.test.ts:208` - exact descending output | ✅ PASS |
| FDC-43 | missing or foreign account returns `ENTITY_NOT_FOUND` without cross-book query | `packages/infrastructure-memory/src/use-cases/get-account-balance.test.ts:124` and `:146`; `packages/infrastructure-memory/src/use-cases/get-account-statement.test.ts:258`, `:276`, `:293` - exact error and throwing query guards | ✅ PASS |
| FDC-44 | original and reversal both appear and net to zero | `packages/infrastructure-memory/src/queries/in-memory-ledger-queries.test.ts:220` - both items; `:224` - `expect(balance.amountMinor).toBe("0")`; vertical assertion at `packages/infrastructure-memory/src/use-cases/get-account-statement.test.ts:319` | ✅ PASS |
| FDC-45-FDC-46 | commands/DTOs remain primitive and queries use a separate query port | `packages/infrastructure-memory/src/use-cases/get-account-balance.test.ts:82` and `packages/infrastructure-memory/src/use-cases/get-account-statement.test.ts:172` - string DTOs; `packages/application/src/ports/queries.ts:23` - query-port contract | ✅ PASS |
| FDC-47-FDC-50 | isolated snapshots, duplicate protection, rollback and optimistic concurrency | `packages/infrastructure-memory/src/store/in-memory-store.test.ts:42` - nested-copy assertion; `packages/infrastructure-memory/src/repositories/in-memory-journal-entry-repository.test.ts:79` - conflict preserves snapshot; `packages/infrastructure-memory/src/transaction/in-memory-transaction-manager.test.ts:105` - rollback state | ✅ PASS |
| FDC-51-FDC-55 | events publish after commit with required event types/order and serializable payloads | `packages/infrastructure-memory/src/use-cases/create-financial-book.test.ts:92` - book plus four accounts; `packages/infrastructure-memory/src/use-cases/reverse-journal-entry.test.ts:122` - exact posted/reversed order and payload | ✅ PASS |
| FDC-56-FDC-57 | failed transactions publish zero events and return stable public errors | `packages/infrastructure-memory/src/use-cases/reverse-journal-entry.test.ts:219` - conflict code, unchanged store and zero events; `packages/infrastructure-memory/src/use-cases/get-account-statement.test.ts:310` - `UNEXPECTED_ERROR` mapping | ✅ PASS |
| FDC-58 | fixed adapters produce equivalent results, snapshots and events | `packages/infrastructure-memory/src/use-cases/get-account-statement.test.ts:382` - statements, snapshots and events equal across executions | ✅ PASS |

**Spec-anchored result**: 58/58 requirements matched to spec-defined outcomes; 0 uncovered criteria; 0 spec-precision gaps requiring a fix.

## Discrimination Sensor

| Mutation | Scratch target | Result |
| --- | --- | --- |
| Return an empty statement from `GetAccountStatement` | `packages/application/src/ledger/queries/get-account-statement.ts` | ✅ Killed: 4/10 statement tests failed |
| Invert `normalBalanceOf` display sign | `packages/infrastructure-memory/src/queries/in-memory-ledger-queries.ts` | ✅ Killed: 10/18 query tests failed |

**Sensor depth**: lightweight, two high-risk behavior mutations.
**Sensor result**: 2/2 killed, 0 survived. Scratch was removed and the real `git status --porcelain` remained empty.

## Code Quality

| Check | Status |
| --- | --- |
| Minimum code, surgical scope and existing patterns | ✅ |
| No unrelated feature or remote action | ✅ |
| Spec-anchored assertions and non-shallow payload checks | ✅ |
| Per-layer coverage expectation | ✅ |
| Every new test maps to a task criterion or spec requirement | ✅ |
| Project guidelines | ✅ None found; strong defaults applied |

## Gate Check

- **Build gate**: `pnpm build`; `pnpm lint`; `pnpm check-types`; `pnpm test`
- **Result**: all passed, 0 failed, 0 skipped
- **Final test count**: domain 107, application 8, infrastructure-memory 149, total 264
- **Baseline at `6b614fb`**: 210 tests; delta +54 tests in T29-T33
- **Warnings**: Turbo reports existing `build.outputs` warnings for internal packages; non-blocking and unrelated to behavior.

## Summary

**Overall**: ✅ Ready
**Spec-anchored check**: 58/58
**Sensor**: 2/2 mutations killed
**Gate**: 264 tests passed; build, lint and typecheck passed
