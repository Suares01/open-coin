# Persistência Financeira em SQLite — Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user - do not proceed without it.**

---

**Design**: `.specs/features/financial-sqlite-persistence/design.md`
**Status**: Approved (2026-08-04)

---

## Test Coverage Matrix

> Generated from codebase, project guidelines, and spec. No project coverage threshold was found, so the skill's strong defaults apply. Commands come from `package.json`, `turbo.json`, and package manifests. Style and depth were sampled from 20 files and 164 passing tests in `packages/infrastructure-memory/src/**/*.test.ts`, plus domain/application tests.

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| --- | --- | --- | --- | --- |
| Package config and type-only contracts | none | Build, lint and typecheck only; public types compile under NodeNext | `packages/infrastructure-sqlite/{package.json,src/database/*.ts}` | `pnpm --filter @open-coin/infrastructure-sqlite build` |
| Migration generator, error mapping, mappers and fact collector | unit | All branches; every corresponding FSP criterion and listed edge case | `packages/infrastructure-sqlite/{scripts,src}/**/*.test.*` | `pnpm --filter @open-coin/infrastructure-sqlite test` |
| Node driver and connection lifecycle | integration | Binding, PRAGMAs, FIFO isolation, scoped executor, commit, rollback and close | `packages/infrastructure-sqlite/tests/database/**/*.test.ts` | `pnpm --filter @open-coin/infrastructure-sqlite test` |
| Migration runner and SQL schema | integration | Empty/latest/unknown/modified/failure paths; every schema constraint and integrity PRAGMA | `packages/infrastructure-sqlite/tests/migrations/**/*.test.ts` | `pnpm --filter @open-coin/infrastructure-sqlite test` |
| Repositories | integration | Every public method, contract result, error path, optimistic conflict, rollback and constraint | `packages/infrastructure-sqlite/tests/repositories/**/*.test.ts` | `pnpm --filter @open-coin/infrastructure-sqlite test` |
| Transaction manager and repository context | integration | Commit/rollback/facts/sequence/concurrency; no partial state or fact leakage | `packages/infrastructure-sqlite/tests/transaction/**/*.test.ts` | `pnpm --filter @open-coin/infrastructure-sqlite test` |
| Ledger queries | integration | All FSP-44–FSP-50 outcomes and every query edge case | `packages/infrastructure-sqlite/tests/queries/**/*.test.ts` | `pnpm --filter @open-coin/infrastructure-sqlite test` |
| Shared adapter and use-case contracts | integration | Same assertions against memory and SQLite; all 97 existing financial use-case scenarios | `packages/infrastructure-sqlite/tests/contracts/**/*.test.ts` | `pnpm --filter @open-coin/infrastructure-sqlite test` |
| Public API boundary | unit/structural | Required exports present; forbidden runtime imports and Node driver absent | `packages/infrastructure-sqlite/tests/public-api.test.ts` | `pnpm --filter @open-coin/infrastructure-sqlite test` |

## Gate Check Commands

> Generated from the current pnpm/Turbo workspace. The SQLite package command becomes available in T1.

| Gate Level | When to Use | Command |
| --- | --- | --- |
| Quick | After a unit or focused component task | `pnpm --filter @open-coin/infrastructure-sqlite test` |
| Full | After driver, migration, repository, transaction or query integration tasks | `pnpm --filter @open-coin/infrastructure-sqlite build && pnpm --filter @open-coin/infrastructure-sqlite lint && pnpm --filter @open-coin/infrastructure-sqlite check-types && pnpm --filter @open-coin/infrastructure-sqlite test` |
| Build | After each phase and T25 | `pnpm build && pnpm lint && pnpm check-types && pnpm test` |

Current baseline before this feature: `@open-coin/infrastructure-memory` has 20 passing files and 164 passing tests. No existing test may be deleted, weakened or skipped.

---

## Execution Plan

Phases are ordered and run sequentially. Tasks within each phase are also sequential.

### Phase 1: Driver, conexão e migrations

```text
T1 → T2 → T3 → T4 → T5 → T6 → T7 → T8
```

### Phase 2: Mappers e repositories

```text
T9 → T10 → T11 → T12 → T13 → T14 → T15
```

### Phase 3: Contexto transacional

```text
T16 → T17 → T18
```

### Phase 4: Queries, equivalência e API pública

```text
T19 → T20 → T21 → T22 → T23 → T24 → T25
```

---

## Task Breakdown

## Phase 1: Driver, conexão e migrations

### T1: Criar o pacote `@open-coin/infrastructure-sqlite`

**What**: Adicionar o scaffold do pacote, scripts, dependências de produção/dev, configuração TypeScript/ESLint e entrypoint inicial vazio.
**Where**: `packages/infrastructure-sqlite/`
**Depends on**: None
**Reuses**: `packages/infrastructure-memory/package.json`, tsconfigs e ESLint.
**Requirement**: FSP-01, FSP-02, FSP-57, FSP-58

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`

**Done when**:

- [x] O pacote expõe `dist/index.js` e `dist/index.d.ts` sob o nome aprovado.
- [x] Dependências de produção contêm somente domain e application.
- [x] `better-sqlite3`, seus types, Vitest e infrastructure-memory aparecem somente em devDependencies.
- [x] O lockfile é atualizado sem alterar versões não relacionadas.
- [x] Build, lint, typecheck e test vazio do pacote passam.
- [x] Test count: 0 novos casos; matrix confirma build-only.

**Tests**: none (build gate only)
**Gate**: build
**Commit**: `build(sqlite): scaffold infrastructure package`

---

### T2: Definir os contratos neutros do driver

**What**: Implementar e exportar `SqliteValue`, parâmetros, resultado, `SqliteExecutor` e `SqliteDatabase` exatamente como aprovados.
**Where**: `packages/infrastructure-sqlite/src/database/`
**Depends on**: T1
**Reuses**: Tipos definidos em `design.md`.
**Requirement**: FSP-03, FSP-04, FSP-05, FSP-06, FSP-07

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`

**Done when**:

- [x] Os tipos aceitam somente string, number, Uint8Array e null.
- [x] `SqliteDatabase` estende `SqliteExecutor` com transaction e close.
- [x] O build prova as assinaturas genéricas e declarações emitidas.
- [x] Nenhum import de plataforma entra nos contratos.
- [x] Test count: 0 novos casos; matrix confirma build-only.

**Tests**: none (build gate only)
**Gate**: build
**Commit**: `feat(sqlite): define driver contracts`

---

### T3: Gerar migrations TypeScript a partir dos SQL canônicos

**What**: Criar o gerador determinístico com modos write/check, validação de nomes/versões e checksum SHA-256.
**Where**: `packages/infrastructure-sqlite/scripts/generate-migrations.mjs`
**Depends on**: T2
**Reuses**: ESM e Node 20+ do workspace.
**Requirement**: FSP-15, FSP-17, FSP-58

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`

**Done when**:

- [x] O gerador ordena versões, rejeita nome inválido, gap e duplicidade.
- [x] LF e newline final são normalizados antes do SHA-256.
- [x] `--check` não escreve e falha diante de drift.
- [x] A saída possui cabeçalho generated/do-not-edit e conteúdo estável.
- [x] Sete testes unitários derivados dos critérios passam.
- [x] Test count: 7 novos casos; nenhum teste removido.

**Tests**: unit
**Gate**: quick
**Commit**: `build(sqlite): generate canonical migrations`

---

### T4: Implementar o driver Node de teste

**What**: Implementar `BetterSqliteDatabase` com binding, fila global, executor transacional escopado, safe rowid e lifecycle de fechamento.
**Where**: `packages/infrastructure-sqlite/tests/support/better-sqlite-database.ts`
**Depends on**: T3
**Reuses**: `SqliteDatabase` e API oficial de `better-sqlite3`.
**Requirement**: FSP-06, FSP-07, FSP-11, FSP-12, FSP-39, FSP-40, FSP-41, FSP-51

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`

**Done when**:

- [x] Parâmetros posicionais/nomeados são vinculados sem interpolação.
- [x] Execute/query/batch retornam o contrato definido.
- [x] Toda operação pública respeita FIFO.
- [x] Query externa espera uma transação ativa e não participa dela.
- [x] Executor escopado falha depois de commit ou rollback.
- [x] Callback/commit failure reverte quando ativo e preserva o erro original.
- [x] Close rejeita novas submissões e fecha uma única vez.
- [x] Doze testes de integração passam.
- [x] Test count: 12 novos casos; nenhum teste removido.

**Tests**: integration
**Gate**: full
**Commit**: `test(sqlite): add better sqlite driver`

---

### T5: Configurar PRAGMAs por tipo de conexão

**What**: Implementar `configureSqliteConnection` e verificar os valores efetivos em memória e arquivo local.
**Where**: `packages/infrastructure-sqlite/src/database/configure-sqlite-connection.ts`
**Depends on**: T4
**Reuses**: `SqliteDatabase` e o driver de teste.
**Requirement**: FSP-08, FSP-09, FSP-10

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`

**Done when**:

- [x] Toda conexão fica com foreign_keys ON e busy_timeout 5000.
- [x] Arquivo local fica em WAL e synchronous FULL.
- [x] `:memory:` não solicita WAL e mantém modo de memória.
- [x] Configuração executada dentro de transação é rejeitada no teste de precondição.
- [x] Seis testes de integração consultam PRAGMAs efetivos.
- [x] Test count: 6 novos casos; nenhum teste removido.

**Tests**: integration
**Gate**: full
**Commit**: `feat(sqlite): configure connection pragmas`

---

### T6: Implementar o migration runner

**What**: Criar validação de plano/histórico, erros tipados, bootstrap da tabela de controle e aplicação transacional por migration.
**Where**: `packages/infrastructure-sqlite/src/migrations/sqlite-migration-runner.ts`
**Depends on**: T5
**Reuses**: `SqliteDatabase`, `SqliteMigration` gerada e transações do driver.
**Requirement**: FSP-15, FSP-16, FSP-17, FSP-18, FSP-19, FSP-20, FSP-21

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`

**Done when**:

- [x] Plano inválido falha antes de tocar o banco.
- [x] `schema_migrations` é criado em transação curta.
- [x] Unknown version e checksum modificado falham antes de pendências.
- [x] Cada migration e sua row confirmam ou revertem juntas.
- [x] Segunda execução é no-op.
- [x] Dez testes de integração cobrem todos os estados aprovados.
- [x] Test count: 10 novos casos; nenhum teste removido.

**Tests**: integration
**Gate**: full
**Commit**: `feat(sqlite): run versioned migrations`

---

### T7: Criar a migration inicial do ledger financeiro

**What**: Definir as seis tabelas, checks, foreign keys compostas, unicidades e índices do schema aprovado.
**Where**: `packages/infrastructure-sqlite/migrations/0001_initial_financial_ledger.sql`
**Depends on**: T6
**Reuses**: Snapshots atuais de domain e plano de schema do design.
**Requirement**: FSP-22, FSP-23, FSP-24, FSP-25, FSP-26, FSP-56

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`

**Done when**:

- [x] Gerador atualiza o módulo TS e checksum da migration 0001.
- [x] Todas as tabelas são STRICT e possuem apenas os campos aprovados.
- [x] Relações cross-book são rejeitadas pelas FKs compostas.
- [x] Enums, moedas, versões, posição e amount não zero possuem checks.
- [x] Unicidades e índices correspondem ao design.
- [x] `integrity_check` retorna ok e `foreign_key_check` retorna vazio.
- [x] Quatorze testes de integração cobrem schema e constraints.
- [x] Test count: 14 novos casos; nenhum teste removido.

**Tests**: integration
**Gate**: full
**Commit**: `feat(sqlite): create initial ledger schema`

---

### T8: Orquestrar a inicialização do database

**What**: Criar `initializeSqliteDatabase` para configurar a conexão e executar as migrations padrão na ordem correta.
**Where**: `packages/infrastructure-sqlite/src/database/initialize-sqlite-database.ts`
**Depends on**: T7
**Reuses**: Configurador, migration runner e lista gerada.
**Requirement**: FSP-08, FSP-09, FSP-10, FSP-16, FSP-20, FSP-22

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`

**Done when**:

- [x] PRAGMAs são aplicados antes da primeira transação do runner.
- [x] Migrations padrão podem ser substituídas somente para testes.
- [x] Inicialização repetida preserva schema e histórico.
- [x] Quatro testes de integração cobrem memória, arquivo, ordem e repetição.
- [x] Gate de fase Build passa com contagem preservada.
- [x] Test count: 4 novos casos; nenhum teste removido.

**Tests**: integration
**Gate**: build
**Commit**: `feat(sqlite): initialize database`

## Phase 2: Mappers e repositories

### T9: Normalizar e mapear erros SQLite

**What**: Implementar `parseSqliteError`, integer guard e mapeamento sanitizado para os códigos atuais de application.
**Where**: `packages/infrastructure-sqlite/src/database/sqlite-error.ts`
**Depends on**: T8
**Reuses**: `ApplicationError` e códigos públicos atuais.
**Requirement**: FSP-13, FSP-14, FSP-29, FSP-32, FSP-51, FSP-52

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`

**Done when**:

- [x] Driver error preserva code, extendedCode, message e cause internamente.
- [x] UNIQUE/PRIMARY KEY mapeiam para DUPLICATE_ENTITY.
- [x] Demais constraints/overflow mapeiam para UNEXPECTED_ERROR.
- [x] ApplicationError e DomainError existentes não são remapeados.
- [x] Mensagem pública não contém SQL, parâmetros ou caminho.
- [x] Oito testes unitários cobrem todos os branches.
- [x] Test count: 8 novos casos; nenhum teste removido.

**Tests**: unit
**Gate**: quick
**Commit**: `feat(sqlite): map driver errors`

---

### T10: Mapear `FinancialBook`

**What**: Implementar row validation e conversão exata entre `FinancialBook` e parâmetros SQLite.
**Where**: `packages/infrastructure-sqlite/src/mappers/financial-book-mapper.ts`
**Depends on**: T9
**Reuses**: `FinancialBook.restore` e `toSnapshot`.
**Requirement**: FSP-27, FSP-28, FSP-33

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`

**Done when**:

- [x] Todos os cinco campos fazem round-trip exato.
- [x] Restore não levanta fatos.
- [x] Row inválida falha antes de construir o aggregate.
- [x] Quatro testes unitários passam.
- [x] Test count: 4 novos casos; nenhum teste removido.

**Tests**: unit
**Gate**: quick
**Commit**: `feat(sqlite): map financial books`

---

### T11: Implementar `SqliteFinancialBookRepository`

**What**: Implementar find/add/save, versão zero, update atômico, distinção not-found/conflito e fatos após sucesso.
**Where**: `packages/infrastructure-sqlite/src/repositories/sqlite-financial-book-repository.ts`
**Depends on**: T10
**Reuses**: Mapper, error mapping e `FinancialBookRepository`.
**Requirement**: FSP-28, FSP-29, FSP-30, FSP-31, FSP-32, FSP-33

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`

**Done when**:

- [x] Find retorna null ou nova instância equivalente.
- [x] Add rejeita versão e ID inválidos com códigos exatos.
- [x] Save usa WHERE version e exige versão N+1.
- [x] Zero rows separa ausência de conflito sem sobrescrever estado.
- [x] Fatos são coletados somente depois da escrita bem-sucedida.
- [x] Oito testes de integração passam.
- [x] Test count: 8 novos casos; nenhum teste removido.

**Tests**: integration
**Gate**: full
**Commit**: `feat(sqlite): persist financial books`

---

### T12: Mapear `LedgerAccount`

**What**: Implementar validação e conversão de todos os campos obrigatórios/opcionais de conta.
**Where**: `packages/infrastructure-sqlite/src/mappers/ledger-account-mapper.ts`
**Depends on**: T11
**Reuses**: `LedgerAccount.restore` e `toSnapshot`.
**Requirement**: FSP-27, FSP-28, FSP-34

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`

**Done when**:

- [x] Round-trip preserva kind, status, normalizedName, purpose e version.
- [x] Null de system_purpose vira undefined e retorna a null na escrita.
- [x] Enums, numbers e strings inválidos são rejeitados.
- [x] Restore não levanta fatos.
- [x] Cinco testes unitários passam.
- [x] Test count: 5 novos casos; nenhum teste removido.

**Tests**: unit
**Gate**: quick
**Commit**: `feat(sqlite): map ledger accounts`

---

### T13: Implementar `SqliteLedgerAccountRepository`

**What**: Implementar os cinco métodos do contract com filtros por livro, constraints e concorrência otimista.
**Where**: `packages/infrastructure-sqlite/src/repositories/sqlite-ledger-account-repository.ts`
**Depends on**: T12
**Reuses**: Mapper, error mapping e `LedgerAccountRepository`.
**Requirement**: FSP-28, FSP-29, FSP-30, FSP-31, FSP-32, FSP-34

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`

**Done when**:

- [x] Find/purpose/name respeitam bookId e campos exatos.
- [x] ID, nome e propósito duplicados retornam DUPLICATE_ENTITY.
- [x] Save distingue ausência/conflito e preserva estado em falha.
- [x] Conta de outro livro não satisfaz buscas escopadas.
- [x] Fatos só são coletados após sucesso.
- [x] Onze testes de integração passam.
- [x] Test count: 11 novos casos; nenhum teste removido.

**Tests**: integration
**Gate**: full
**Commit**: `feat(sqlite): persist ledger accounts`

---

### T14: Mapear `JournalEntry` e postings

**What**: Agrupar rows ordenadas e converter entry/postings com BigInt textual, links opcionais e posição.
**Where**: `packages/infrastructure-sqlite/src/mappers/journal-entry-mapper.ts`
**Depends on**: T13
**Reuses**: `JournalEntry.restore`, `toSnapshot` e posting snapshots.
**Requirement**: FSP-13, FSP-27, FSP-28, FSP-35, FSP-48

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`

**Done when**:

- [x] Todos os campos do entry e postings fazem round-trip exato.
- [x] Ordem das rows define ordem dos postings sem compartilhar arrays.
- [x] Valores acima de Number.MAX_SAFE_INTEGER são preservados.
- [x] Amount fora de 64 bits é rejeitado antes dos parâmetros.
- [x] Rows vazias/inconsistentes e enums inválidos falham.
- [x] Sete testes unitários passam.
- [x] Test count: 7 novos casos; nenhum teste removido.

**Tests**: unit
**Gate**: quick
**Commit**: `feat(sqlite): map journal entries`

---

### T15: Implementar `SqliteJournalEntryRepository`

**What**: Implementar hydration por JOIN, opening-balance lookup, sequência atômica, add de entry/postings e save de reversão.
**Where**: `packages/infrastructure-sqlite/src/repositories/sqlite-journal-entry-repository.ts`
**Depends on**: T14
**Reuses**: Journal mapper, error mapping e `JournalEntryRepository`.
**Requirement**: FSP-28, FSP-29, FSP-30, FSP-31, FSP-32, FSP-35, FSP-36, FSP-37, FSP-38, FSP-43

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`

**Done when**:

- [x] Find usa um statement e preserva posição/links/BigInt.
- [x] Active opening balance exclui reversor e revertido e isola book.
- [x] Reserva usa UPSERT RETURNING e é monotônica por livro.
- [x] Add exige versão zero e insere entry/postings no executor recebido.
- [x] Save atualiza reversedBy/version com WHERE version.
- [x] IDs, relações cross-book, posição e amount inválidos são rejeitados.
- [x] Quinze testes de integração passam.
- [x] Gate de fase Build passa com baseline preservado.
- [x] Test count: 15 novos casos; nenhum teste removido.

**Tests**: integration
**Gate**: build
**Commit**: `feat(sqlite): persist journal entries`

## Phase 3: Contexto transacional

### T16: Implementar o coletor transacional de fatos

**What**: Criar um `DomainFactCollector` isolado, pull-once e sem referências mutáveis externas.
**Where**: `packages/infrastructure-sqlite/src/repositories/sqlite-fact-collector.ts`
**Depends on**: T15
**Reuses**: Porta `DomainFactCollector` e semântica do adapter memory.
**Requirement**: FSP-42, FSP-43

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`

**Done when**:

- [x] Record preserva ordem e aceita batches vazios.
- [x] Pull devolve os fatos correntes e esvazia o coletor.
- [x] Segundo pull é vazio e arrays do chamador não alteram estado.
- [x] Cinco testes unitários passam.
- [x] Test count: 5 novos casos; nenhum teste removido.

**Tests**: unit
**Gate**: quick
**Commit**: `feat(sqlite): collect transactional facts`

---

### T17: Criar a factory do `RepositoryContext`

**What**: Montar os três repositories e o mesmo coletor sobre um único executor recebido.
**Where**: `packages/infrastructure-sqlite/src/repositories/create-sqlite-repository-context.ts`
**Depends on**: T16
**Reuses**: Repositories implementados e `RepositoryContext` atual.
**Requirement**: FSP-04, FSP-05, FSP-37, FSP-42

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`

**Done when**:

- [x] Todos os repositories recebem exatamente o executor fornecido.
- [x] Todos gravam no mesmo coletor fornecido.
- [x] Shape contém somente books/accounts/journalEntries/facts.
- [x] Quatro testes unitários de composição passam.
- [x] Test count: 4 novos casos; nenhum teste removido.

**Tests**: unit
**Gate**: quick
**Commit**: `feat(sqlite): create repository context`

---

### T18: Implementar `SqliteTransactionManager`

**What**: Adaptar database transaction para RepositoryContext, committed value/facts, rollback, sanitização e concorrência.
**Where**: `packages/infrastructure-sqlite/src/transaction/sqlite-transaction-manager.ts`
**Depends on**: T17
**Reuses**: Context factory, fact collector e `TransactionManager`.
**Requirement**: FSP-37, FSP-38, FSP-39, FSP-40, FSP-41, FSP-42, FSP-43

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`

**Done when**:

- [ ] Commit retorna valor e fatos na ordem confirmada.
- [ ] Falha após cada write e reserva reverte todo o estado.
- [ ] Fatos revertidos não vazam para a próxima transação.
- [ ] Erro application/domain preserva identidade; driver error é sanitizado.
- [ ] Callbacks concorrentes e queries externas não intercalam.
- [ ] Nove testes de integração passam.
- [ ] Gate de fase Build passa com baseline preservado.
- [ ] Test count: 9 novos casos; nenhum teste removido.

**Tests**: integration
**Gate**: build
**Commit**: `feat(sqlite): manage financial transactions`

## Phase 4: Queries, equivalência e API pública

### T19: Implementar `SqliteLedgerQueries`

**What**: Consultar postings textuais e derivar balance/statement com BigInt, sinal normal, datas, ordem e isolamento.
**Where**: `packages/infrastructure-sqlite/src/queries/sqlite-ledger-queries.ts`
**Depends on**: T18
**Reuses**: `LedgerQueries`, DTOs e `normalBalanceOf`.
**Requirement**: FSP-44, FSP-45, FSP-46, FSP-47, FSP-48, FSP-49, FSP-50

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`

**Done when**:

- [ ] Balance respeita asOf, book/account e moeda-base vazia.
- [ ] Cinco account kinds recebem sinal visual correto.
- [ ] Statement calcula running balance ascendente e retorna descendente.
- [ ] Mesmo dia ordena por sequência numérica, não ID.
- [ ] Original/reversão permanecem visíveis e se anulam.
- [ ] Acumulador BigInt evita SUM overflow e serializa exato.
- [ ] Treze testes de integração passam.
- [ ] Test count: 13 novos casos; nenhum teste removido.

**Tests**: integration
**Gate**: full
**Commit**: `feat(sqlite): query ledger balances`

---

### T20: Criar contracts compartilhados de repositories e queries

**What**: Executar um único conjunto de expectativas contra factories memory e SQLite para os três repositories e LedgerQueries.
**Where**: `packages/infrastructure-sqlite/tests/contracts/persistence-contracts.test.ts`
**Depends on**: T19
**Reuses**: 38 cenários existentes de repository/query e factories dos dois adapters.
**Requirement**: FSP-28, FSP-30, FSP-31, FSP-33, FSP-34, FSP-35, FSP-36, FSP-44, FSP-45, FSP-46, FSP-47, FSP-48, FSP-49, FSP-50, FSP-53, FSP-55

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`

**Done when**:

- [ ] Uma mesma função de contrato recebe apenas a factory abstrata.
- [ ] Memory e SQLite executam as mesmas assertions e outcomes da spec.
- [ ] Contracts não inspecionam SQL nem classe concreta.
- [ ] 38 cenários são definidos e executados duas vezes: 76 casos passam.
- [ ] Os 164 testes memory preexistentes continuam passando.
- [ ] Test count: 76 execuções compartilhadas; nenhum teste removido.

**Tests**: integration
**Gate**: full
**Commit**: `test(sqlite): share persistence contracts`

---

### T21: Compartilhar contratos de criação de livro e contas

**What**: Parametrizar os cenários atuais de CreateFinancialBook, contas e categorias sobre os dois adapters.
**Where**: `packages/infrastructure-sqlite/tests/contracts/book-account-use-cases.test.ts`
**Depends on**: T20
**Reuses**: 29 cenários existentes e deterministic adapters de infrastructure-memory.
**Requirement**: FSP-42, FSP-43, FSP-54

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`

**Done when**:

- [ ] Outputs, errors, system accounts, facts e rollback usam assertions idênticas.
- [ ] Inspeção ocorre via ports e IDs determinísticos, não por internals SQLite.
- [ ] 29 cenários são definidos e executados duas vezes: 58 casos passam.
- [ ] Tests memory originais permanecem intactos e verdes.
- [ ] Test count: 58 execuções compartilhadas; nenhum teste removido.

**Tests**: integration
**Gate**: full
**Commit**: `test(sqlite): share book account use cases`

---

### T22: Compartilhar contratos de receita, despesa e saldo inicial

**What**: Parametrizar RecordExpense, RecordIncome e SetOpeningBalance contra memory e SQLite.
**Where**: `packages/infrastructure-sqlite/tests/contracts/cash-flow-use-cases.test.ts`
**Depends on**: T21
**Reuses**: 29 cenários atuais desses três casos de uso.
**Requirement**: FSP-37, FSP-38, FSP-42, FSP-43, FSP-48, FSP-54

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`

**Done when**:

- [ ] Postings, sinais, erros, fatos e ausência de partial writes são idênticos.
- [ ] Repetição de saldo inicial e sequência transacional são cobertas.
- [ ] 29 cenários são definidos e executados duas vezes: 58 casos passam.
- [ ] Tests memory originais permanecem intactos e verdes.
- [ ] Test count: 58 execuções compartilhadas; nenhum teste removido.

**Tests**: integration
**Gate**: full
**Commit**: `test(sqlite): share cash flow use cases`

---

### T23: Compartilhar contratos de transferência, reversão e ordenação

**What**: Parametrizar matrix de contas, TransferMoney, ReverseJournalEntry e metadata de ordem sobre os dois adapters.
**Where**: `packages/infrastructure-sqlite/tests/contracts/transfer-reversal-use-cases.test.ts`
**Depends on**: T22
**Reuses**: 23 cenários atuais desses fluxos.
**Requirement**: FSP-35, FSP-37, FSP-38, FSP-42, FSP-43, FSP-47, FSP-49, FSP-54

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`

**Done when**:

- [ ] Combinações ASSET/LIABILITY, links, posting order e fatos são idênticos.
- [ ] Conflito, data inválida, reversão dupla e rollback não deixam partial state.
- [ ] 23 cenários são definidos e executados duas vezes: 46 casos passam.
- [ ] Tests memory originais permanecem intactos e verdes.
- [ ] Test count: 46 execuções compartilhadas; nenhum teste removido.

**Tests**: integration
**Gate**: full
**Commit**: `test(sqlite): share transfer reversal use cases`

---

### T24: Compartilhar contratos dos query use cases

**What**: Parametrizar GetAccountBalance e GetAccountStatement contra memory e SQLite.
**Where**: `packages/infrastructure-sqlite/tests/contracts/query-use-cases.test.ts`
**Depends on**: T23
**Reuses**: 16 cenários atuais dos dois query use cases.
**Requirement**: FSP-44, FSP-45, FSP-46, FSP-47, FSP-48, FSP-49, FSP-50, FSP-54

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`

**Done when**:

- [ ] DTOs, signs, asOf, ordering, running balance, reversals e isolamento são idênticos.
- [ ] Values acima de Number.MAX_SAFE_INTEGER permanecem strings exatas.
- [ ] 16 cenários são definidos e executados duas vezes: 32 casos passam.
- [ ] Tests memory originais permanecem intactos e verdes.
- [ ] Test count: 32 execuções compartilhadas; nenhum teste removido.

**Tests**: integration
**Gate**: full
**Commit**: `test(sqlite): share query use cases`

---

### T25: Fechar API pública e gates do workspace

**What**: Exportar somente adapters neutros, adicionar prova estrutural de boundary e executar todos os gates finais.
**Where**: `packages/infrastructure-sqlite/src/index.ts`
**Depends on**: T24
**Reuses**: Entry points dos pacotes existentes e AD-004.
**Requirement**: FSP-01, FSP-02, FSP-03, FSP-05, FSP-57, FSP-58

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`

**Done when**:

- [ ] Contratos, initialization, migrations, repositories, queries e manager necessários estão exportados.
- [ ] Mappers internos, fixtures e BetterSqliteDatabase não estão exportados nem em dist.
- [ ] Testes estruturais rejeitam imports proibidos e dependência Node no grafo de produção.
- [ ] Quatro novos testes estruturais passam.
- [ ] Build, lint, typecheck e tests do workspace completo passam.
- [ ] Baseline de 164 memory tests permanece e nenhum teste está skipped.
- [ ] Spec traceability passa para Implementing apenas durante execução; não há status antecipado.
- [ ] Test count: 4 novos casos; nenhum teste removido.

**Tests**: unit/structural
**Gate**: build
**Commit**: `feat(sqlite): expose platform neutral api`

---

## Phase Execution Map

```text
Phase 1: T1 → T2 → T3 → T4 → T5 → T6 → T7 → T8
Phase 2: T9 → T10 → T11 → T12 → T13 → T14 → T15
Phase 3: T16 → T17 → T18
Phase 4: T19 → T20 → T21 → T22 → T23 → T24 → T25
```

Cross-phase dependencies are the last task of the previous phase to the first task of the next phase: T8→T9, T15→T16 and T18→T19.

The plan contains 25 tasks in four phases. Execute must pack whole phases into task-budgeted batches and offer sub-agents before implementation because the feature exceeds one batch.

---

## Task Granularity Check

| Task | Scope | Status |
| --- | --- | --- |
| T1 | One package scaffold/config bundle | ✅ Cohesive |
| T2 | One driver contract family | ✅ Cohesive |
| T3 | One generator command | ✅ Granular |
| T4 | One test driver class | ✅ Granular |
| T5 | One connection configurator | ✅ Granular |
| T6 | One migration runner | ✅ Granular |
| T7 | One SQL migration | ✅ Granular |
| T8 | One initialization function | ✅ Granular |
| T9 | One error-mapping module | ✅ Granular |
| T10 | One mapper | ✅ Granular |
| T11 | One repository | ✅ Granular |
| T12 | One mapper | ✅ Granular |
| T13 | One repository | ✅ Granular |
| T14 | One mapper | ✅ Granular |
| T15 | One repository | ✅ Granular |
| T16 | One fact collector | ✅ Granular |
| T17 | One context factory | ✅ Granular |
| T18 | One transaction manager | ✅ Granular |
| T19 | One query adapter | ✅ Granular |
| T20 | One persistence contract harness | ✅ Granular |
| T21 | One book/account contract family | ✅ Cohesive |
| T22 | One cash-flow contract family | ✅ Cohesive |
| T23 | One transfer/reversal contract family | ✅ Cohesive |
| T24 | One query-use-case contract family | ✅ Cohesive |
| T25 | One public entrypoint/boundary | ✅ Cohesive |

---

## Diagram-Definition Cross-Check

| Task | Depends On (task body) | Diagram Shows | Status |
| --- | --- | --- | --- |
| T1 | None | Start | ✅ Match |
| T2 | T1 | T1→T2 | ✅ Match |
| T3 | T2 | T2→T3 | ✅ Match |
| T4 | T3 | T3→T4 | ✅ Match |
| T5 | T4 | T4→T5 | ✅ Match |
| T6 | T5 | T5→T6 | ✅ Match |
| T7 | T6 | T6→T7 | ✅ Match |
| T8 | T7 | T7→T8 | ✅ Match |
| T9 | T8 | Cross-phase T8→T9 | ✅ Match |
| T10 | T9 | T9→T10 | ✅ Match |
| T11 | T10 | T10→T11 | ✅ Match |
| T12 | T11 | T11→T12 | ✅ Match |
| T13 | T12 | T12→T13 | ✅ Match |
| T14 | T13 | T13→T14 | ✅ Match |
| T15 | T14 | T14→T15 | ✅ Match |
| T16 | T15 | Cross-phase T15→T16 | ✅ Match |
| T17 | T16 | T16→T17 | ✅ Match |
| T18 | T17 | T17→T18 | ✅ Match |
| T19 | T18 | Cross-phase T18→T19 | ✅ Match |
| T20 | T19 | T19→T20 | ✅ Match |
| T21 | T20 | T20→T21 | ✅ Match |
| T22 | T21 | T21→T22 | ✅ Match |
| T23 | T22 | T22→T23 | ✅ Match |
| T24 | T23 | T23→T24 | ✅ Match |
| T25 | T24 | T24→T25 | ✅ Match |

---

## Test Co-location Validation

| Task | Code Layer Created/Modified | Matrix Requires | Task Says | Status |
| --- | --- | --- | --- | --- |
| T1 | Package config | none/build | none/build | ✅ OK |
| T2 | Type-only contracts | none/build | none/build | ✅ OK |
| T3 | Migration generator | unit | unit | ✅ OK |
| T4 | Node driver | integration | integration | ✅ OK |
| T5 | Connection config | integration | integration | ✅ OK |
| T6 | Migration runner | integration | integration | ✅ OK |
| T7 | SQL schema | integration | integration | ✅ OK |
| T8 | Database initialization | integration | integration | ✅ OK |
| T9 | Error mapping | unit | unit | ✅ OK |
| T10 | FinancialBook mapper | unit | unit | ✅ OK |
| T11 | FinancialBook repository | integration | integration | ✅ OK |
| T12 | LedgerAccount mapper | unit | unit | ✅ OK |
| T13 | LedgerAccount repository | integration | integration | ✅ OK |
| T14 | Journal mapper | unit | unit | ✅ OK |
| T15 | Journal repository | integration | integration | ✅ OK |
| T16 | Fact collector | unit | unit | ✅ OK |
| T17 | Context factory | unit | unit | ✅ OK |
| T18 | Transaction manager | integration | integration | ✅ OK |
| T19 | Ledger queries | integration | integration | ✅ OK |
| T20 | Persistence contracts | integration | integration | ✅ OK |
| T21 | Book/account use-case contracts | integration | integration | ✅ OK |
| T22 | Cash-flow use-case contracts | integration | integration | ✅ OK |
| T23 | Transfer/reversal contracts | integration | integration | ✅ OK |
| T24 | Query use-case contracts | integration | integration | ✅ OK |
| T25 | Public API boundary | unit/structural | unit/structural | ✅ OK |

No production task defers its required tests. T20–T24 are independent cross-adapter contract deliverables required by FSP-53/FSP-54, not deferred tests for an earlier component.
