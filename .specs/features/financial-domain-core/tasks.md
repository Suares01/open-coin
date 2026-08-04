# Tarefas do Núcleo Financeiro

## Execution Protocol (MANDATORY -- do not skip)

Implemente estas tarefas com a skill `tlc-spec-driven`: ative-a por nome e siga o fluxo Execute e as Critical Rules. A skill é a fonte de verdade para ciclo por tarefa, commits atômicos, batches, Verifier e discrimination sensor.

Se a skill não puder ser ativada, pare e informe o usuário. Não prossiga sem ela.

---

**Design**: `.specs/features/financial-domain-core/design.md`
**Status**: Completed (v1.0.0); Amendment Pending (v1.1.0)
**Feature version**: 1.1.0
**Implementation commit range (v1.0.0)**: `d1c1c79^..570afc1`
**Validation date (v1.0.0)**: 2026-08-04

---

## Test Coverage Matrix

> Gerada a partir do código, do design e da especificação. Guidelines encontradas: nenhuma; defaults fortes aplicados. O repositório não possui testes ou runner anteriores. Estratégia de testes e Vitest foram confirmados pelo usuário em 2026-08-04.

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| --- | --- | --- | --- | --- |
| Configuração de pacote e build | none | Build, lint e typecheck sem erros | `package.json`, `turbo.json`, `packages/*/*.json` | `pnpm build && pnpm lint && pnpm check-types` |
| Value objects e shared kernel | unit | Todas as branches; mapeamento 1:1 dos ACs; erros e limites exatos | `packages/domain/src/**/*.test.ts` | `pnpm --filter @open-coin/domain test` |
| Agregados e serviços de domínio | unit | Todas as invariantes; 1:1 dos ACs; todos os edge cases | `packages/domain/src/**/*.test.ts` | `pnpm --filter @open-coin/domain test` |
| Portas e tipos sem runtime | none | Build gate; compatibilidade estrutural pelo compilador | `packages/application/src/ports/**/*.ts` | `pnpm --filter @open-coin/application check-types` |
| Dispatcher e fronteira de aplicação | unit | Commit-before-publish, envelopes determinísticos e mapeamento de todos os erros | `packages/application/src/**/*.test.ts` | `pnpm --filter @open-coin/application test` |
| Repositórios e transação em memória | integration | Contratos, cópia, duplicidade, concorrência e rollback | `packages/infrastructure-memory/src/**/*.test.ts` | `pnpm --filter @open-coin/infrastructure-memory test` |
| Casos de uso com adapters em memória | integration | Todos os caminhos felizes, erros e efeitos; 1:1 dos ACs | `packages/infrastructure-memory/src/use-cases/**/*.test.ts` | `pnpm --filter @open-coin/infrastructure-memory test` |
| Queries e read models em memória | integration | Datas-limite, sinais, ordem intradiária por sequência, isolamento, reversões e saldos correntes | `packages/infrastructure-memory/src/queries/**/*.test.ts` | `pnpm --filter @open-coin/infrastructure-memory test` |

## Gate Check Commands

> Os comandos passam a existir na T1/T2 e tornam-se obrigatórios a partir da tarefa que cria o pacote correspondente.

| Gate Level | When to Use | Command |
| --- | --- | --- |
| Quick domain | Após tarefa de domínio | `pnpm exec turbo run test lint check-types --filter=@open-coin/domain` |
| Quick application | Após tarefa isolada de aplicação | `pnpm exec turbo run test lint check-types --filter=@open-coin/application...` |
| Full | Após repositories, casos de uso ou queries cross-layer | `pnpm exec turbo run test lint check-types --filter=@open-coin/infrastructure-memory...` |
| Build | Após configuração e ao fim de cada fase | `pnpm build && pnpm lint && pnpm check-types && pnpm test` |

---

## Execution Plan

As fases e tarefas são estritamente sequenciais.

### Phase 1: Tooling e shared kernel

```text
T1 -> T2 -> T3 -> T4 -> T5 -> T6
```

### Phase 2: Agregados e ledger

```text
T7 -> T8 -> T9 -> T10 -> T11 -> T12
```

### Phase 3: Portas e infraestrutura em memória

```text
T13 -> T14 -> T15 -> T16 -> T17 -> T18 -> T19 -> T20 -> T21
```

### Phase 4: Criação e fluxo financeiro

```text
T22 -> T23 -> T24 -> T25 -> T26 -> T27 -> T28
```

### Phase 5: Transferência, reversão e consultas

```text
T29 -> T30 -> T31 -> T32 -> T33
```

### Phase 6: Emenda de integridade antes do SQLite

```text
T34 -> T35 -> T36 -> T37 -> T38 -> T39 -> T40 -> T41
```

---

## Task Breakdown

### Phase 1: Tooling e shared kernel

### T1: Configurar o toolchain raiz

**What**: Adicionar Node 20, script raiz de testes, Vitest 4 e a task `test` do Turbo com dependências de build.
**Where**: repositório raiz
**Depends on**: None
**Reuses**: `package.json`, `turbo.json`, pnpm workspace e `.gitignore` existentes.
**Requirement**: FDC-05

**Tools**: MCP `NONE`; Skill `tlc-spec-driven`.

**Done when**:

- [x] Engine raiz exige Node `>=20` e scripts `test`/gates estão declarados.
- [x] Turbo conhece `test` e executa builds das dependências antes dos testes.
- [x] Lockfile está consistente com o manifesto.
- [x] Build gate passa; nenhum teste existe ainda.

**Tests**: build-only (matrix: none)
**Gate**: Build
**Commit**: `chore(tooling): configure domain test pipeline`

### T2: Criar o pacote domain

**What**: Criar a biblioteca ESM compilada `@open-coin/domain` com TypeScript estrito, ESLint, Vitest e API pública vazia.
**Where**: `packages/domain/`
**Depends on**: T1
**Reuses**: `@repo/typescript-config` e `@repo/eslint-config`.
**Requirement**: FDC-05

**Tools**: MCP `NONE`; Skill `tlc-spec-driven`.

**Done when**:

- [x] Package scripts `build`, `lint`, `check-types` e `test` executam.
- [x] Build produz ESM e declarações em `dist`.
- [x] API pública não exporta dependência de framework ou infraestrutura.
- [x] Build gate passa; nenhum teste comportamental é exigido.

**Tests**: build-only (matrix: none)
**Gate**: Build
**Commit**: `chore(domain): scaffold domain package`

### T3: Implementar bases do domínio

**What**: Implementar `Entity`, `AggregateRoot`, fatos de domínio, snapshots, `DomainError` e `Result`.
**Where**: `packages/domain/src/shared/kernel/`
**Depends on**: T2
**Reuses**: Nenhum código de domínio existente.
**Requirement**: FDC-04, FDC-05, FDC-57

**Tools**: MCP `NONE`; Skill `tlc-spec-driven`.

**Done when**:

- [x] Entidades comparam identidade sem expor mutação de ID.
- [x] Agregados acumulam e retiram fatos sem incluí-los em snapshots.
- [x] Erros possuem códigos estáveis e `Result` é discriminado.
- [x] Pelo menos 7 testes direcionados passam e o build do pacote permanece puro.

**Tests**: unit
**Gate**: Quick domain
**Commit**: `feat(domain): add domain kernel primitives`

### T4: Implementar identificadores e moeda

**What**: Implementar branded IDs, `Currency` e conversores determinísticos de strings.
**Where**: `packages/domain/src/shared/identity/`
**Depends on**: T3
**Reuses**: `DomainError` e bases do shared kernel.
**Requirement**: FDC-02, FDC-04, FDC-07

**Tools**: MCP `NONE`; Skill `tlc-spec-driven`.

**Done when**:

- [x] IDs incompatíveis não são atribuíveis entre si em TypeScript.
- [x] `Currency` aceita exatamente três letras ASCII maiúsculas.
- [x] Igualdade e rejeição de moeda inválida têm testes exatos.
- [x] Pelo menos 6 testes direcionados passam sem redução da suíte.

**Tests**: unit
**Gate**: Quick domain
**Commit**: `feat(domain): add identifiers and currency`

### T5: Implementar Money

**What**: Implementar `Money` com `bigint`, aritmética imutável e proteção de moeda.
**Where**: `packages/domain/src/shared/money.ts`
**Depends on**: T4
**Reuses**: `Currency`, `DomainError` e `CURRENCY_MISMATCH`.
**Requirement**: FDC-01, FDC-02

**Tools**: MCP `NONE`; Skill `tlc-spec-driven`.

**Done when**:

- [x] Criação, zero, soma, subtração, negação, absoluto e igualdade usam somente `bigint`.
- [x] Operações entre moedas diferentes retornam o erro exato.
- [x] Inputs não sofrem mutação.
- [x] Pelo menos 9 testes direcionados cobrem todas as branches.

**Tests**: unit
**Gate**: Quick domain
**Commit**: `feat(domain): implement money value object`

### T6: Implementar LocalDate

**What**: Implementar data financeira local estrita no formato `YYYY-MM-DD`.
**Where**: `packages/domain/src/shared/local-date.ts`
**Depends on**: T5
**Reuses**: `DomainError` do shared kernel.
**Requirement**: FDC-03

**Tools**: MCP `NONE`; Skill `tlc-spec-driven`.

**Done when**:

- [x] Datas válidas preservam o valor textual e ordenam lexicograficamente.
- [x] Formatos inválidos, dias impossíveis e anos não bissextos são rejeitados.
- [x] Ano bissexto válido é aceito.
- [x] Pelo menos 8 testes direcionados cobrem limites de calendário.

**Tests**: unit
**Gate**: Quick domain
**Commit**: `feat(domain): implement local date value object`

### Phase 2: Agregados e ledger

### T7: Implementar FinancialBook

**What**: Implementar criação, restauração e snapshot do agregado `FinancialBook`.
**Where**: `packages/domain/src/book/financial-book.ts`
**Depends on**: T6
**Reuses**: Shared kernel, `BookId`, `Currency` e `DomainError`.
**Requirement**: FDC-06, FDC-07, FDC-10

**Tools**: MCP `NONE`; Skill `tlc-spec-driven`.

**Done when**:

- [x] Nome usa `trim`, timezone não vazio e versão inicial é zero.
- [x] Moeda-base não possui transição de alteração.
- [x] Snapshot/restauração preservam valor e não preservam fatos pendentes.
- [x] Pelo menos 7 testes direcionados passam.

**Tests**: unit
**Gate**: Quick domain
**Commit**: `feat(domain): implement financial book aggregate`

### T8: Implementar LedgerAccount

**What**: Implementar contas, categorias, normal balance, normalização de nome e proteção de contas de sistema.
**Where**: `packages/domain/src/ledger/accounts/`
**Depends on**: T7
**Reuses**: Shared kernel e `BookId`.
**Requirement**: FDC-12, FDC-13, FDC-14, FDC-15, FDC-16, FDC-17

**Tools**: MCP `NONE`; Skill `tlc-spec-driven`.

**Done when**:

- [x] Tipos, papéis financeiro/categoria e normal balance retornam valores exatos.
- [x] Nome, status, versão e normalized name seguem a especificação.
- [x] Conta de sistema rejeita arquivamento ou mudança de tipo sem mutação.
- [x] Snapshot/restauração preservam todos os campos.
- [x] Pelo menos 13 testes direcionados cobrem todas as branches.

**Tests**: unit
**Gate**: Quick domain
**Commit**: `feat(domain): implement ledger account aggregate`

### T9: Implementar Posting

**What**: Implementar a entidade imutável `Posting` com snapshot e reversão exata.
**Where**: `packages/domain/src/ledger/journal/posting.ts`
**Depends on**: T8
**Reuses**: `Money`, `PostingId` e `LedgerAccountId`.
**Requirement**: FDC-20, FDC-35

**Tools**: MCP `NONE`; Skill `tlc-spec-driven`.

**Done when**:

- [x] Valor zero retorna `ZERO_POSTING_AMOUNT`.
- [x] Reversão preserva conta e moeda e nega exatamente o valor.
- [x] Snapshot/restauração não compartilham estado mutável.
- [x] Pelo menos 5 testes direcionados passam.

**Tests**: unit
**Gate**: Quick domain
**Commit**: `feat(domain): implement posting entity`

### T10: Implementar invariantes de JournalEntry

**What**: Implementar registro e restauração de lançamentos imutáveis e balanceados.
**Where**: `packages/domain/src/ledger/journal/journal-entry.ts`
**Depends on**: T9
**Reuses**: `Posting`, `Money`, `Currency`, `LocalDate` e aggregate root.
**Requirement**: FDC-18, FDC-19, FDC-20, FDC-21, FDC-22, FDC-24, FDC-31

**Tools**: MCP `NONE`; Skill `tlc-spec-driven`.

**Done when**:

- [x] Menos de dois postings ou contas distintas retorna o código exato.
- [x] Moeda diferente da moeda do lançamento e soma não zero são rejeitadas.
- [x] Descrição vazia é rejeitada e campos financeiros não possuem setters.
- [x] Snapshot/restauração preservam postings sem compartilhar arrays.
- [x] Pelo menos 11 testes direcionados cobrem todas as invariantes.

**Tests**: unit
**Gate**: Quick domain
**Commit**: `feat(domain): enforce journal entry invariants`

### T11: Implementar reversão de JournalEntry

**What**: Adicionar criação de reversor e vínculo de reversão ao agregado de journal.
**Where**: `packages/domain/src/ledger/journal/journal-entry.ts`
**Depends on**: T10
**Reuses**: `Posting.reverse` e versionamento do aggregate root.
**Requirement**: FDC-35, FDC-36, FDC-37, FDC-38

**Tools**: MCP `NONE`; Skill `tlc-spec-driven`.

**Done when**:

- [x] Reversor possui valores exatamente opostos, `reversalOf` e nova identidade.
- [x] Original recebe `reversedBy`, incrementa versão e preserva seus postings.
- [x] Segunda reversão retorna `JOURNAL_ENTRY_ALREADY_REVERSED` sem mutação.
- [x] Pelo menos 7 testes direcionados passam.

**Tests**: unit
**Gate**: Quick domain
**Commit**: `feat(domain): add journal entry reversal`

### T12: Implementar JournalEntryFactory

**What**: Implementar factories de saldo inicial, despesa, receita e transferência com postings exatos.
**Where**: `packages/domain/src/ledger/journal/journal-entry-factory.ts`
**Depends on**: T11
**Reuses**: `FinancialBook`, papéis de `LedgerAccount`, `JournalEntry` e `Posting`.
**Requirement**: FDC-25, FDC-26, FDC-27, FDC-28, FDC-29, FDC-30, FDC-32, FDC-33, FDC-34

**Tools**: MCP `NONE`; Skill `tlc-spec-driven`.

**Done when**:

- [x] Saldo inicial de ativo e passivo usa sinais contábeis opostos corretos.
- [x] Despesa e receita criam os dois postings exatos.
- [x] Transferência usa somente origem e destino, sem categoria.
- [x] Papel inválido, valor não positivo e conta de destino igual são rejeitados.
- [x] Pelo menos 12 testes direcionados passam.

**Tests**: unit
**Gate**: Quick domain
**Commit**: `feat(domain): add journal entry factory`

### Phase 3: Portas e infraestrutura em memória

### T13: Criar o pacote application

**What**: Criar a biblioteca ESM `@open-coin/application` dependente somente de domain.
**Where**: `packages/application/`
**Depends on**: T12
**Reuses**: Toolchain do pacote domain.
**Requirement**: FDC-05, FDC-45, FDC-46

**Tools**: MCP `NONE`; Skill `tlc-spec-driven`.

**Done when**:

- [x] Package compila, tipa e linta com dependência unidirecional para domain.
- [x] Scripts do pacote estão integrados ao Turbo.
- [x] API pública inicial não exporta adapters.
- [x] Build gate passa; nenhum comportamento existe ainda.

**Tests**: build-only (matrix: none)
**Gate**: Build
**Commit**: `chore(application): scaffold application package`

### T14: Definir contratos da aplicação

**What**: Definir repositories, queries, transaction manager, clock, IDs, publisher, commands/DTO primitives e erros públicos.
**Where**: `packages/application/src/ports/`
**Depends on**: T13
**Reuses**: Tipos públicos de domain.
**Requirement**: FDC-04, FDC-45, FDC-46, FDC-50, FDC-57

**Tools**: MCP `NONE`; Skill `tlc-spec-driven`.

**Done when**:

- [x] Repositories existem apenas para três aggregate roots.
- [x] `LedgerQueries` retorna views e não agregados.
- [x] Commands e DTOs não contêm `Money`, `LocalDate`, `bigint` ou entidades.
- [x] Contratos compilam sem import de infraestrutura.

**Tests**: build-only (matrix: none)
**Gate**: Quick application
**Commit**: `feat(application): define core application ports`

### T15: Implementar dispatcher e fronteira de erro

**What**: Implementar executor de caso de uso, envelopamento pós-commit e publicação determinística de fatos de domínio.
**Where**: `packages/application/src/core/`
**Depends on**: T14
**Reuses**: `Result`, `Clock`, `IdGenerator` e `DomainEventPublisher`.
**Requirement**: FDC-04, FDC-51, FDC-56, FDC-57, FDC-58

**Tools**: MCP `NONE`; Skill `tlc-spec-driven`.

**Done when**:

- [x] Erro interno esperado ou inesperado vira `Result.fail` estável.
- [x] Fatos só são envelopados e publicados após callback transacional bem-sucedido.
- [x] Falha publica zero eventos.
- [x] Clock e ID generator fixos produzem envelopes idênticos.
- [x] Pelo menos 8 testes unitários passam.

**Tests**: unit
**Gate**: Quick application
**Commit**: `feat(application): add use case execution boundary`

### T16: Criar store e pacote infrastructure-memory

**What**: Criar `@open-coin/infrastructure-memory` e um store de snapshots isolados com snapshot/restore.
**Where**: `packages/infrastructure-memory/`
**Depends on**: T15
**Reuses**: Toolchain dos pacotes internos e snapshots de domain.
**Requirement**: FDC-47, FDC-49

**Tools**: MCP `NONE`; Skill `tlc-spec-driven`.

**Done when**:

- [x] Package depende de application e domain sem criar ciclo.
- [x] Store guarda somente snapshots planos e copia coleções no snapshot/restore.
- [x] Mutar um snapshot externo não altera o store.
- [x] Pelo menos 5 testes de integração passam.

**Tests**: integration
**Gate**: Full
**Commit**: `feat(memory): add isolated in-memory store`

### T17: Implementar FinancialBookRepository em memória

**What**: Implementar persistência, reidratação, duplicidade e concorrência de livros.
**Where**: `packages/infrastructure-memory/src/repositories/in-memory-financial-book-repository.ts`
**Depends on**: T16
**Reuses**: Store e snapshots de `FinancialBook`.
**Requirement**: FDC-47, FDC-48, FDC-50

**Tools**: MCP `NONE`; Skill `tlc-spec-driven`.

**Done when**:

- [x] Add/find/save satisfazem o repository contract.
- [x] Alterar agregado carregado sem `save` não muda o persistido.
- [x] ID duplicado e versão divergente preservam o snapshot anterior.
- [x] Pelo menos 6 testes de contrato passam.

**Tests**: integration
**Gate**: Full
**Commit**: `feat(memory): implement financial book repository`

### T18: Implementar LedgerAccountRepository em memória

**What**: Implementar persistência, buscas por propósito/nome, duplicidade e concorrência de contas.
**Where**: `packages/infrastructure-memory/src/repositories/in-memory-ledger-account-repository.ts`
**Depends on**: T17
**Reuses**: Store, normalização e snapshots de `LedgerAccount`.
**Requirement**: FDC-17, FDC-47, FDC-48, FDC-50

**Tools**: MCP `NONE`; Skill `tlc-spec-driven`.

**Done when**:

- [x] Add/find/save e busca por system purpose retornam cópias reidratadas.
- [x] Busca de nome respeita livro, tipo e normalized name.
- [x] Duplicidade e conflito preservam o snapshot anterior.
- [x] Pelo menos 8 testes de contrato passam.

**Tests**: integration
**Gate**: Full
**Commit**: `feat(memory): implement ledger account repository`

### T19: Implementar JournalEntryRepository em memória

**What**: Implementar persistência, reidratação, duplicidade e concorrência de lançamentos.
**Where**: `packages/infrastructure-memory/src/repositories/in-memory-journal-entry-repository.ts`
**Depends on**: T18
**Reuses**: Store e snapshots de `JournalEntry`.
**Requirement**: FDC-31, FDC-47, FDC-48, FDC-50

**Tools**: MCP `NONE`; Skill `tlc-spec-driven`.

**Done when**:

- [x] Add/find/save preservam postings e vínculos de reversão.
- [x] Alteração carregada sem `save` não vaza para o store.
- [x] Duplicidade e conflito preservam o snapshot anterior.
- [x] Pelo menos 7 testes de contrato passam.

**Tests**: integration
**Gate**: Full
**Commit**: `feat(memory): implement journal entry repository`

### T20: Implementar TransactionManager em memória

**What**: Implementar transação atômica sobre todos os repositories do store.
**Where**: `packages/infrastructure-memory/src/transaction/in-memory-transaction-manager.ts`
**Depends on**: T19
**Reuses**: Snapshot/restore do store e repository context.
**Requirement**: FDC-09, FDC-36, FDC-49, FDC-56

**Tools**: MCP `NONE`; Skill `tlc-spec-driven`.

**Done when**:

- [x] Callback bem-sucedido preserva todas as alterações.
- [x] Erro após uma ou várias escritas restaura todos os repositories.
- [x] Erro original é propagado para a fronteira da aplicação.
- [x] Pelo menos 5 testes de rollback passam.

**Tests**: integration
**Gate**: Full
**Commit**: `feat(memory): implement transaction manager`

### T21: Implementar adapters determinísticos

**What**: Implementar `FixedClock`, `SequentialIdGenerator` e `CollectingDomainEventPublisher`.
**Where**: `packages/infrastructure-memory/src/testing/`
**Depends on**: T20
**Reuses**: Portas da aplicação e envelopes de eventos.
**Requirement**: FDC-04, FDC-51, FDC-58

**Tools**: MCP `NONE`; Skill `tlc-spec-driven`.

**Done when**:

- [x] Clock retorna instante e data local fixos.
- [x] Gerador produz IDs branded previsíveis por tipo e IDs de evento previsíveis.
- [x] Publisher coleta envelopes em ordem sem falhar.
- [x] Pelo menos 6 testes direcionados passam.

**Tests**: integration
**Gate**: Full
**Commit**: `test(memory): add deterministic application adapters`

### Phase 4: Criação e fluxo financeiro

### T22: Implementar CreateFinancialBook

**What**: Criar livro, quatro contas de sistema e cinco eventos em uma única transação.
**Where**: `packages/application/src/book/create-financial-book.ts`
**Depends on**: T21
**Reuses**: Repositories, transaction manager, IDs, dispatcher e agregados.
**Requirement**: FDC-06, FDC-07, FDC-08, FDC-09, FDC-10, FDC-11, FDC-45, FDC-52

**Tools**: MCP `NONE`; Skill `tlc-spec-driven`.

**Done when**:

- [x] Command primitivo cria livro e propósitos/tipos exatos das quatro contas.
- [x] Falha intermediária deixa zero agregados e zero eventos.
- [x] Sucesso publica um `FinancialBookCreated` seguido de quatro `LedgerAccountCreated` após commit.
- [x] Output contém somente primitivos serializáveis.
- [x] Pelo menos 10 testes cross-layer passam.

**Tests**: integration
**Gate**: Full
**Commit**: `feat(application): create financial book`

### T23: Implementar CreateFinancialAccount

**What**: Criar conta `ASSET` ou `LIABILITY` com duplicidade normalizada e evento pós-commit.
**Where**: `packages/application/src/ledger/accounts/create-financial-account.ts`
**Depends on**: T22
**Reuses**: Fluxo transacional de criação de conta e dispatcher.
**Requirement**: FDC-11, FDC-13, FDC-14, FDC-17, FDC-45, FDC-53

**Tools**: MCP `NONE`; Skill `tlc-spec-driven`.

**Done when**:

- [x] Tipos financeiros válidos criam conta ativa versão zero.
- [x] Tipo inválido, livro ausente e nome normalizado duplicado falham sem escrita/evento.
- [x] Sucesso publica exatamente um `LedgerAccountCreated`.
- [x] Pelo menos 7 testes cross-layer passam.

**Tests**: integration
**Gate**: Full
**Commit**: `feat(application): create financial account`

### T24: Implementar CreateIncomeCategory

**What**: Criar categoria `INCOME` com validação de livro, nome e duplicidade.
**Where**: `packages/application/src/ledger/accounts/create-income-category.ts`
**Depends on**: T23
**Reuses**: Fluxo transacional de criação de conta.
**Requirement**: FDC-11, FDC-13, FDC-15, FDC-17, FDC-53

**Tools**: MCP `NONE`; Skill `tlc-spec-driven`.

**Done when**:

- [x] Categoria válida possui kind `INCOME`, status ativo e versão zero.
- [x] Livro ausente, nome vazio e duplicidade falham sem escrita/evento.
- [x] Sucesso publica exatamente um `LedgerAccountCreated`.
- [x] Pelo menos 6 testes cross-layer passam.

**Tests**: integration
**Gate**: Full
**Commit**: `feat(application): create income category`

### T25: Implementar CreateExpenseCategory

**What**: Criar categoria `EXPENSE` com validação de livro, nome e duplicidade.
**Where**: `packages/application/src/ledger/accounts/create-expense-category.ts`
**Depends on**: T24
**Reuses**: Fluxo transacional de criação de conta.
**Requirement**: FDC-11, FDC-13, FDC-15, FDC-17, FDC-53

**Tools**: MCP `NONE`; Skill `tlc-spec-driven`.

**Done when**:

- [x] Categoria válida possui kind `EXPENSE`, status ativo e versão zero.
- [x] Livro ausente, nome vazio e duplicidade falham sem escrita/evento.
- [x] Sucesso publica exatamente um `LedgerAccountCreated`.
- [x] Pelo menos 6 testes cross-layer passam.

**Tests**: integration
**Gate**: Full
**Commit**: `feat(application): create expense category`

### T26: Implementar SetOpeningBalance

**What**: Registrar saldo inicial de ativo ou passivo contra a conta de sistema correta.
**Where**: `packages/application/src/ledger/journal/set-opening-balance.ts`
**Depends on**: T25
**Reuses**: Journal factory, repositories, system purpose e dispatcher.
**Requirement**: FDC-11, FDC-21, FDC-23, FDC-25, FDC-26, FDC-27, FDC-45, FDC-54

**Tools**: MCP `NONE`; Skill `tlc-spec-driven`.

**Done when**:

- [x] Ativo e passivo geram os sinais exatos definidos no spec.
- [x] Conta inválida/inativa, livro/moeda divergente e valor não positivo falham sem escrita/evento.
- [x] Sucesso publica um `JournalEntryPosted` depois do commit.
- [x] Pelo menos 9 testes cross-layer passam.

**Tests**: integration
**Gate**: Full
**Commit**: `feat(application): set opening balance`

### T27: Implementar RecordExpense

**What**: Registrar despesa balanceada entre conta financeira e categoria `EXPENSE`.
**Where**: `packages/application/src/ledger/journal/record-expense.ts`
**Depends on**: T26
**Reuses**: Journal factory, validadores de conta e dispatcher.
**Requirement**: FDC-11, FDC-21, FDC-23, FDC-24, FDC-28, FDC-30, FDC-45, FDC-54

**Tools**: MCP `NONE`; Skill `tlc-spec-driven`.

**Done when**:

- [x] Sucesso persiste débito na despesa e crédito na conta financeira.
- [x] Papel, estado, livro, moeda, descrição e valor inválidos falham sem escrita/evento.
- [x] Output e evento contêm os valores serializáveis exatos.
- [x] Pelo menos 8 testes cross-layer passam.

**Tests**: integration
**Gate**: Full
**Commit**: `feat(application): record expense`

### T28: Implementar RecordIncome

**What**: Registrar receita balanceada entre conta financeira e categoria `INCOME`.
**Where**: `packages/application/src/ledger/journal/record-income.ts`
**Depends on**: T27
**Reuses**: Journal factory, validadores de conta e dispatcher.
**Requirement**: FDC-11, FDC-21, FDC-23, FDC-24, FDC-29, FDC-30, FDC-45, FDC-54

**Tools**: MCP `NONE`; Skill `tlc-spec-driven`.

**Done when**:

- [x] Sucesso persiste débito na conta financeira e crédito na receita.
- [x] Papel, estado, livro, moeda, descrição e valor inválidos falham sem escrita/evento.
- [x] Output e evento contêm os valores serializáveis exatos.
- [x] Pelo menos 8 testes cross-layer passam.

**Tests**: integration
**Gate**: Full
**Commit**: `feat(application): record income`

### Phase 5: Transferência, reversão e consultas

### T29: Implementar TransferMoney

**What**: Transferir valor entre duas contas financeiras sem afetar receita ou despesa.
**Where**: `packages/application/src/ledger/journal/transfer-money.ts`
**Depends on**: T28
**Reuses**: Journal factory, validadores de conta e dispatcher.
**Requirement**: FDC-11, FDC-21, FDC-23, FDC-24, FDC-32, FDC-33, FDC-34, FDC-45, FDC-54

**Tools**: MCP `NONE`; Skill `tlc-spec-driven`.

**Done when**:

- [x] Sucesso cria somente crédito na origem e débito no destino.
- [x] Mesma conta, papel, estado, livro, moeda, descrição ou valor inválido falha sem escrita/evento.
- [x] Categorias não aparecem no lançamento.
- [x] Pelo menos 9 testes cross-layer passam.

**Tests**: integration
**Gate**: Full
**Commit**: `feat(application): transfer money`

### T30: Implementar ReverseJournalEntry

**What**: Reverter atomicamente um lançamento, salvar vínculos e publicar os dois eventos exigidos.
**Where**: `packages/application/src/ledger/journal/reverse-journal-entry.ts`
**Depends on**: T29
**Reuses**: Repositório de journal, transaction manager, reversão do agregado e dispatcher.
**Requirement**: FDC-31, FDC-35, FDC-36, FDC-37, FDC-38, FDC-50, FDC-55, FDC-56

**Tools**: MCP `NONE`; Skill `tlc-spec-driven`.

**Done when**:

- [x] Reversor e original são persistidos atomicamente com vínculos exatos.
- [x] Postings originais permanecem byte-for-byte equivalentes nos snapshots.
- [x] Reversão repetida e conflito de versão falham sem estado parcial/evento.
- [x] Sucesso publica `JournalEntryPosted` e `JournalEntryReversed` após commit.
- [x] Pelo menos 9 testes cross-layer passam.

**Tests**: integration
**Gate**: Full
**Commit**: `feat(application): reverse journal entry`

### T31: Implementar LedgerQueries em memória

**What**: Derivar saldo bruto, saldo exibido e extrato ordenado dos postings armazenados.
**Where**: `packages/infrastructure-memory/src/queries/in-memory-ledger-queries.ts`
**Depends on**: T30
**Reuses**: Store, snapshots de journal e normal balance.
**Requirement**: FDC-39, FDC-40, FDC-41, FDC-42, FDC-44, FDC-46

**Tools**: MCP `NONE`; Skill `tlc-spec-driven`.

**Done when**:

- [x] Data-limite inclui somente postings até o dia solicitado.
- [x] Sinais exibidos seguem o normal balance de todos os cinco kinds.
- [x] Na baseline v1.0.0, running balance é calculado cronologicamente e o DTO final usa data/ID decrescentes.
- [x] Original e reversor aparecem e produzem efeito líquido zero.
- [x] Pelo menos 11 testes de integração passam.

**Tests**: integration
**Gate**: Full
**Commit**: `feat(memory): implement ledger queries`

### T32: Implementar GetAccountBalance

**What**: Validar escopo do livro e expor saldo serializável por data-limite.
**Where**: `packages/application/src/ledger/queries/get-account-balance.ts`
**Depends on**: T31
**Reuses**: Account repository, `LedgerQueries` e error boundary.
**Requirement**: FDC-39, FDC-40, FDC-43, FDC-45, FDC-57

**Tools**: MCP `NONE`; Skill `tlc-spec-driven`.

**Done when**:

- [x] Conta válida retorna string inteira, moeda e data-limite exatas.
- [x] Conta ausente ou de outro livro retorna `ENTITY_NOT_FOUND` sem consulta cruzada.
- [x] Ativo e passivo exibem sinais corretos.
- [x] Pelo menos 6 testes cross-layer passam.

**Tests**: integration
**Gate**: Full
**Commit**: `feat(application): query account balance`

### T33: Implementar GetAccountStatement e provar o recorte

**What**: Expor extrato serializável e fechar o teste vertical completo do primeiro recorte.
**Where**: `packages/application/src/ledger/queries/get-account-statement.ts`
**Depends on**: T32
**Reuses**: Account repository, `LedgerQueries`, todos os casos de uso e adapters em memória.
**Requirement**: FDC-39, FDC-40, FDC-41, FDC-42, FDC-43, FDC-44, FDC-45, FDC-58

**Tools**: MCP `NONE`; Skill `tlc-spec-driven`.

**Done when**:

- [x] DTO contém ID, data, descrição, valor e running balance como strings exatas.
- [x] Na baseline v1.0.0, ordenação por ID, isolamento e reversão atendem FDC-41 a FDC-44 então vigentes.
- [x] Teste vertical cria livro, duas contas, categoria, saldo inicial, despesa, receita, transferência e reversão e confere saldos/extrato finais.
- [x] Execução repetida com adapters fixos produz resultados e eventos equivalentes.
- [x] Pelo menos 10 testes cross-layer novos passam e o Build gate completo fica verde.

**Tests**: integration
**Gate**: Build
**Commit**: `feat(application): query account statement`

### Phase 6: Emenda de integridade antes do SQLite

### T34: Persistir metadata de ordem no JournalEntry

**What**: Adicionar `recordedAt` e `sequence` imutáveis ao agregado, snapshots, factories e reidratação de `JournalEntry`.
**Where**: `packages/domain/src/ledger/journal/`
**Depends on**: T33
**Reuses**: `JournalEntry.post`, `JournalEntry.restore`, snapshots planos e value objects existentes.
**Requirement**: FDC-63, FDC-64

**Tools**: MCP `NONE`; Skill `tlc-spec-driven`.

**Done when**:

- [x] Todo lançamento novo e reidratado preserva `recordedAt` ISO 8601 e `sequence` decimal.
- [x] Os campos não possuem setter e permanecem idênticos em cópias e reversões.
- [x] Testes unitários cobrem criação, reversão, snapshot, restore e entradas inválidas.
- [x] O Quick domain gate passa com ao menos 111 testes e sem excluir os 107 existentes.

**Tests**: unit
**Gate**: Quick domain
**Commit**: `feat(domain): add journal ordering metadata`

### T35: Reservar sequência monotônica por livro

**What**: Reservar a próxima sequência no `JournalEntryRepository` dentro da transação e integrar a metadata em todos os comandos que criam lançamentos.
**Where**: `packages/application/src/ledger/journal/`
**Depends on**: T34
**Reuses**: `Clock`, `JournalEntryRepository`, `TransactionManager` e factories de journal.
**Requirement**: FDC-42, FDC-63, FDC-64

**Tools**: MCP `NONE`; Skill `tlc-spec-driven`.

**Done when**:

- [x] Cada caso de uso obtém `recordedAt` do `Clock` e reserva uma sequência no repository dentro da transação.
- [x] Sequências são únicas, estritamente crescentes por `bookId` e independentes entre livros.
- [x] Falha ou rollback não publica evento nem reutiliza uma sequência já confirmada.
- [x] O Full gate passa com testes determinísticos de todos os comandos de journal.

**Tests**: integration
**Gate**: Full
**Commit**: `feat(application): reserve journal entry sequence`

### T36: Ordenar extrato pela sequência de registro

**What**: Substituir o desempate por ID pela ordem `occurredOn, sequence` no cálculo e no DTO do extrato.
**Where**: `packages/infrastructure-memory/src/queries/in-memory-ledger-queries.ts`
**Depends on**: T35
**Reuses**: `InMemoryStore`, cálculo atual de running balance e `AccountStatementItemView`.
**Requirement**: FDC-41, FDC-42, FDC-63, FDC-64

**Tools**: MCP `NONE`; Skill `tlc-spec-driven`.

**Done when**:

- [x] O cálculo usa `occurredOn ASC, sequence ASC` e o retorno usa a ordem inversa.
- [x] IDs fora de ordem lexical não alteram a ordem real de registro.
- [x] Saldos intermediários de quatro movimentações no mesmo dia correspondem à sequência confirmada.
- [x] O Full gate passa com ao menos três novos cenários de ordenação e sem regressão nos 264 testes existentes.

**Tests**: integration
**Gate**: Full
**Commit**: `fix(memory): order statements by journal sequence`

### T37: Impedir saldo inicial ativo duplicado

**What**: Consultar o saldo inicial ativo da conta e rejeitar uma segunda definição até que o lançamento anterior seja revertido.
**Where**: `packages/application/src/ledger/journal/set-opening-balance.ts`
**Depends on**: T36
**Reuses**: `JournalEntryRepository`, vínculos `reversedBy` e rollback transacional.
**Requirement**: FDC-25, FDC-26, FDC-27, FDC-59

**Tools**: MCP `NONE`; Skill `tlc-spec-driven`.

**Done when**:

- [x] Segundo saldo inicial ativo retorna `OPENING_BALANCE_ALREADY_SET` sem escrita ou evento.
- [x] Reverter o saldo inicial anterior permite criar um novo para a mesma conta.
- [x] Contas diferentes e livros diferentes mantêm isolamento.
- [x] O Full gate passa com caminhos feliz, duplicado, pós-reversão e rollback.

**Tests**: integration
**Gate**: Full
**Commit**: `fix(application): prevent duplicate opening balance`

### T38: Fechar regras temporais de reversão

**What**: Rejeitar reversão anterior ao lançamento original e impedir que um reversor seja revertido.
**Where**: `packages/domain/src/ledger/journal/journal-entry.ts`
**Depends on**: T37
**Reuses**: `LocalDate`, `reversalOf`, `reversedBy` e `DomainError`.
**Requirement**: FDC-35, FDC-36, FDC-37, FDC-38, FDC-60, FDC-61

**Tools**: MCP `NONE`; Skill `tlc-spec-driven`.

**Done when**:

- [ ] Data anterior falha com `REVERSAL_DATE_BEFORE_ORIGINAL` sem mutação.
- [ ] Alvo com `reversalOf` falha com `JOURNAL_ENTRY_REVERSAL_NOT_REVERSIBLE` sem mutação.
- [ ] Mesma data e data posterior continuam aceitas com postings opostos exatos.
- [ ] O Full gate passa com testes unitários e cross-layer para cada transição.

**Tests**: integration
**Gate**: Full
**Commit**: `fix(domain): guard journal reversal timeline`

### T39: Registrar a versão do agregado nos fatos

**What**: Adicionar `aggregateVersion` a `DomainFact` e capturar a versão exata em cada fato levantado pelos agregados.
**Where**: `packages/domain/src/`
**Depends on**: T38
**Reuses**: `AggregateRoot.recordFact`, versionamento dos agregados e testes de eventos existentes.
**Requirement**: FDC-52, FDC-53, FDC-54, FDC-55, FDC-66

**Tools**: MCP `NONE`; Skill `tlc-spec-driven`.

**Done when**:

- [ ] Todo `DomainFact` contém `aggregateVersion` no instante em que a transição produz o fato.
- [ ] Fatos de criação usam versão `0`; `JournalEntryReversed` usa a versão incrementada do original.
- [ ] Pull, cópia e persistência não alteram a versão capturada.
- [ ] O Quick domain gate passa com assertions exatas para todos os tipos de fato.

**Tests**: unit
**Gate**: Quick domain
**Commit**: `feat(domain): version aggregate facts`

### T40: Versionar envelopes de eventos

**What**: Adicionar `eventVersion` e mapear `aggregateVersion` na criação determinística dos envelopes.
**Where**: `packages/application/src/core/event-dispatcher.ts`
**Depends on**: T39
**Reuses**: `DomainEventDispatcher`, `DomainFact`, `Clock` e `IdGenerator`.
**Requirement**: FDC-51, FDC-52, FDC-53, FDC-54, FDC-55, FDC-65, FDC-66

**Tools**: MCP `NONE`; Skill `tlc-spec-driven`.

**Done when**:

- [ ] Todo evento existente sai com `eventVersion: 1`.
- [ ] `aggregateVersion` do envelope é igual ao valor imutável carregado pelo fato.
- [ ] Ordem de publicação e comportamento de rollback permanecem inalterados.
- [ ] O Full gate passa com assertions exatas para todos os tipos de evento.

**Tests**: unit
**Gate**: Full
**Commit**: `feat(application): version domain event envelopes`

### T41: Provar a matriz ASSET e LIABILITY

**What**: Adicionar cenários contábeis explícitos para despesas e todas as direções de transferência entre ativos e passivos.
**Where**: `packages/infrastructure-memory/src/use-cases/financial-account-kind-matrix.test.ts`
**Depends on**: T40
**Reuses**: Fixtures dos casos de uso, postings assinados e queries de saldo.
**Requirement**: FDC-28, FDC-32, FDC-34, FDC-62

**Tools**: MCP `NONE`; Skill `tlc-spec-driven`.

**Done when**:

- [ ] Despesa em `ASSET` e `LIABILITY` mantém débito na categoria e crédito na conta.
- [ ] Transferências `ASSET -> ASSET`, `ASSET -> LIABILITY`, `LIABILITY -> ASSET` e `LIABILITY -> LIABILITY` mantêm crédito na origem e débito no destino.
- [ ] Cada cenário confere postings, saldos exibidos e ausência de `INCOME`/`EXPENSE` em transferências.
- [ ] O Build gate passa com ao menos seis novos cenários e sem regressão nos 264 testes v1.0.0.

**Tests**: integration
**Gate**: Build
**Commit**: `test(ledger): cover asset liability operation matrix`

---

## Phase Execution Map

```text
Phase 1: T1 -> T2 -> T3 -> T4 -> T5 -> T6
Phase 2: T7 -> T8 -> T9 -> T10 -> T11 -> T12
Phase 3: T13 -> T14 -> T15 -> T16 -> T17 -> T18 -> T19 -> T20 -> T21
Phase 4: T22 -> T23 -> T24 -> T25 -> T26 -> T27 -> T28
Phase 5: T29 -> T30 -> T31 -> T32 -> T33
Phase 6: T34 -> T35 -> T36 -> T37 -> T38 -> T39 -> T40 -> T41
```

T1-T33 foram concluídas na v1.0.0. A emenda v1.1.0 possui oito tarefas sequenciais e cabe em um único batch. Nenhuma fase será dividida entre workers.

---

## Task Granularity Check

| Task | Scope | Status |
| --- | --- | --- |
| T1 | Toolchain raiz | ✅ Coeso |
| T2 | Um package scaffold | ✅ Granular |
| T3 | Um shared kernel base | ✅ Coeso |
| T4 | Identidade e moeda acopladas por branded types | ✅ Coeso |
| T5 | Um value object | ✅ Granular |
| T6 | Um value object | ✅ Granular |
| T7 | Um aggregate root | ✅ Granular |
| T8 | Um aggregate root | ✅ Granular |
| T9 | Uma entidade | ✅ Granular |
| T10 | Uma operação de aggregate | ✅ Granular |
| T11 | Uma transição de aggregate | ✅ Granular |
| T12 | Um domain service | ✅ Granular |
| T13 | Um package scaffold | ✅ Granular |
| T14 | Um conjunto de ports sem runtime | ✅ Coeso |
| T15 | Uma fronteira de execução | ✅ Coeso |
| T16 | Um package/store | ✅ Coeso |
| T17-T19 | Um repository por task | ✅ Granular |
| T20 | Um transaction manager | ✅ Granular |
| T21 | Adapters determinísticos de teste | ✅ Coeso |
| T22-T30 | Um caso de uso por task | ✅ Granular |
| T31 | Um query adapter | ✅ Granular |
| T32-T33 | Um caso de uso por task | ✅ Granular |
| T34 | Um agregado e seus testes co-localizados | ✅ Coeso |
| T35 | Uma integração transversal dos comandos de journal | ✅ Coeso |
| T36 | Um query adapter | ✅ Granular |
| T37 | Um caso de uso e seu contrato de leitura | ✅ Coeso |
| T38 | Uma transição de aggregate | ✅ Granular |
| T39 | Um contrato de fato e os agregados produtores | ✅ Coeso |
| T40 | Um dispatcher e seu contrato | ✅ Granular |
| T41 | Uma matriz de cenários para comportamento existente | ✅ Granular |

---

## Diagram-Definition Cross-Check

| Task | Depends On | Diagram Shows | Status |
| --- | --- | --- | --- |
| T1 | None | início | ✅ Match |
| T2 | T1 | T1 -> T2 | ✅ Match |
| T3 | T2 | T2 -> T3 | ✅ Match |
| T4 | T3 | T3 -> T4 | ✅ Match |
| T5 | T4 | T4 -> T5 | ✅ Match |
| T6 | T5 | T5 -> T6 | ✅ Match |
| T7 | T6 | início da Phase 2 após Phase 1 | ✅ Match |
| T8 | T7 | T7 -> T8 | ✅ Match |
| T9 | T8 | T8 -> T9 | ✅ Match |
| T10 | T9 | T9 -> T10 | ✅ Match |
| T11 | T10 | T10 -> T11 | ✅ Match |
| T12 | T11 | T11 -> T12 | ✅ Match |
| T13 | T12 | início da Phase 3 após Phase 2 | ✅ Match |
| T14 | T13 | T13 -> T14 | ✅ Match |
| T15 | T14 | T14 -> T15 | ✅ Match |
| T16 | T15 | T15 -> T16 | ✅ Match |
| T17 | T16 | T16 -> T17 | ✅ Match |
| T18 | T17 | T17 -> T18 | ✅ Match |
| T19 | T18 | T18 -> T19 | ✅ Match |
| T20 | T19 | T19 -> T20 | ✅ Match |
| T21 | T20 | T20 -> T21 | ✅ Match |
| T22 | T21 | início da Phase 4 após Phase 3 | ✅ Match |
| T23 | T22 | T22 -> T23 | ✅ Match |
| T24 | T23 | T23 -> T24 | ✅ Match |
| T25 | T24 | T24 -> T25 | ✅ Match |
| T26 | T25 | T25 -> T26 | ✅ Match |
| T27 | T26 | T26 -> T27 | ✅ Match |
| T28 | T27 | T27 -> T28 | ✅ Match |
| T29 | T28 | início da Phase 5 após Phase 4 | ✅ Match |
| T30 | T29 | T29 -> T30 | ✅ Match |
| T31 | T30 | T30 -> T31 | ✅ Match |
| T32 | T31 | T31 -> T32 | ✅ Match |
| T33 | T32 | T32 -> T33 | ✅ Match |
| T34 | T33 | início da Phase 6 após Phase 5 | ✅ Match |
| T35 | T34 | T34 -> T35 | ✅ Match |
| T36 | T35 | T35 -> T36 | ✅ Match |
| T37 | T36 | T36 -> T37 | ✅ Match |
| T38 | T37 | T37 -> T38 | ✅ Match |
| T39 | T38 | T38 -> T39 | ✅ Match |
| T40 | T39 | T39 -> T40 | ✅ Match |
| T41 | T40 | T40 -> T41 | ✅ Match |

---

## Test Co-location Validation

| Tasks | Code Layer | Matrix Requires | Task Says | Status |
| --- | --- | --- | --- | --- |
| T1-T2, T13-T14 | Config/ports sem runtime | none | build-only | ✅ OK |
| T3-T12 | Shared/domain | unit | unit | ✅ OK |
| T15 | Application runtime | unit | unit | ✅ OK |
| T16-T21 | Memory adapters/repositories | integration | integration | ✅ OK |
| T22-T30 | Application + memory | integration | integration | ✅ OK |
| T31 | Query adapter | integration | integration | ✅ OK |
| T32-T33 | Query use cases + memory | integration | integration | ✅ OK |
| T34 | Domain aggregate | unit | unit | ✅ OK |
| T35 | Application + memory adapters | integration | integration | ✅ OK |
| T36 | Query adapter | integration | integration | ✅ OK |
| T37 | Application + repositories | integration | integration | ✅ OK |
| T38 | Domain + application behavior | integration | integration | ✅ OK |
| T39 | Domain facts | unit | unit | ✅ OK |
| T40 | Application dispatcher | unit | unit | ✅ OK |
| T41 | Cross-layer scenarios | integration | integration | ✅ OK |

Cada tarefa com comportamento inclui seus testes no mesmo commit. Não existe tarefa posterior dedicada a testar código criado antes.

---

## Requirement Coverage

| Range | Tasks |
| --- | --- |
| FDC-01 a FDC-05 | T1-T6, T13-T15 |
| FDC-06 a FDC-11 | T7, T22-T29 |
| FDC-12 a FDC-17 | T8, T18, T23-T25 |
| FDC-18 a FDC-24 | T9-T12, T26-T29 |
| FDC-25 a FDC-34 | T12, T26-T29 |
| FDC-35 a FDC-38 | T9, T11, T30 |
| FDC-39 a FDC-46 | T14, T31-T33 |
| FDC-47 a FDC-50 | T16-T20, T30 |
| FDC-51 a FDC-58 | T15, T20-T33 |
| FDC-42 (emenda v1.1.0) | T35-T36 |
| FDC-59 | T37 |
| FDC-60 a FDC-61 | T38 |
| FDC-62 | T41 |
| FDC-63 a FDC-64 | T34-T36 |
| FDC-65 a FDC-66 | T39-T40 |

**Coverage:** 66 requisitos mapeados, 0 não mapeados. A baseline v1.0.0 concluiu FDC-01 a FDC-58. Na v1.1.0, o FDC-42 emendado e FDC-59 a FDC-66 aguardam T34-T41.
