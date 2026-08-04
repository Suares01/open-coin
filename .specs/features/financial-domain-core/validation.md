# financial-domain-core Validation

**Date**: 2026-08-04
**Spec**: `.specs/features/financial-domain-core/spec.md`
**Diff range**: `c8d45fe..4782957` (T34-T41; 8 commits, inclusive of `c8d45fe`)
**Verifier**: independent fresh-eyes pass; author conclusions were not reused

## Verdict

## Validation: financial-domain-core - PASS

All 66 ACs in spec v1.1 have current evidence matching the spec-defined outcome. The amended FDC-42 and FDC-59 through FDC-66 are covered; no uncovered AC or spec-precision gap was found.

## Task Completion

| Task | Status | Evidence |
| --- | --- | --- |
| T34 | Done | `c8d45fe feat(domain): add journal ordering metadata`; `packages/domain/src/ledger/journal/journal-entry.test.ts:44-49` |
| T35 | Done | `8930ea6 feat(application): reserve journal entry sequence`; `packages/infrastructure-memory/src/use-cases/journal-ordering-metadata.test.ts:108-117` |
| T36 | Done | `9a5f68b fix(memory): order statements by journal sequence`; `packages/infrastructure-memory/src/queries/in-memory-ledger-queries.test.ts:190-212` |
| T37 | Done | `aa19652 fix(application): prevent duplicate opening balance`; `packages/infrastructure-memory/src/use-cases/set-opening-balance.test.ts:31-48` |
| T38 | Done | `73918ce fix(domain): guard journal reversal timeline`; `packages/domain/src/ledger/journal/journal-entry.test.ts:349-400` |
| T39 | Done | `01109b3 feat(domain): version aggregate facts`; `packages/domain/src/ledger/journal/journal-entry.test.ts:139-147,274-293` |
| T40 | Done | `8b091d8 feat(application): version domain event envelopes`; `packages/application/src/core/use-case-executor.test.ts:75-95` |
| T41 | Done | `4782957 test(ledger): cover asset liability operation matrix`; `packages/infrastructure-memory/src/use-cases/financial-account-kind-matrix.test.ts:15-118` |

All T34-T41 checkboxes are marked done in `tasks.md:804-969`, and the commit sequence is complete.

## Spec-Anchored Acceptance Criteria

| AC | Spec-defined outcome | `file:line` + assertion expression | Result |
| --- | --- | --- | --- |
| FDC-01 | Monetary values/calculations use bigint minor units. | `packages/domain/src/shared/money.test.ts:31` — `expect(result.amountMinor).toBe(200n)` | PASS |
| FDC-02 | Currency mismatch rejects with `CURRENCY_MISMATCH`. | `packages/domain/src/shared/money.test.ts:69-75` — exact mismatch error assertions | PASS |
| FDC-03 | Invalid calendar date rejects with invalid-date error. | `packages/domain/src/shared/local-date.test.ts:11` — `expect(error.code).toBe("INVALID_DATE")` | PASS |
| FDC-04 | IDs/current time come from `IdGenerator`/`Clock`. | `packages/infrastructure-memory/src/testing/deterministic-adapters.test.ts:32-46` — fixed ID/date assertions | PASS |
| FDC-05 | Domain has no framework, persistence, external, global-clock or global-ID imports. | `packages/domain/src/index.ts:1-11`; package source imports are domain-local and `packages/domain/package.json:1-26` has no runtime dependency | PASS |
| FDC-06 | Valid book has normalized name, version 0 and supplied ID. | `packages/infrastructure-memory/src/use-cases/create-financial-book.test.ts:42-81` — exact book result assertions | PASS |
| FDC-07 | Invalid book input rejects with no persistence. | `packages/infrastructure-memory/src/use-cases/create-financial-book.test.ts:152-179` — exact error, empty snapshot and zero events | PASS |
| FDC-08 | Exactly four system accounts have the required purpose/kind pairs. | `packages/infrastructure-memory/src/use-cases/create-financial-book.test.ts:63-67` — exact four-pair array | PASS |
| FDC-09 | Intermediate book/account failure rolls back the entire creation. | `packages/infrastructure-memory/src/use-cases/create-financial-book.test.ts:182-211` — error, empty snapshot and zero events | PASS |
| FDC-10 | Book base currency remains immutable. | `packages/domain/src/book/financial-book.test.ts:27-32` — getter/parsed base currency assertion | PASS |
| FDC-11 | Cross-book operations reject without state changes. | `packages/infrastructure-memory/src/use-cases/transfer-money.test.ts:176-199` — `BOOK_MISMATCH`, unchanged state/events | PASS |
| FDC-12 | All five account kinds are supported. | `packages/domain/src/ledger/accounts/ledger-account.test.ts:23-31` — exact normal-balance map | PASS |
| FDC-13 | Valid account/category persists normalized name, ACTIVE, version 0 and book ID. | `packages/infrastructure-memory/src/use-cases/create-financial-account.test.ts:24-41` — exact DTO fields | PASS |
| FDC-14 | Invalid financial-account kind rejects with `INVALID_ACCOUNT_KIND`. | `packages/infrastructure-memory/src/use-cases/create-financial-account.test.ts:72-85` — exact code and no writes/events | PASS |
| FDC-15 | Income/expense category role mismatch rejects with `INVALID_ACCOUNT_KIND`. | `packages/infrastructure-memory/src/use-cases/create-income-category.test.ts:63-76`; expense counterpart same assertion | PASS |
| FDC-16 | System account archive/type transitions reject without mutation. | `packages/domain/src/ledger/accounts/ledger-account.test.ts:124-144` — protected error and snapshot equality | PASS |
| FDC-17 | Duplicate normalized name/type/book rejects with `DUPLICATE_ENTITY`. | `packages/infrastructure-memory/src/use-cases/create-financial-account.test.ts:104-124` — exact code and unchanged state/events | PASS |
| FDC-18 | Fewer than two postings rejects with `INSUFFICIENT_POSTINGS`. | `packages/domain/src/ledger/journal/journal-entry.test.ts:56-69` — exact code | PASS |
| FDC-19 | Fewer than two distinct accounts rejects with `INSUFFICIENT_ACCOUNTS`. | `packages/domain/src/ledger/journal/journal-entry.test.ts:72-85` — exact code | PASS |
| FDC-20 | Zero posting rejects with `ZERO_POSTING_AMOUNT`. | `packages/domain/src/ledger/journal/posting.test.ts:22-30` — exact code | PASS |
| FDC-21 | Wrong posting currency rejects with `CURRENCY_MISMATCH`. | `packages/domain/src/ledger/journal/journal-entry.test.ts:88-104` — exact code; application no-write coverage in set-opening tests | PASS |
| FDC-22 | Non-zero signed sum rejects with `UNBALANCED_JOURNAL_ENTRY`. | `packages/domain/src/ledger/journal/journal-entry.test.ts:107-120` — exact code for 100 + (-99) | PASS |
| FDC-23 | Inactive/foreign account rejects without persistence. | `packages/infrastructure-memory/src/use-cases/set-opening-balance.test.ts:211-223`; transfer counterpart:161-199 | PASS |
| FDC-24 | Trimmed-empty description rejects without change. | `packages/domain/src/ledger/journal/journal-entry.test.ts:123-136` — exact code; application no-write assertion in record-expense test | PASS |
| FDC-25 | Asset opening is debit asset / credit opening account. | `packages/infrastructure-memory/src/use-cases/set-opening-balance.test.ts:106-128` — exact signed postings | PASS |
| FDC-26 | Liability opening is credit liability / debit opening account. | `packages/infrastructure-memory/src/use-cases/set-opening-balance.test.ts:130-142` — exact signed postings | PASS |
| FDC-27 | Invalid opening amount/currency/kind rejects without a journal. | `packages/infrastructure-memory/src/use-cases/set-opening-balance.test.ts:170-209` — exact errors, unchanged snapshot and zero events | PASS |
| FDC-28 | Expense debits category and credits financial account. | `packages/infrastructure-memory/src/use-cases/record-expense.test.ts:55-60` — exact 2500n/-2500n postings | PASS |
| FDC-29 | Income debits financial account and credits income category. | `packages/infrastructure-memory/src/use-cases/record-income.test.ts:55-60` — exact signed postings | PASS |
| FDC-30 | Invalid expense/income amount or currency rejects without a journal. | `packages/infrastructure-memory/src/use-cases/record-expense.test.ts:111-130`; income counterpart same assertions | PASS |
| FDC-31 | Registered journal fields cannot be changed directly. | `packages/domain/src/ledger/journal/journal-entry.test.ts:44-53,152-158` — getter descriptor and posting-copy assertions | PASS |
| FDC-32 | Transfer credits source and debits destination equally. | `packages/infrastructure-memory/src/use-cases/transfer-money.test.ts:83-89` — exact -2500n/2500n postings | PASS |
| FDC-33 | Invalid transfer combinations reject without persistence. | `packages/infrastructure-memory/src/use-cases/transfer-money.test.ts:126-241` — exact error codes, unchanged state/events | PASS |
| FDC-34 | Transfer contains only source/destination, no income/expense posting. | `packages/infrastructure-memory/src/use-cases/transfer-money.test.ts:89-93` — exact account IDs | PASS |
| FDC-35 | Reversal has new identity and exact opposite postings. | `packages/domain/src/ledger/journal/journal-entry.test.ts:195-227` — identity, links, amounts and currency | PASS |
| FDC-36 | Reversal/original links persist atomically. | `packages/infrastructure-memory/src/use-cases/reverse-journal-entry.test.ts:91-121` — exact links/snapshots | PASS |
| FDC-37 | Second reversal rejects with `JOURNAL_ENTRY_ALREADY_REVERSED`. | `packages/infrastructure-memory/src/use-cases/reverse-journal-entry.test.ts:163-174` — exact code, unchanged state/events | PASS |
| FDC-38 | Original entry/postings remain unchanged after reversal. | `packages/infrastructure-memory/src/use-cases/reverse-journal-entry.test.ts:150-160` — exact original fields | PASS |
| FDC-39 | As-of balance includes only postings on/before the limit. | `packages/infrastructure-memory/src/queries/in-memory-ledger-queries.test.ts:92-97` — exact date and amount | PASS |
| FDC-40 | Display sign follows normal balance for all five kinds. | `packages/infrastructure-memory/src/queries/in-memory-ledger-queries.test.ts:115-132` — exact expected values | PASS |
| FDC-41 | Statement returns ID/date/description/signed amount/running balance. | `packages/infrastructure-memory/src/queries/in-memory-ledger-queries.test.ts:146-163`; DTO assertion: `get-account-statement.test.ts:178-192` | PASS |
| FDC-42 | Same-day items order by date DESC then registration sequence DESC. | `packages/infrastructure-memory/src/queries/in-memory-ledger-queries.test.ts:173-212` — sequence beats lexical ID and exact intermediate balances; application DTO: `get-account-statement.test.ts:217-239` | PASS |
| FDC-43 | Missing/foreign account returns `ENTITY_NOT_FOUND` without cross-book exposure. | `packages/infrastructure-memory/src/use-cases/get-account-balance.test.ts:112-149`; statement guards: `get-account-statement.test.ts:264-306` | PASS |
| FDC-44 | Original and reversal both appear and net to zero. | `packages/infrastructure-memory/src/queries/in-memory-ledger-queries.test.ts:234-245`; statement reversal assertions: `get-account-statement.test.ts:329-380` | PASS |
| FDC-45 | Commands accept serializable primitives and convert inside use cases. | `packages/application/src/ports/commands.ts:1-64` — primitive command contracts; `get-account-statement.test.ts:178-192` — serializable DTO | PASS |
| FDC-46 | Repositories serve aggregate roots and queries use separate query ports. | `packages/application/src/ports/repositories.ts:15-40`; `packages/application/src/ports/queries.ts:23-32` | PASS |
| FDC-47 | Save/load uses independent copies. | `packages/infrastructure-memory/src/store/in-memory-store.test.ts:41-66`; journal repository copy/no-save assertions | PASS |
| FDC-48 | Duplicate ID add rejects with `DUPLICATE_ENTITY`. | `packages/infrastructure-memory/src/repositories/in-memory-journal-entry-repository.test.ts:41-47`; book/account repository counterparts | PASS |
| FDC-49 | Failed transaction restores all repositories. | `packages/infrastructure-memory/src/transaction/in-memory-transaction-manager.test.ts:103-115` — pre-transaction snapshot restored | PASS |
| FDC-50 | Wrong expected version rejects and preserves the aggregate. | `packages/infrastructure-memory/src/repositories/in-memory-journal-entry-repository.test.ts:78-93` — exact concurrency error and preservation | PASS |
| FDC-51 | Events publish only after commit. | `packages/application/src/core/use-case-executor.test.ts:151-176` — exact commit-before-publish order | PASS |
| FDC-52 | Book confirmation publishes one book and four account events. | `packages/infrastructure-memory/src/use-cases/create-financial-book.test.ts:85-105` — exact count/order/IDs | PASS |
| FDC-53 | Account/category confirmation publishes one account event. | `packages/infrastructure-memory/src/use-cases/create-financial-account.test.ts:54-69`; category tests:37-60 | PASS |
| FDC-54 | Opening/expense/income/transfer confirmation publishes `JournalEntryPosted`. | `packages/infrastructure-memory/src/use-cases/set-opening-balance.test.ts:144-168`; record-expense:64-82; transfer:95-123 | PASS |
| FDC-55 | Reversal publishes posted and related reversed events. | `packages/infrastructure-memory/src/use-cases/reverse-journal-entry.test.ts:124-147` — exact order/relation payload | PASS |
| FDC-56 | Failed/rolled-back write publishes zero events. | `packages/application/src/core/use-case-executor.test.ts:179-198`; book rollback:202-220 | PASS |
| FDC-57 | Expected failures return stable Result errors, not infrastructure exceptions. | `packages/application/src/core/use-case-executor.test.ts:179-224` — stable error mapping and Result assertions | PASS |
| FDC-58 | Fixed adapters produce equivalent IDs, dates, events, snapshots and results. | `packages/infrastructure-memory/src/testing/deterministic-adapters.test.ts:63-73`; statement equivalence: `get-account-statement.test.ts:385-410` | PASS |
| FDC-59 | Active duplicate opening balance rejects with exact code, no write/event. | `packages/infrastructure-memory/src/use-cases/set-opening-balance.test.ts:31-48` — `OPENING_BALANCE_ALREADY_SET`, snapshot and events | PASS |
| FDC-60 | Reversal before original date rejects with exact code, no change/event. | `packages/infrastructure-memory/src/use-cases/reverse-journal-entry.test.ts:194-208`; domain guard: `journal-entry.test.ts:349-369` | PASS |
| FDC-61 | Reversal target with `reversalOf` rejects with exact code, no change/event. | `packages/infrastructure-memory/src/use-cases/reverse-journal-entry.test.ts:176-192`; domain guard: `journal-entry.test.ts:371-400` | PASS |
| FDC-62 | ASSET/LIABILITY expense and all four ordered transfers preserve exact signs and exclude income/expense accounts. | `packages/infrastructure-memory/src/use-cases/financial-account-kind-matrix.test.ts:15-118` — `it.each` matrix, postings, balances and account-kind assertion | PASS |
| FDC-63 | Confirmed journal entries persist the ISO instant supplied by `Clock`. | `packages/infrastructure-memory/src/use-cases/journal-ordering-metadata.test.ts:19-117` — all five command-produced entries equal the fixed clock instant | PASS |
| FDC-64 | Sequence is a decimal string, unique/strictly increasing per book and rollback-safe within the transaction. | `packages/infrastructure-memory/src/repositories/in-memory-journal-entry-repository.test.ts:14-20`; rollback proof: `in-memory-transaction-manager.test.ts:61-79` | PASS |
| FDC-65 | Every domain-event envelope has `eventVersion: 1`. | `packages/application/src/core/use-case-executor.test.ts:75-95` — all four supported event types assert exact version 1 | PASS |
| FDC-66 | Envelope `aggregateVersion` equals the producing fact's aggregate version. | `packages/application/src/core/use-case-executor.test.ts:86-95`; domain fact versions: `journal-entry.test.ts:142-147,282-293` | PASS |

**Spec-anchored result**: 66/66 ACs matched the spec-defined outcome; 0 uncovered ACs; 0 spec-precision gaps.

## Discrimination Sensor

**Sensor depth**: lightweight, 3 targeted behavior-level mutations. Mutations were applied only in disposable clone `/tmp/fdc-sensor.Z5XnrX`; no `git stash` was used.

| # | Scratch mutation | Target | Result |
| --- | --- | --- | --- |
| 1 | Replaced same-day decimal-sequence comparison with lexical journal-ID comparison. | `packages/infrastructure-memory/src/queries/in-memory-ledger-queries.ts:110` | Killed: infrastructure tests failed (2 tests; wrong order and running balances) |
| 2 | Changed `eventVersion: 1` to runtime value 2 (type cast only in scratch). | `packages/application/src/core/event-dispatcher.ts:32` | Killed: application tests failed (2 tests; exact envelope assertions) |
| 3 | Removed the active-opening-balance guard. | `packages/application/src/ledger/journal/set-opening-balance.ts:63-72` | Killed: infrastructure test failed (duplicate opening balance returned success) |

**Sensor result**: 3 injected, 3 killed, 0 survived — PASS. The real worktree porcelain before and after cleanup was identical:
`context.md`, `design.md`, `spec.md`, and `validation.md` modified.

## Code Quality

| Check | Status |
| --- | --- |
| No features beyond requested scope | PASS |
| Surgical changes and existing patterns | PASS |
| No unrelated code improvement | PASS |
| Spec-anchored exact assertions and payload/state checks | PASS |
| Per-layer coverage expectation met | PASS |
| Every scoped test maps to an AC, edge case or task criterion | PASS |
| Project guidelines | PASS; `design.md:451-464`, no separate repository guideline found |
| Interactive UAT | N/A; backend/domain/application/in-memory feature with no user-facing UI |

## Edge Cases

- [x] Same-day ordering with lexical IDs opposite to registration sequence.
- [x] Four intermediate running balances in sequence order.
- [x] Sequence isolation by book and rollback-safe reservation.
- [x] Duplicate active opening balance, post-reversal replacement, account/book isolation.
- [x] Retroactive reversal and reversal-of-reversal rejection.
- [x] ASSET/LIABILITY expense and all four transfer directions.
- [x] Event version and aggregate version exactness.

## Gate Check

- **Gate command**: `pnpm build && pnpm lint && pnpm check-types && pnpm test`
- **Result**: build 5/5 successful; lint 6/6 successful; typecheck 6/6 successful; test 5/5 successful.
- **Tests**: 30 test files, 288 passed, 0 failed, 0 skipped (domain 115, application 9, infrastructure-memory 164).
- **Baseline**: `c8d45fe^` independently ran 28 test files and 264 tests (domain 107, application 8, infrastructure-memory 149).
- **Delta**: +2 test files, +24 tests; no test-count decrease.
- **Failures/skips**: none.
- **Warnings**: existing Turbo output warnings and Next workspace-root warnings were non-blocking; no gate failed.

## Requirement Traceability Update

The amendment requirements FDC-42 and FDC-59 through FDC-66 are verified by this report. Their `spec.md` statuses were updated from `Pending` to `Verified`; no implementation or test files were changed.

## Summary

**Overall**: PASS — Ready
**Spec-anchored check**: 66/66 matched spec outcome; 0 gaps; 0 spec-precision gaps
**Sensor**: 3/3 mutations killed
**Gate**: 288 passed, 0 failed, 0 skipped
**Gaps**: none
