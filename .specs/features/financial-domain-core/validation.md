# financial-domain-core Validation

Date: 2026-08-04
Spec: .specs/features/financial-domain-core/spec.md
Diff/commit range: d1c1c79^..570afc1 (33 commits, T1-T33)
Verifier: independent; prior author conclusions and prior validation report were not reused.

## Verdict

## Validation: financial-domain-core - PASS

All 58 ACs have current evidence. No gap or spec-precision gap was found. The sensor killed all 6 mutations, and the real worktree remained equal to its baseline during sensor cleanup.

## Task Completion

| Tasks | Status | Evidence |
| --- | --- | --- |
| T1-T33 | Done | tasks.md:94-791 marks every task done; 33 commits in d1c1c79^..570afc1. |

## Spec-Anchored Acceptance Criteria

| AC | Spec-defined outcome | file:line + assertion or structural evidence | Result |
| --- | --- | --- | --- |
| FDC-01 | Monetary minor units and calculations use bigint. | packages/domain/src/shared/money.test.ts:13-15 asserts 123n and typeof bigint; :31 asserts exact 200n arithmetic. | PASS |
| FDC-02 | Different currencies reject with CURRENCY_MISMATCH. | packages/domain/src/shared/money.test.ts:68-70 and :74-76 assert the exact error code for add/subtract. | PASS |
| FDC-03 | Invalid calendar date rejects with invalid-date error. | packages/domain/src/shared/local-date.test.ts:5-12 asserts DomainError and exact INVALID_DATE; invalid formats/days at :41-52. | PASS |
| FDC-04 | IDs/current time come from IdGenerator/Clock ports. | packages/infrastructure-memory/src/testing/deterministic-adapters.test.ts:19-34 asserts fixed date and per-type IDs; get-account-statement.test.ts:378-385 asserts equivalent fixed executions. | PASS |
| FDC-05 | Domain package has no framework, persistence, external, global-clock or global-ID imports. | packages/domain/src/index.ts:1-11 and package source imports are domain-local only; packages/domain/package.json:1-26 has no runtime dependency; build/lint/typecheck passed. | PASS |
| FDC-06 | Valid book creates normalized name, version 0, supplied ID. | create-financial-book.test.ts:48-69 asserts exact book/account result; :71-81 asserts normalized output and version. | PASS |
| FDC-07 | Empty name/timezone or invalid currency rejects with no persistence. | create-financial-book.test.ts:151-178 asserts exact errors, empty snapshot and zero events. | PASS |
| FDC-08 | Exactly four system accounts have required purpose/kind pairs. | create-financial-book.test.ts:42-69 asserts all four exact systemPurpose/kind pairs. | PASS |
| FDC-09 | Book/account creation rolls back atomically on intermediate failure. | create-financial-book.test.ts:181-211 asserts UNEXPECTED_ERROR, empty snapshot and zero events. | PASS |
| FDC-10 | Base currency is immutable while book exists. | packages/domain/src/book/financial-book.test.ts:27-32 asserts getter without setter and parsed base currency. | PASS |
| FDC-11 | Cross-book aggregate operation rejects without state change. | journal-entry-factory.test.ts:165-177 asserts foreign-book rejection; transfer-money.test.ts:190-198 asserts BOOK_MISMATCH and unchanged state/events. | PASS |
| FDC-12 | All five account kinds are supported. | ledger-account.test.ts:23-31 asserts exact normal-balance mapping for ASSET, LIABILITY, INCOME, EXPENSE and EQUITY. | PASS |
| FDC-13 | Valid account/category persists normalized name, ACTIVE, version 0 and book ID. | create-financial-account.test.ts:24-41 and category tests :24-34 assert exact DTO fields. | PASS |
| FDC-14 | Non-ASSET/LIABILITY financial account rejects with INVALID_ACCOUNT_KIND. | create-financial-account.test.ts:72-85 asserts exact code, unchanged snapshot and zero events. | PASS |
| FDC-15 | Income/expense category role mismatch rejects with INVALID_ACCOUNT_KIND. | create-income-category.test.ts:63-76 and create-expense-category.test.ts:63-76 assert exact code and no writes/events. | PASS |
| FDC-16 | System account archive/type transitions reject without mutation. | ledger-account.test.ts:124-144 asserts SYSTEM_ACCOUNT_PROTECTED and snapshot equality. | PASS |
| FDC-17 | Duplicate normalized name/type/book rejects with DUPLICATE_ENTITY. | create-financial-account.test.ts:104-124 asserts duplicate CHECKING, exact code and unchanged state/events. | PASS |
| FDC-18 | Fewer than two postings rejects with INSUFFICIENT_POSTINGS. | journal-entry.test.ts:50-61 asserts exact code. | PASS |
| FDC-19 | Fewer than two distinct accounts rejects with INSUFFICIENT_ACCOUNTS. | journal-entry.test.ts:64-76 asserts exact code. | PASS |
| FDC-20 | Zero posting rejects with ZERO_POSTING_AMOUNT. | posting.test.ts:22-30 asserts exact code. | PASS |
| FDC-21 | Posting currency different from book/base rejects with CURRENCY_MISMATCH. | journal-entry.test.ts:78-92 and set-opening-balance.test.ts:106-116 assert exact code and no persistence. | PASS |
| FDC-22 | Non-zero signed posting sum rejects with UNBALANCED_JOURNAL_ENTRY. | journal-entry.test.ts:95-106 asserts exact code for 100 + (-99). | PASS |
| FDC-23 | Inactive/foreign account rejects with no persisted change. | set-opening-balance.test.ts:131-143 and transfer-money.test.ts:160-198 assert exact errors and unchanged state/events. | PASS |
| FDC-24 | Trimmed-empty description rejects with no change. | journal-entry.test.ts:109-120 asserts INVALID_JOURNAL_DESCRIPTION; record-expense.test.ts:145-151 checks no write. | PASS |
| FDC-25 | Asset opening is debit asset / credit opening account with equal positive value. | set-opening-balance.test.ts:44-47 asserts exact 10000n/-10000n postings. | PASS |
| FDC-26 | Liability opening is credit liability / debit opening account. | set-opening-balance.test.ts:58-61 asserts exact -10000n/10000n postings. | PASS |
| FDC-27 | Zero/negative, wrong currency or wrong account kind rejects with no journal. | set-opening-balance.test.ts:90-116 and :119-128 assert exact errors, unchanged snapshot and zero events. | PASS |
| FDC-28 | Expense debits category and credits financial account equally. | record-expense.test.ts:57-60 asserts exact 2500n/-2500n. | PASS |
| FDC-29 | Income debits financial account and credits income category equally. | record-income.test.ts:57-60 asserts exact 2500n/-2500n. | PASS |
| FDC-30 | Expense/income zero, negative or incompatible currency rejects with no journal. | record-expense.test.ts:107-129 and record-income.test.ts:107-129 assert NON_POSITIVE_AMOUNT/CURRENCY_MISMATCH and unchanged state/events. | PASS |
| FDC-31 | Registered journal fields cannot be changed directly. | journal-entry.test.ts:40-48 asserts immutable getter; :135-137 asserts postings copy; journal-entry.ts:115-148 exposes no setters. | PASS |
| FDC-32 | Transfer credits source and debits destination equally. | transfer-money.test.ts:85-88 asserts exact -2500n/2500n. | PASS |
| FDC-33 | Invalid same account, role/status/book/currency/amount/description rejects with no journal. | transfer-money.test.ts:125-239 asserts exact error codes and unchanged snapshots/events for each branch. | PASS |
| FDC-34 | Transfer contains only source/destination, no income/expense posting. | transfer-money.test.ts:89-91 asserts category IDs are excluded. | PASS |
| FDC-35 | Reversal has new ID and exact opposite postings, same currency/accounts. | journal-entry.test.ts:191-208 asserts reversal identity, links, amounts and currency. | PASS |
| FDC-36 | Reversal and original persist atomically with reversalOf/reversedBy. | reverse-journal-entry.test.ts:100-111 asserts exact links/snapshots; :212-221 asserts conflict rollback. | PASS |
| FDC-37 | Second reversal rejects with JOURNAL_ENTRY_ALREADY_REVERSED. | reverse-journal-entry.test.ts:155-165 asserts exact code, unchanged state and zero events. | PASS |
| FDC-38 | Original entry/postings remain unchanged after reversal. | reverse-journal-entry.test.ts:142-152 asserts postings, date, description and currency equality. | PASS |
| FDC-39 | As-of balance includes only postings on/before requested date. | in-memory-ledger-queries.test.ts:92-97 asserts 2026-08-03 and exact 60; get-account-balance.test.ts:82-90 asserts DTO. | PASS |
| FDC-40 | Displayed sign is raw for asset/expense and inverted for liability/income/equity. | in-memory-ledger-queries.test.ts:115-132 asserts exact expected value for all five kinds. | PASS |
| FDC-41 | Statement returns entry ID/date/description/signed amount/running balance. | in-memory-ledger-queries.test.ts:146-163 and get-account-statement.test.ts:172-184 assert all DTO fields. | PASS |
| FDC-42 | Same-day statement order is date descending, then entry ID descending. | in-memory-ledger-queries.test.ts:177-180 asserts entry-b then entry-a; get-account-statement.test.ts:208-228 asserts full ordering. | PASS |
| FDC-43 | Missing/foreign account returns ENTITY_NOT_FOUND without cross-book query. | get-account-balance.test.ts:110-146 and get-account-statement.test.ts:244-294 assert errors plus throwing query guards. | PASS |
| FDC-44 | Original and reversal both appear and net balance is zero. | in-memory-ledger-queries.test.ts:220-224 asserts both items and exact 0; get-account-statement.test.ts:316-360 asserts vertical statement. | PASS |
| FDC-45 | Commands accept serializable primitives and use cases convert them to domain types. | application/src/ports/commands.ts:1-64 contains only primitive command fields; get-account-statement.test.ts:172-184 asserts serializable string DTOs. | PASS |
| FDC-46 | Repositories are for aggregate roots and balance/statement use separate query ports. | application/src/ports/repositories.ts:15-40 defines exactly three aggregate repositories; application/src/ports/queries.ts:23-32 defines separate LedgerQueries; typecheck passed. | PASS |
| FDC-47 | Save/load uses independent copies; mutation without add/save does not persist. | in-memory-store.test.ts:41-66 and in-memory-journal-entry-repository.test.ts:57-64 assert object/nested copy and no-save isolation. | PASS |
| FDC-48 | Duplicate ID add rejects with DUPLICATE_ENTITY. | in-memory-financial-book-repository.test.ts:33-40 and in-memory-journal-entry-repository.test.ts:32-39 assert exact code. | PASS |
| FDC-49 | Failed transaction restores every repository to pre-transaction state. | in-memory-transaction-manager.test.ts:81-95 asserts book/account/journal snapshot equals before; :131-154 covers serialization. | PASS |
| FDC-50 | Wrong expected version rejects with OPTIMISTIC_CONCURRENCY_FAILURE and preserves aggregate. | in-memory-journal-entry-repository.test.ts:78-90 and account/book equivalents assert exact code and prior snapshot. | PASS |
| FDC-51 | Domain facts publish only after commit. | use-case-executor.test.ts:122-148 asserts commit before publication; :150-169 asserts zero on failure. | PASS |
| FDC-52 | Book confirmation publishes one FinancialBookCreated then four LedgerAccountCreated. | create-financial-book.test.ts:85-105 asserts exact five-event order and IDs. | PASS |
| FDC-53 | Account/category confirmation publishes one LedgerAccountCreated. | create-financial-account.test.ts:54-69 and category tests :47-60 assert exact type/count/payload. | PASS |
| FDC-54 | Opening, expense, income and transfer confirmation publish JournalEntryPosted. | set-opening-balance.test.ts:71-86, record-expense.test.ts:68-81, record-income.test.ts:68-81 and transfer-money.test.ts:101-122 assert exact event type/payload. | PASS |
| FDC-55 | Reversal publishes JournalEntryPosted and related JournalEntryReversed. | reverse-journal-entry.test.ts:116-139 asserts exact order and relation payload. | PASS |
| FDC-56 | Failed/rolled-back write publishes zero events. | create-financial-book.test.ts:207-220 and reverse-journal-entry.test.ts:217-221 assert zero events. | PASS |
| FDC-57 | Expected failures return stable Result errors, not infrastructure exceptions. | use-case-executor.test.ts:172-198 asserts UNEXPECTED_ERROR/preserved application code in Result.fail; get-account-statement.test.ts:310-313 checks boundary mapping. | PASS |
| FDC-58 | Fixed clock/IDs/publisher yield equal IDs, dates, events, snapshots and results. | get-account-statement.test.ts:378-385 asserts equality across executions; deterministic-adapters.test.ts:61-73 covers adapters. | PASS |

Spec-anchored result: 58/58 ACs matched the spec-defined outcome; 0 gaps; 0 spec-precision gaps.

## Discrimination Sensor

The preferred temporary git worktree was unavailable because the environment refused .git/worktrees writes. The prescribed fallback was used: a full local clone at /tmp/fdc-sensor.6UcTas, with mutations only in that clone. No git stash was used.

| # | Scratch mutation | Target | Result |
| --- | --- | --- | --- |
| 1 | Changed Money.add from a + b to a + b + 1n. | packages/domain/src/shared/money.ts:28 | Killed: domain test failed with 201n versus expected 200n. |
| 2 | Flipped journal balance guard total !== 0n to total === 0n. | packages/domain/src/ledger/journal/journal-entry.ts:279 | Killed: 13/17 journal tests failed. |
| 3 | Changed expense financial posting from amount.negate() to amount. | packages/domain/src/ledger/journal/journal-entry-factory.ts:110 | Killed: factory test failed on unbalanced expense behavior. |
| 4 | Removed assignment of entryReversedBy. | packages/domain/src/ledger/journal/journal-entry.ts:213 | Killed: 4/17 journal tests failed. |
| 5 | Removed statement.reverse() before returning the statement. | packages/infrastructure-memory/src/queries/in-memory-ledger-queries.ts:65 | Killed: 4/18 query tests failed. |
| 6 | Removed store.restore(before) from transaction catch. | packages/infrastructure-memory/src/transaction/in-memory-transaction-manager.ts:58 | Killed: 1/5 transaction tests failed. |

Sensor depth: full manual fault-injection, 6 relevant behavior mutations.
Sensor result: 6 injected, 6 killed, 0 survived.
Isolation: real worktree baseline was empty before the sensor and remained empty after scratch cleanup; the only subsequent real-tree change is this requested validation.md write.

## Gate Check

- Build gate: pnpm build && pnpm lint && pnpm check-types && pnpm test
- Initial environment issue: first invocation could not start because node_modules/turbo was a stale broken symlink; CI=1 pnpm install --frozen-lockfile repaired only ignored dependencies, without changing tracked files.
- Final result: build 5/5 Turbo tasks passed; lint 6/6 passed; typecheck 6/6 passed; test 5/5 package tasks passed.
- Tests: 28 test files, 264 passed, 0 failed, 0 skipped (domain 107, application 8, infrastructure-memory 149).
- Test count before feature: 0 .test.ts files at d1c1c79^; delta +264 tests.
- Failures/skips: none after deterministic dependency setup.

## Code Quality

| Check | Status |
| --- | --- |
| No feature beyond requested scope | PASS |
| Surgical changes and existing patterns | PASS |
| No unrelated code improvement | PASS |
| Spec-anchored exact assertions | PASS |
| Domain 1:1 AC coverage and query happy/error/edge coverage | PASS |
| Every scoped test maps to an AC, edge case or task criterion | PASS |
| Project testing guidelines | PASS; design.md:451-464, no separate repository guideline found |

## Summary

Overall: Ready
ACs: 58/58 matched
Gate: 264 passed, 0 failed, 0 skipped
Sensor: 6/6 killed, 0 survived
Gaps: none
