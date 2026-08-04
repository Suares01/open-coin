# Financial SQLite Persistence Validation

## Validation: financial-sqlite-persistence - PASS

**Date**: 2026-08-04  
**Spec**: `.specs/features/financial-sqlite-persistence/spec.md`  
**Diff range**: `e344cc7^..01459e9`  
**Verifier**: independent verifier; author != verifier

## Verdict

**PASS**. The current worktree is at `01459e9`; all 58 acceptance criteria have exact evidence, including rollback restoration of a pre-existing journal version, reversal link, sequence and reversal entry. The workspace gates pass with 712 tests and no warnings or skips; all three isolated sensor mutants were killed.

## Task Completion

All 25 tasks are marked `[x]` in `tasks.md`. Git confirms the T1-T25 commits in order, followed by the independent correction commits `50a9df9` and `81acea6`.

| Task | Status | Commit |
| --- | --- | --- |
| T1 | Done | `e344cc7` |
| T2 | Done | `06c000f` |
| T3 | Done | `e21f30c` |
| T4 | Done | `c9295ee` |
| T5 | Done | `1cffc05` |
| T6 | Done | `3058c25` |
| T7 | Done | `04afb99` |
| T8 | Done | `a8e1f52` |
| T9 | Done | `1afbcb5` |
| T10 | Done | `98db4c6` |
| T11 | Done | `37bfc2c` |
| T12 | Done | `bab6eb5` |
| T13 | Done | `19d9b41` |
| T14 | Done | `cde7020` |
| T15 | Done | `4197989` |
| T16 | Done | `9d56501` |
| T17 | Done | `f8099bd` |
| T18 | Done | `24d3cea` |
| T19 | Done | `f2c96ef` |
| T20 | Done | `708ce6b` |
| T21 | Done | `a7b4b79` |
| T22 | Done | `dc486f9` |
| T23 | Done | `aee3e7c` |
| T24 | Done | `2d78246` |
| T25 | Done | `71faab3` |

Git status before and after the sensor is identical: only the pre-existing untracked `.specs/LESSONS.md`, `.specs/lessons.json`, and this report are present. No code, tests, commits, or stash operations were made by this verification.

### Current HEAD reconciliation

`git rev-parse HEAD` returned `01459e9cd82de881e7f9a7b2c096249fda40136e`; `git show -s` returned parent `81acea6` and title `test(sqlite): cover rollback restoration`. The current file `packages/infrastructure-sqlite/tests/transaction/sqlite-transaction-manager.test.ts` contains the new FSP-43 test at lines 297-347. The real worktree porcelain before and after sensor cleanup remained exactly:

```text
?? .specs/LESSONS.md
?? .specs/features/financial-sqlite-persistence/validation.md
?? .specs/lessons.json
```

## Spec-Anchored Acceptance Criteria

Evidence-or-zero was applied independently to all 58 ACs. Each PASS row cites a `file:line` and the exact assertion expression used by the test.

| AC | Spec-defined outcome | `file:line` + exact assertion expression | Result |
| --- | --- | --- | --- |
| FSP-01 | Production dependencies are exactly domain and application. | `packages/infrastructure-sqlite/tests/public-api.test.ts:77-80` — `expect(Object.keys(packageJson.dependencies ?? {}).sort()).toEqual(["@open-coin/application", "@open-coin/domain"])` | PASS |
| FSP-02 | Production code has no forbidden host or Node-driver imports. | `packages/infrastructure-sqlite/tests/public-api.test.ts:71-72` — `expect(source, relativePath).not.toMatch(/from ["'](?:node:|react|@tauri-apps|zustand|@tanstack|pluggy)/)` and `expect(source, relativePath).not.toMatch(/better-sqlite3|BetterSqliteDatabase/)` | PASS |
| FSP-03 | Publicly exposes all five driver contracts and required methods. | `packages/infrastructure-sqlite/tests/public-api.test.ts:89-117` — `expect(databaseDeclarationSource).toContain("SqliteExecutionResult")`; `expect(databaseDeclarationSource).toContain("SqliteParameters")`; `expect(databaseDeclarationSource).toContain("SqliteValue")`; `expect(valueDeclarationSource).toContain("export type SqliteValue = string | number | Uint8Array | null;")`; `expect(valueDeclarationSource).toContain("export type SqliteParameters = readonly SqliteValue[] | Readonly<Record<string, SqliteValue>>;")`; `expect(executorDeclarationSource).toContain("execute(sql: string, parameters?: SqliteParameters): Promise<SqliteExecutionResult>;")`; `expect(executorDeclarationSource).toContain("query<Row extends Record<string, unknown>>(sql: string, parameters?: SqliteParameters): Promise<Row[]>;")`; `expect(executorDeclarationSource).toContain("executeBatch(sql: string): Promise<void>;")`; `expect(databaseContractDeclarationSource).toContain("interface SqliteDatabase extends SqliteExecutor");` and exact `transaction`/`close` assertions | PASS |
| FSP-04 | Every repository read and write uses only the supplied `SqliteExecutor`. | `packages/infrastructure-sqlite/src/repositories/create-sqlite-repository-context.test.ts:180-189` — `expect(fixture.executor.executions.map((sql) => sql.split(" ")[0])).toEqual(["INSERT", "UPDATE", "INSERT", "UPDATE", "INSERT", "INSERT", "INSERT", "UPDATE"])` | PASS |
| FSP-05 | Current application contracts and domain behavior remain unchanged. | `packages/infrastructure-sqlite/tests/contracts/persistence-contracts.test.ts:161-167` — `expect(adapter.books.findById(bookId)).resolves.toMatchObject({ id: "book-1", name: "book-1", baseCurrency: { code: "BRL" }, timezone: "America/Sao_Paulo", version: 0 })` | PASS |
| FSP-06 | Positional and named parameters are bound without interpolation. | `packages/infrastructure-sqlite/tests/database/better-sqlite-database.test.ts:43-45` — `expect(rows).toEqual([{ name: "value'); DROP TABLE records; --", amount: 9 }])` | PASS |
| FSP-07 | Execute returns affected rows and decimal row ID. | `packages/infrastructure-sqlite/tests/database/better-sqlite-database.test.ts:27-28` — `expect(result.rowsAffected).toBe(1)`; `expect(result.lastInsertRowId).toBe("1")` | PASS |
| FSP-08 | Foreign keys and busy timeout are effective before transactions. | `packages/infrastructure-sqlite/tests/database/configure-sqlite-connection.test.ts:30` and `:41` — `expect(rows).toEqual([{ foreign_keys: 1 }])`; `expect(rows).toEqual([{ timeout: 5000 }])` | PASS |
| FSP-09 | File databases use WAL and FULL synchronous mode. | `packages/infrastructure-sqlite/tests/database/configure-sqlite-connection.test.ts:79` and `:82` — `expect(await database.query<{ journal_mode: string }>("PRAGMA journal_mode")).toEqual([{ journal_mode: "wal" }])`; `expect(await database.query<{ synchronous: number }>("PRAGMA synchronous")).toEqual([{ synchronous: 2 }])` | PASS |
| FSP-10 | Memory databases keep memory journal mode and do not request WAL. | `packages/infrastructure-sqlite/tests/database/configure-sqlite-connection.test.ts:52` — `expect(rows).toEqual([{ journal_mode: "memory" }])` | PASS |
| FSP-11 | `:memory:` uses one private connection through close. | `packages/infrastructure-sqlite/tests/database/better-sqlite-database.test.ts:122-124` — `expect(await database.query("SELECT name FROM records")).toEqual([{ name: "inside" }])`; `:277-278` — `expect(closeSpy).toHaveBeenCalledTimes(1)` and `await expect(database.query("SELECT 1")).rejects.toThrow("closed")` | PASS |
| FSP-12 | Close releases once and later operations reject without reopening. | `packages/infrastructure-sqlite/tests/database/better-sqlite-database.test.ts:277-278` — `expect(closeSpy).toHaveBeenCalledTimes(1)`; `await expect(database.query("SELECT 1")).rejects.toThrow("closed")` | PASS |
| FSP-13 | Out-of-range amount is rejected before INSERT. | `packages/infrastructure-sqlite/tests/repositories/sqlite-journal-entry-repository.test.ts:429-433` — `).rejects.toMatchObject({ code: "UNEXPECTED_ERROR" })`; `expect(executeSpy).not.toHaveBeenCalled()`; `await expect(repository.findById(journalEntryIdFromString("entry-1"))).resolves.toBeNull()` | PASS |
| FSP-14 | Sequence overflow aborts and preserves the previous value. | `packages/infrastructure-sqlite/tests/repositories/sqlite-journal-entry-repository.test.ts:340-346` — `).rejects.toMatchObject({ code: "UNEXPECTED_ERROR" })`; `expect(rows[0]?.sequence).toBe("9223372036854775807")` | PASS |
| FSP-15 | Migration list is ordered, unique and contiguous. | `packages/infrastructure-sqlite/scripts/generate-migrations.test.mjs:45-47`, `:65-78` — `expect(migrations.map(({ version }) => version)).toEqual([1, 2])`; `await expect(readMigrations(directory)).rejects.toThrow("contiguous from 1")`; `await expect(readMigrations(directory)).rejects.toThrow("Duplicate migration version")` | PASS |
| FSP-16 | Empty DB creates strict `schema_migrations` with required columns. | `packages/infrastructure-sqlite/tests/migrations/sqlite-migration-runner.test.ts:69` — `expect(rows[0]?.sql).toContain("STRICT")` | PASS |
| FSP-17 | Applied migration stores canonical checksum with schema change. | `packages/infrastructure-sqlite/tests/migrations/sqlite-migration-runner.test.ts:90-97` — `expect(await database.query<{ version: number; checksum: string }>("SELECT version, checksum FROM schema_migrations ORDER BY version")).toEqual([{ version: 1, checksum: "checksum-1" }, { version: 2, checksum: "checksum-2" }])`; `packages/infrastructure-sqlite/scripts/generate-migrations.test.mjs:88-89` — `expect(normalizeSql(sql)).toBe(canonical)` and `expect(checksumSql(sql)).toBe(expected)` | PASS |
| FSP-18 | Unknown applied version fails before pending SQL. | `packages/infrastructure-sqlite/tests/migrations/sqlite-migration-runner.test.ts:112-119` — `await expect(runner.migrate()).rejects.toBeInstanceOf(UnknownAppliedMigrationError)`; `expect(await database.query("SELECT name FROM sqlite_schema WHERE name = 'pending'")).toEqual([])` | PASS |
| FSP-19 | Modified checksum fails before pending SQL. | `packages/infrastructure-sqlite/tests/migrations/sqlite-migration-runner.test.ts:135-142` — `await expect(runner.migrate()).rejects.toBeInstanceOf(ModifiedMigrationError)`; `expect(await database.query("SELECT name FROM sqlite_schema WHERE name IN ('pending', 'later')")).toEqual([])` | PASS |
| FSP-20 | Re-running current migrations is an observable no-op. | `packages/infrastructure-sqlite/tests/migrations/sqlite-migration-runner.test.ts:154-161` — `expect(await database.query("SELECT name FROM sqlite_schema WHERE name = 'only_once'")).toEqual([{ name: "only_once" }])`; `expect(await database.query("SELECT version FROM schema_migrations")).toEqual([{ version: 1 }])` | PASS |
| FSP-21 | Failed migration rolls back schema SQL and control row. | `packages/infrastructure-sqlite/tests/migrations/sqlite-migration-runner.test.ts:174-182` — `await expect(runner.migrate()).rejects.toThrow()`; `expect(await database.query("SELECT name FROM sqlite_schema WHERE name = 'transient'")).toEqual([])`; `expect(await database.query("SELECT version FROM schema_migrations")).toEqual([])` | PASS |
| FSP-22 | Initial schema contains all approved tables and snapshot columns. | `packages/infrastructure-sqlite/tests/migrations/initial-financial-ledger.test.ts:123-133` — `await expect(columns("financial_books")).resolves.toEqual(BOOK_COLUMNS)`; `await expect(columns("ledger_accounts")).resolves.toEqual(ACCOUNT_COLUMNS)`; `await expect(columns("journal_sequences")).resolves.toEqual(SEQUENCE_COLUMNS)`; `await expect(columns("journal_entries")).resolves.toEqual(ENTRY_COLUMNS)`; `await expect(columns("postings")).resolves.toEqual(POSTING_COLUMNS)` | PASS |
| FSP-23 | Schema is STRICT, has cross-book FKs, and planned indexes. | `packages/infrastructure-sqlite/tests/migrations/initial-financial-ledger.test.ts:176` — `expect(rows.every((row) => row.sql.includes("STRICT"))).toBe(true)`; `:186-220` — cross-book `await expect(database.execute(...)).rejects.toThrow()`; `:371-380` — `expect(rows.map((row) => row.name)).toEqual([...approved indexes])` | PASS |
| FSP-24 | Currency, version/position, amount and enum checks reject invalid values. | `packages/infrastructure-sqlite/tests/migrations/initial-financial-ledger.test.ts:226-248` and `:251-293` — each invalid insert/update is asserted with `await expect(database.execute(...)).rejects.toThrow()` | PASS |
| FSP-25 | IDs, system purpose, normalized name, sequence and posting position are unique. | `packages/infrastructure-sqlite/tests/migrations/initial-financial-ledger.test.ts:319-327`, `:333-341`, `:355-362` — duplicate operations are asserted with `await expect(...).rejects.toThrow()` | PASS |
| FSP-26 | Balance/minimum-posting/account/reversal invariants stay in domain/application. | `packages/infrastructure-sqlite/tests/migrations/initial-financial-ledger.test.ts:161-164` — `expect(triggers).toEqual([])`; `expect(tableDefinitions.every(({ sql }) => !/balanced|minimum[_ ]posting|minimum[_ ]account/i.test(sql))).toBe(true)` | PASS |
| FSP-27 | Mappers only map rows/snapshots and restore raises no facts. | `packages/infrastructure-sqlite/src/mappers/journal-entry-mapper.test.ts:146-158` — `expect(entry.pullDomainFacts()).toEqual([])` | PASS |
| FSP-28 | Loads return independent instances with equal snapshots. | `packages/infrastructure-sqlite/tests/repositories/sqlite-financial-book-repository.test.ts:80-81` — `expect(loaded).not.toBe(book)`; `expect(loaded?.toSnapshot()).toEqual(book.toSnapshot())` | PASS |
| FSP-29 | Nonzero-version add rejects with optimistic-concurrency error. | `packages/infrastructure-sqlite/tests/repositories/sqlite-financial-book-repository.test.ts:87-90` — `await expect(repository.add(restored({ version: 1 }))).rejects.toMatchObject({ code: "OPTIMISTIC_CONCURRENCY_FAILURE" })`; `await expect(repository.findById(bookIdFromString("book-1"))).resolves.toBeNull()` | PASS |
| FSP-30 | Save performs one conditional update with expected version and N+1 aggregate version. | `packages/infrastructure-sqlite/tests/repositories/sqlite-financial-book-repository.test.ts:112-119` — `await repository.save(updated, 0)`; `expect(executeSpy).toHaveBeenCalledTimes(1)`; `expect(executeSpy.mock.calls[0]?.[0]).toContain("WHERE id = ? AND version = ?")`; `expect((await repository.findById(updated.id))?.toSnapshot()).toEqual(snapshot({ name: "Updated", version: 1 }))` | PASS |
| FSP-31 | Zero-row save distinguishes not-found/conflict and preserves state. | `packages/infrastructure-sqlite/tests/repositories/sqlite-financial-book-repository.test.ts:127-145` — exact `ENTITY_NOT_FOUND`, `OPTIMISTIC_CONCURRENCY_FAILURE`, and `expect((await repository.findById(...))?.toSnapshot()).toEqual(snapshot())` assertions | PASS |
| FSP-32 | Duplicate ID/name/system-purpose add maps to `DUPLICATE_ENTITY`. | `packages/infrastructure-sqlite/tests/repositories/sqlite-ledger-account-repository.test.ts:178-212` — duplicate cases `rejects.toMatchObject({ code: "DUPLICATE_ENTITY" })` | PASS |
| FSP-33 | Book methods preserve id, name, currency, timezone and version. | `packages/infrastructure-sqlite/tests/repositories/sqlite-financial-book-repository.test.ts:80-81` — `expect(loaded?.toSnapshot()).toEqual(book.toSnapshot())` | PASS |
| FSP-34 | Account methods preserve fields and scope searches by book. | `packages/infrastructure-sqlite/tests/repositories/sqlite-ledger-account-repository.test.ts:109-110` — `expect(loaded?.toSnapshot()).toEqual(accountSnapshot())`; `:127-138` and `:152-157` — exact book-scoped `toBe("book-1")`, `toBeNull()`, `resolves.toBe(true/false)` assertions | PASS |
| FSP-35 | Journal hydration uses one statement and ordered postings. | `packages/infrastructure-sqlite/tests/repositories/sqlite-journal-entry-repository.test.ts:177-181` — `expect(loaded?.toSnapshot()).toEqual(entry.toSnapshot())`; `expect(loaded?.postings.map((posting) => posting.id)).toEqual(["posting-1", "posting-2"])`; `:184-190` — `expect(querySpy).toHaveBeenCalledTimes(1)` | PASS |
| FSP-36 | Active opening balance is same-book, linked correctly, and excludes reversal links. | `packages/infrastructure-sqlite/tests/repositories/sqlite-journal-entry-repository.test.ts:207-221` and `:287-301` — exact `toBe("opening-entry")` and `resolves.toBeNull()` assertions | PASS |
| FSP-37 | Entry and all postings persist atomically in one transaction. | `packages/infrastructure-sqlite/tests/transaction/sqlite-transaction-manager.test.ts:229-254` — `).rejects.toMatchObject({ code: "UNEXPECTED_ERROR" })`; `expect(...).toEqual([{ books: 0, accounts: 0, entries: 0, postings: 0, sequences: 0 }])` after the second posting fails | PASS |
| FSP-38 | Sequence reservation is atomic, unique, increasing and independent by book, including concurrent calls. | `packages/infrastructure-sqlite/tests/repositories/sqlite-journal-entry-repository.test.ts:313-321` — `resolves.toBe("1")`, `resolves.toBe("2")`, second book `resolves.toBe("1")`; `:324-331` — `expect(sequences.sort()).toEqual(["1", "2", "3"])` | PASS |
| FSP-39 | Transaction begins with `BEGIN IMMEDIATE`. | `packages/infrastructure-sqlite/tests/database/better-sqlite-database.test.ts:262-264` — `expect(execSpy.mock.calls.map(([sql]) => sql)).toContain("BEGIN IMMEDIATE")` | PASS |
| FSP-40 | Concurrent callbacks are FIFO and external queries wait. | `packages/infrastructure-sqlite/tests/transaction/sqlite-transaction-manager.test.ts:189-194` — `expect(order).toEqual(["first:start", "first:end", "second:start", "second:end"])`; `:206-211` — `expect(externalResolved).toBe(false)` and `expect(externalResolved).toBe(true)` | PASS |
| FSP-41 | Callback/statement/commit failure rolls back and preserves original error. | `packages/infrastructure-sqlite/tests/database/better-sqlite-database.test.ts:213-225` — `).rejects.toBe(failure)` and `expect(await database.query("SELECT name FROM records")).toEqual([])`; `:241-251` — `).rejects.toBe(failure)` and `expect(execSpy.mock.calls.some(([sql]) => sql === "ROLLBACK")).toBe(true)` | PASS |
| FSP-42 | Commit returns callback value and only confirmed facts. | `packages/infrastructure-sqlite/tests/transaction/sqlite-transaction-manager.test.ts:91-100` — `expect(committed.value).toBe("committed")`; `expect(committed.facts.map((fact) => fact.aggregateId)).toEqual(["book-1", "book-2"])`; `expect(...).toEqual([{ count: 2 }])` | PASS |
| FSP-43 | Rollback removes entries/postings and pending facts, restores a pre-existing version 0 with no `reversedBy`, preserves the pre-existing reversal link and restores the pre-existing sequence. | `packages/infrastructure-sqlite/tests/transaction/sqlite-transaction-manager.test.ts:297-308` — commits `entry-1` at version `0`, a reversal with `reversalOf: "entry-1"`, and sequence `2`; `:310-325` — reserves `"3"`, saves `entry-1` at version `1` with `reversedBy: "reversal-entry"`, then asserts the transaction rejects; `:335-347` — `toMatchObject({ version: 0 })`, `not.toHaveProperty("reversedBy")`, `toMatchObject({ reversalOf: "entry-1" })`, and `toEqual([{ sequence: "2" }])` | PASS |
| FSP-44 | Balance filters same book/account and `occurredOn <= asOf`. | `packages/infrastructure-sqlite/tests/queries/sqlite-ledger-queries.test.ts:104-113` — `resolves.toEqual({ accountId: "account-asset", asOf: "2026-08-01", amountMinor: "100", currency: "BRL" })` | PASS |
| FSP-45 | Display balance applies `normalBalanceOf`. | `packages/infrastructure-sqlite/tests/queries/sqlite-ledger-queries.test.ts:130-144` — `expect(result.amountMinor).toBe(expected)` for ASSET, LIABILITY, INCOME, EXPENSE and EQUITY | PASS |
| FSP-46 | No postings return zero/book currency and empty statement. | `packages/infrastructure-sqlite/tests/queries/sqlite-ledger-queries.test.ts:119-127` — exact zero DTO; `:216-220` — `resolves.toEqual([])` | PASS |
| FSP-47 | Running balance is chronological; statement is descending by date/sequence. | `packages/infrastructure-sqlite/tests/queries/sqlite-ledger-queries.test.ts:154-158` — exact three-item running-balance array; `:168` — `expect(result.map(({ journalEntryId }) => journalEntryId)).toEqual(["entry-a", "entry-z"])` | PASS |
| FSP-48 | Monetary values, running balances and sequences cross the driver as exact strings. | `packages/infrastructure-sqlite/tests/queries/sqlite-ledger-queries.test.ts:193-195` — `expect(statement[0]?.amountMinor).toBe("9007199254740993")`; `expect(statement[0]?.runningBalanceMinor).toBe("9007199254740993")`; `expect(balance.amountMinor).toBe("9007199254740993")` | PASS |
| FSP-49 | Original and reversal remain visible and net naturally. | `packages/infrastructure-sqlite/tests/queries/sqlite-ledger-queries.test.ts:179-183` — exact two-item statement and `expect(balance.amountMinor).toBe("0")` | PASS |
| FSP-50 | Queries isolate the requested book. | `packages/infrastructure-sqlite/tests/queries/sqlite-ledger-queries.test.ts:209-210` — `expect(balance).toMatchObject({ amountMinor: "100", currency: "BRL" })`; `expect(statement.map(({ journalEntryId }) => journalEntryId)).toEqual(["entry-main"])` | PASS |
| FSP-51 | Driver error retains code, extended code, message and cause internally. | `packages/infrastructure-sqlite/src/database/sqlite-error.test.ts:18-23` — `expect(parseSqliteError(cause)).toEqual({ code: "SQLITE_CONSTRAINT_CHECK", extendedCode: 275, message: "INSERT INTO books VALUES (?)", cause })` | PASS |
| FSP-52 | Public errors use current codes and sanitized messages. | `packages/infrastructure-sqlite/src/database/sqlite-error.test.ts:79-84` — `expect(error).toMatchObject({ code: "UNEXPECTED_ERROR", message: "SQLite operation failed" })`; `toThrowError(new ApplicationError("UNEXPECTED_ERROR", "amountMinor is outside the supported SQLite range"))` | PASS |
| FSP-53 | One implementation-agnostic repository/query contract suite runs against memory and SQLite. | `packages/infrastructure-sqlite/tests/contracts/persistence-contracts.test.ts:432-433` — `definePersistenceContracts("repository and query contracts: memory", memoryFactory)` and `definePersistenceContracts("repository and query contracts: sqlite", sqliteFactory)` | PASS |
| FSP-54 | Current use cases produce equivalent results, errors, facts and rollbacks on both adapters. | `packages/infrastructure-sqlite/tests/contracts/query-use-cases.test.ts:398-407` — `expect(second).toEqual(first)` and the same contract definition for memory and SQLite; equivalent definitions also appear in `book-account`, `cash-flow`, and `transfer-reversal` contract suites | PASS |
| FSP-55 | SQLite tests cover FKs, uniqueness, checks, order, large precision, version conflict and intermediate rollback. | `packages/infrastructure-sqlite/tests/migrations/initial-financial-ledger.test.ts:186-362` — FK/check/uniqueness `rejects.toThrow()` assertions; `packages/infrastructure-sqlite/tests/repositories/sqlite-journal-entry-repository.test.ts:177-181`, `:340-346`, `:468-471`; `packages/infrastructure-sqlite/tests/transaction/sqlite-transaction-manager.test.ts:239-254` | PASS |
| FSP-56 | Supported migration state passes integrity and FK checks. | `packages/infrastructure-sqlite/tests/migrations/initial-financial-ledger.test.ts:384-387` — `resolves.toEqual([{ integrity_check: "ok" }])`; `resolves.toEqual([])` | PASS |
| FSP-57 | Exact workspace gate completes without warnings or skips. | Gate run: `pnpm build && pnpm lint && pnpm check-types && pnpm test` exited 0 for all four commands; output contained no `Warning`, `⚠`, or skipped-test report; workspace totals were 712 passed and 0 skipped. | PASS |
| FSP-58 | Public API exports production adapters only; Node fixtures/driver stay out. | `packages/infrastructure-sqlite/tests/public-api.test.ts:55-65` — `expect(source).not.toMatch(/mappers|BetterSqliteDatabase|better-sqlite3|tests\/support|SqliteFactCollector/)`; `expect(Object.keys(api)).not.toEqual(expect.arrayContaining([...]))` | PASS |

**Spec-anchored status**: 58/58 ACs matched the spec-defined outcome; no evidence gaps. FSP-43 is supported by the new rollback restoration test at `sqlite-transaction-manager.test.ts:297-347`.

## Discrimination Sensor

The preferred temporary git worktree was unavailable because `.git/worktrees` is read-only. The fallback created three tracked-source copies under `/tmp/open-coin-sqlite-sensor`, `/tmp/open-coin-sqlite-sensor-2`, and `/tmp/open-coin-sqlite-sensor-3`, linked installed dependencies, and mutated only those copies. All scratch directories were removed after the runs; the real-worktree porcelain before and after was identical.

| Mutation | File:line | Description | Killed? |
| --- | --- | --- | --- |
| 1 | `packages/infrastructure-sqlite/src/queries/sqlite-ledger-queries.ts:103` | Changed `return statement.reverse();` to `return statement;`; focused query/contract run failed 6 tests (83 passed, 6 failed). | Yes |
| 2 | `packages/infrastructure-sqlite/tests/support/better-sqlite-database.ts:108` | Changed `this.connection.exec("BEGIN IMMEDIATE")` to `this.connection.exec("BEGIN")`; focused driver run failed the exact `BEGIN IMMEDIATE` assertion (13 passed, 1 failed). | Yes |
| 3 | `packages/infrastructure-sqlite/src/repositories/sqlite-journal-entry-repository.ts:123` | Changed `for (const posting of values.postings)` to `values.postings.slice(0, 1)`; focused repository/transaction run failed 8 tests (20 passed, 8 failed). | Yes |

**Sensor depth**: lightweight fallback, three high-risk behavior mutations.  
**Result**: 3/3 killed, 0 survived.  
**Isolation**: scratch removed; real porcelain unchanged.

## Interactive UAT Results

Not applicable: this is a backend/infrastructure feature with no user-facing UI flow.

## Code Quality

| Principle/check | Status | Evidence/assessment |
| --- | --- | --- |
| No features beyond request | PASS | Tauri bridge and unrelated persistence domains remain out of scope. |
| No single-use abstractions/speculative flexibility | PASS | Driver, migrations, repositories, transaction manager and query boundaries match the approved design. |
| Surgical changes | PASS | `git diff --check 90ce3d7..HEAD` passed; production changes are feature-local plus the explicit workspace warning fix. |
| No unrelated improvements | PASS | The only adjacent changes are the requested `81acea6` Next/Turbo warning correction. |
| Existing patterns/style | PASS | Package configuration follows `infrastructure-memory`; lint uses `--max-warnings 0` and passed. |
| Senior-engineer approval | PASS | Structure is coherent and FSP-43 now asserts restoration of pre-existing version, reversal link and sequence. |
| Tests map to ACs and are non-shallow | PASS | All 58 ACs have exact evidence; the new FSP-43 assertions target the specified state. |
| Per-layer coverage expectation | PASS | Domain/repository/query/transaction paths meet the matrix, including rollback restoration. |
| Every test maps to an AC, edge case or done-when criterion | PASS | Test groups correspond to the coverage matrix in `tasks.md:20-52`. |
| Documented guidelines followed | PASS | `.codex/skills/codenavi/references/coding-principles.md` and `tlc-spec-driven/references/validate.md` were read and applied. |

## Edge Cases

- [x] Modified migration checksum stops before pending SQL — `sqlite-migration-runner.test.ts:135-142`.
- [x] Rollback after partial journal write restores every entry/posting/version/sequence/fact state — pre-existing version/link/sequence restoration is asserted at `sqlite-transaction-manager.test.ts:297-347`.
- [x] Concurrent same-book sequence reservations produce distinct ordered values — `sqlite-journal-entry-repository.test.ts:324-331`.
- [x] Cross-book account/entry/reversal relationships are rejected — `initial-financial-ledger.test.ts:179-220`.
- [x] Amount above `Number.MAX_SAFE_INTEGER` round-trips exactly — `sqlite-ledger-queries.test.ts:186-195`.
- [x] Unrepresented constraint errors are sanitized — `sqlite-error.test.ts:48-57`, `:79-84`, and `sqlite-transaction-manager.test.ts:147-173`.
- [x] Empty account balance is zero and statement is empty — `sqlite-ledger-queries.test.ts:116-127`, `:213-220`.
- [x] Second migration run is observable no-op — `sqlite-migration-runner.test.ts:145-161`.

## Gate Check

- **Gate command**: `pnpm build && pnpm lint && pnpm check-types && pnpm test`
- **Result**: 4/4 commands passed; 0 failed; 0 skipped.
- **Build**: Turbo 6/6 successful; Next.js docs and web builds completed without warnings.
- **Lint**: Turbo 7/7 successful with `--max-warnings 0`.
- **Check-types**: Turbo 7/7 successful.
- **Test files**: 53 passed.
- **Tests**: 712 passed, 0 failed, 0 skipped (115 domain + 9 application + 164 memory baseline + 424 SQLite).
- **Baseline**: 164 `@open-coin/infrastructure-memory` tests in 20 files; unchanged and passing.
- **Feature package**: 424 tests in 23 files; unchanged tests were not deleted or skipped.
- **Additional check**: `pnpm --filter @open-coin/infrastructure-sqlite check:migrations` passed.
- **Deterministic close check**: run after this report is written; expected result is zero because this report has a filled `PASS` verdict and `file:line` evidence for all ACs.

## Fix Plans

None. No surviving sensor mutant, failed acceptance criterion, or spec-precision gap remains.

## Requirement Traceability Update

The verifier did not mutate `spec.md`; its traceability table remains `In Tasks` as recorded at `.specs/features/financial-sqlite-persistence/spec.md:193-250`.

| Requirement | Validation result |
| --- | --- |
| FSP-01–FSP-58 | ✅ Verified by the evidence table above. |

## Summary

**Overall**: Ready — PASS.

**Spec-anchored check**: 58/58 ACs matched; 0 evidence gaps.  
**Sensor**: 3/3 mutations killed.  
**Gate**: 712 passed, 0 failed, 0 skipped; 164 memory baseline preserved.

**What works**: T1-T25 are complete; `01459e9` is proven as `HEAD`; all 58 ACs have exact assertions; FSP-43 proves restoration of pre-existing version 0, absent `reversedBy`, reversal link and sequence 2; workspace gates pass; no sensor mutant survived; real porcelain stayed unchanged.

**Issue found**: None.

**Next step**: None; feature validation is complete.
