# Tarefas das Queries Financeiras do Ledger

## Execution Protocol (MANDATORY -- do not skip)

Implemente estas tarefas com a skill `tlc-spec-driven`: ative-a por nome e siga o fluxo Execute e as Critical Rules. A skill é a fonte de verdade para ciclo por tarefa, commits atômicos, batches, Verifier e discrimination sensor.

Se a skill não puder ser ativada, pare e informe o usuário. Não prossiga sem ela.

---

**Design**: `.specs/features/financial-ledger-queries/design.md`
**Status**: Draft
**Total tasks**: 14

---

## Test Coverage Matrix

> Gerada a partir do código, manifests, testes existentes e spec. Guidelines encontradas: nenhuma; defaults fortes aplicados. Comandos extraídos de `package.json`, `packages/application/package.json`, `packages/infrastructure-sqlite/package.json` e `turbo.json`. Estilo e localização amostrados em `packages/application/src/core/use-case-executor.test.ts`, `packages/infrastructure-memory/src/use-cases/get-account-balance.test.ts`, `packages/infrastructure-sqlite/tests/database/better-sqlite-database.test.ts`, `packages/infrastructure-sqlite/tests/migrations/sqlite-migration-runner.test.ts`, `packages/infrastructure-sqlite/tests/queries/sqlite-ledger-queries.test.ts` e `packages/infrastructure-sqlite/tests/contracts/query-use-cases.test.ts`.

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| --- | --- | --- | --- | --- |
| Ports, inputs e readonly views | none | Build, lint e typecheck provam compatibilidade estrutural; testes comportamentais ficam nos handlers e adapters | `packages/application/src/ports/**/*.ts` | `pnpm exec turbo run build lint check-types --filter=@open-coin/application...` |
| Validação, cursor e error boundary | unit | Todas as branches; cada input inválido, versão de cursor, limite e classe de erro possui resultado exato | `packages/application/src/querying/**/*.test.ts` | `pnpm exec turbo run test lint check-types --filter=@open-coin/application...` |
| Query handlers | unit | Todos os caminhos felizes, defaults, escopo e falhas; cada AC aplicável prova o valor e código exatos e que input inválido não chama o port | `packages/application/src/{ledger,insights}/queries/**/*.test.ts` | `pnpm exec turbo run test lint check-types --filter=@open-coin/application...` |
| Contrato legado memory/SQLite | integration | Compatibilidade aditiva do saldo, cinco kinds, vazio, data, isolamento, reversão e precisão | `packages/infrastructure-sqlite/tests/contracts/**/*.test.ts` | `pnpm exec turbo run test lint check-types --filter=@open-coin/infrastructure-sqlite...` |
| Database e read transaction | integration | BEGIN deferred, snapshot, fila, commit, rollback, lifetime e fechamento | `packages/infrastructure-sqlite/tests/database/**/*.test.ts` | `pnpm exec turbo run test lint check-types --filter=@open-coin/infrastructure-sqlite...` |
| Migration e query plans | integration | Banco vazio e V1, idempotência, checksums, índices exatos e planos críticos sem regressão | `packages/infrastructure-sqlite/tests/migrations/**/*.test.ts` e `tests/queries/**/*query-plan*.test.ts` | `pnpm --filter @open-coin/infrastructure-sqlite check:migrations && pnpm exec turbo run test lint check-types --filter=@open-coin/infrastructure-sqlite...` |
| SQLite query adapters | integration | Mapeamento 1:1 de todos os ACs e edge cases; paginação, sinais, reversões, splits, isolamento, int64 e ausência de N+1 | `packages/infrastructure-sqlite/tests/queries/**/*.test.ts` | `pnpm exec turbo run test lint check-types --filter=@open-coin/infrastructure-sqlite...` |
| Test scenario support | integration | Cenários comuns por casos de uso e casos estruturais por builders válidos; nenhuma fixture persiste ledger inválido | `packages/infrastructure-sqlite/tests/support/**/*.test.ts` | `pnpm exec turbo run test lint check-types --filter=@open-coin/infrastructure-sqlite...` |
| Public package API | none | Build e smoke de exports; helpers e driver de teste permanecem privados | `packages/{application,infrastructure-sqlite}/src/index.ts` | `pnpm build && pnpm lint && pnpm check-types && pnpm test` |

## Gate Check Commands

> Gerada a partir do workspace atual. Nenhum comando novo é presumido.

| Gate Level | When to Use | Command |
| --- | --- | --- |
| Application build | Após contratos sem runtime | `pnpm exec turbo run build lint check-types --filter=@open-coin/application...` |
| Application quick | Após validação, cursor, error boundary ou handler unitário | `pnpm exec turbo run test lint check-types --filter=@open-coin/application...` |
| SQLite full | Após database, adapter ou integração SQLite | `pnpm exec turbo run test lint check-types --filter=@open-coin/infrastructure-sqlite...` |
| Migration full | Após migration ou expectativa de query plan | `pnpm --filter @open-coin/infrastructure-sqlite check:migrations && pnpm exec turbo run test lint check-types --filter=@open-coin/infrastructure-sqlite...` |
| Build | No fim de cada fase e da feature | `pnpm build && pnpm lint && pnpm check-types && pnpm test` |

---

## Execution Plan

As fases e tarefas são estritamente sequenciais. Cada fase termina com o gate completo do workspace.

### Phase 1: Contratos e fronteira de aplicação

```text
T1 -> T2 -> T3 -> T4
```

### Phase 2: Fundação de leitura SQLite

```text
T5 -> T6 -> T7 -> T8
```

### Phase 3: Leituras operacionais do ledger

```text
T9 -> T10 -> T11
```

### Phase 4: Indicadores financeiros

```text
T12 -> T13 -> T14
```

---

## Task Breakdown

### Phase 1: Contratos e fronteira de aplicação

### T1: Definir os contratos públicos das queries financeiras

**What**: Adicionar inputs primitivos, páginas, read models, cursor keys, `LedgerReadQueries` e `InsightQueries`, preservando o `LedgerQueries` legado.
**Where**: `packages/application/src/ports/`
**Depends on**: None
**Reuses**: `queries.ts`, `commands.ts`, branded IDs, `LocalDate` e readonly DTOs existentes.
**Requirement**: FQR-01, FQR-02, FQR-07, FQR-08, FQR-18, FQR-29, FQR-40, FQR-48, FQR-57

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`

**Done when**:

- [x] Os seis inputs públicos contêm somente strings, números, booleanos, arrays readonly e opcionais definidos no design.
- [x] `LedgerReadQueries` e `InsightQueries` aceitam IDs, datas e cursor keys já validados.
- [x] Pages usam `readonly items` e `nextCursor`; slices internos usam `nextKey`.
- [x] `LedgerQueries` mantém as duas assinaturas existentes.
- [x] Exports públicos compilam; helpers internos e adapters não vazam pelo pacote.
- [x] Zero testes novos são necessários pela matriz e a contagem existente permanece inalterada.

**Tests**: build-only (matrix: none)
**Gate**: Application build
**Commit**: `feat(application): define financial query contracts`

### T2: Implementar validação e codecs de cursor

**What**: Implementar parsers de IDs, datas, meses, limites, listas e os cursores versionados `s1` e `j1`.
**Where**: `packages/application/src/querying/`
**Depends on**: T1
**Reuses**: `LocalDate`, `ApplicationError` e comparação de sequência decimal definida no design.
**Requirement**: FQR-03, FQR-04, FQR-16, FQR-19, FQR-27, FQR-30, FQR-39, FQR-47

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`

**Done when**:

- [x] Datas reais, `YYYY-MM`, intervalos, IDs obrigatórios e limites de 1 a 100 retornam tipos validados.
- [x] Arrays vazios, enums inválidos, busca vazia e intervalos invertidos retornam `INVALID_QUERY`.
- [x] Cursores de statement e journal fazem round-trip de datas, sequências decimais grandes e posting position.
- [x] Prefixo, versão, quantidade de campos ou valor inválido retorna `INVALID_QUERY`.
- [x] Pelo menos 20 testes unitários derivados de FQR-03, FQR-04, FQR-16, FQR-27, FQR-39 e FQR-47 passam.
- [x] Nenhum teste existente é removido, ignorado ou enfraquecido.

**Tests**: unit
**Gate**: Application quick
**Commit**: `feat(application): validate financial query inputs`

### T3: Sanitizar falhas inesperadas das queries

**What**: Implementar a error boundary específica de queries e aplicá-la aos dois handlers legados.
**Where**: `packages/application/src/querying/query-error.ts`
**Depends on**: T2
**Reuses**: `ApplicationError`, `DomainError`, `Result` e handlers atuais.
**Requirement**: FQR-04, FQR-68

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`

**Done when**:

- [x] `ApplicationError` e `DomainError` preservam seus códigos públicos.
- [x] Erros genéricos e valores não-Error viram `UNEXPECTED_ERROR` com `Financial query failed`.
- [x] `GetAccountBalance` e `GetAccountStatement` deixam de propagar mensagens genéricas de driver.
- [x] Pelo menos 5 testes unitários provam preservação, conversão e ausência de SQL, parâmetros ou caminhos.
- [x] Nenhum teste existente é removido, ignorado ou enfraquecido.

**Tests**: unit
**Gate**: Application quick
**Commit**: `fix(application): sanitize financial query failures`

### T4: Enriquecer o saldo legado sem quebrar compatibilidade

**What**: Adicionar nome, kind, saldo bruto e saldo visual ao `GetAccountBalance` em aplicação, memória e SQLite, mantendo `amountMinor` como alias visual.
**Where**: `packages/**/get-account-balance*`
**Depends on**: T3
**Reuses**: `LedgerQueries`, `normalBalanceOf`, adapters atuais e suíte compartilhada de query use cases.
**Requirement**: FQR-09, FQR-10, FQR-11, FQR-12, FQR-13, FQR-64

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`

**Done when**:

- [x] Os adapters retornam `accountName`, `accountKind`, `rawBalanceMinor` e `displayBalanceMinor` exatos.
- [x] `amountMinor` é idêntico a `displayBalanceMinor` nos cinco kinds.
- [x] Conta vazia, `asOf`, reversão, outro livro e valor acima de `Number.MAX_SAFE_INTEGER` preservam o resultado especificado.
- [x] `GetAccountStatement` legado permanece byte-for-byte compatível no formato observável.
- [x] Pelo menos 10 casos de contrato e integração cobrem memória e SQLite sem reduzir a suíte existente.
- [x] O gate completo do workspace passa.

**Tests**: integration
**Gate**: Build
**Commit**: `feat(application): enrich account balance view`

### Phase 2: Fundação de leitura SQLite

### T5: Adicionar transações de leitura deferred

**What**: Estender o contrato SQLite e o driver de teste com `SqliteReader` e `readTransaction` usando `BEGIN` deferred.
**Where**: `packages/infrastructure-sqlite/src/database/`
**Depends on**: T4
**Reuses**: Fila, scoped executor, rollback e lifecycle de `BetterSqliteDatabase`.
**Requirement**: FQR-05, FQR-06, FQR-65, FQR-66, FQR-68

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`

**Done when**:

- [x] O callback recebe somente `query`, sem `execute` ou `executeBatch` no tipo público.
- [x] O driver executa `BEGIN`, compartilha um snapshot e confirma com `COMMIT`.
- [x] Falha do callback ou commit executa rollback quando a conexão está ativa e preserva a causa para sanitização.
- [x] Callbacks concorrentes usam a fila existente sem intercalar statements.
- [x] Reader fora do callback e operações depois de `close` são rejeitados.
- [x] Pelo menos 8 testes de integração cobrem begin mode, snapshot, fila, commit, rollback e lifetime.

**Tests**: integration
**Gate**: SQLite full
**Commit**: `feat(sqlite): add deferred read transactions`

### T6: Extrair helpers de valores das queries SQLite

**What**: Centralizar parsing de rows, enums, inteiros, `bigint`, sinais de exibição e comparação decimal.
**Where**: `packages/infrastructure-sqlite/src/queries/sqlite-query-values.ts`
**Depends on**: T5
**Reuses**: Helpers privados de `sqlite-ledger-queries.ts` e `normalBalanceOf`.
**Requirement**: FQR-02, FQR-07, FQR-08, FQR-11, FQR-19, FQR-30, FQR-64

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`

**Done when**:

- [x] Strings, inteiros seguros, booleanos e `bigint` válidos são convertidos sem coerção silenciosa.
- [x] Kinds, status e origins inválidos falham antes de montar um read model.
- [x] Sinais dos cinco kinds e sequências `1`, `2`, `9`, `10` e acima de safe integer produzem ordem exata.
- [x] `SqliteLedgerQueries` legado reutiliza os helpers sem mudar seus resultados.
- [x] Pelo menos 12 testes unitários cobrem todas as branches e limites.

**Tests**: unit
**Gate**: SQLite full
**Commit**: `refactor(sqlite): share query value helpers`

### T7: Criar os índices das queries financeiras

**What**: Adicionar migration V2 com índices de ordenação decimal e statement, regenerar migrations e provar upgrade e planos-base.
**Where**: `packages/infrastructure-sqlite/migrations/`
**Depends on**: T6
**Reuses**: Generator, checksums, runner e testes de migration existentes.
**Requirement**: FQR-19, FQR-30, FQR-63, FQR-67, FQR-69

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`

**Done when**:

- [x] `0002_financial_query_indexes.sql` cria o expression index de data/length/sequence e o índice de account/posting position.
- [x] A lista gerada contém V1 e V2 com checksums válidos e ordem contígua.
- [x] Banco vazio, upgrade de V1, reaplicação e adulteração de checksum mantêm os contratos existentes.
- [x] `EXPLAIN QUERY PLAN` de formas-base reconhece os novos índices pelo nome.
- [x] Pelo menos 7 testes de migration e plano passam, incluindo sequência `9`/`10`.
- [x] `check:migrations` e o Migration full gate passam.

**Tests**: integration
**Gate**: Migration full
**Commit**: `perf(sqlite): index financial query paths`

### T8: Criar fixtures financeiras reutilizáveis para queries

**What**: Implementar o scenario builder de books, contas, fluxo, split, reversão e arquivamento para testes SQLite.
**Where**: `packages/infrastructure-sqlite/tests/support/`
**Depends on**: T7
**Reuses**: Casos de uso atuais, repositories SQLite, clock, IDs e publisher determinísticos.
**Requirement**: FQR-06, FQR-08, FQR-26, FQR-44, FQR-45, FQR-46, FQR-50, FQR-51, FQR-52, FQR-63

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`

**Done when**:

- [ ] Fluxos comuns são criados por casos de uso e produzem zero eventos pendentes depois do setup.
- [ ] Split e edge cases usam builders de domínio e repositories, não SQL ad hoc.
- [ ] Arquivamento e reversão preservam snapshots válidos.
- [ ] IDs, datas, sequências e moeda são determinísticos por cenário.
- [ ] Pelo menos 4 testes de integração provam fluxo comum, passivo, split e reversão/arquivamento.
- [ ] O gate completo do workspace passa.

**Tests**: integration
**Gate**: Build
**Commit**: `test(sqlite): add financial query scenarios`

### Phase 3: Leituras operacionais do ledger

### T9: Implementar a lista de saldos das contas

**What**: Entregar `ListAccountBalances` no handler e `SqliteLedgerQueries`, incluindo filtros, sinais, arquivamento e zero balance.
**Where**: `packages/**/list-account-balances*`
**Depends on**: T8
**Reuses**: `LedgerReadQueries`, query validation, safe boundary, query value helpers e scenario builder.
**Requirement**: FQR-03, FQR-05, FQR-06, FQR-07, FQR-08, FQR-14, FQR-15, FQR-16, FQR-17, FQR-64, FQR-66, FQR-67, FQR-70

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`

**Done when**:

- [ ] Handler valida livro, kinds e `asOf` antes de chamar o port.
- [ ] Adapter retorna todas as contas selecionadas em um statement constante, sem N+1.
- [ ] Defaults de archived e zero, filtros vazios, cinco sinais, data inclusiva e ordem exata atendem a spec.
- [ ] Outro livro nunca altera metadata, saldos ou existência observável.
- [ ] Quantias acima de safe integer permanecem strings exatas e o plano usa índices book-scoped.
- [ ] Pelo menos 15 testes unitários e de integração mapeiam todos os ACs aplicáveis.

**Tests**: unit + integration
**Gate**: SQLite full
**Commit**: `feat(sqlite): list account balances`

### T10: Implementar o extrato paginado

**What**: Entregar `ListAccountStatement` com cursor estável, running balance histórico e counterparties em snapshot único.
**Where**: `packages/**/list-account-statement*`
**Depends on**: T9
**Reuses**: `LedgerReadQueries`, cursor codec, read transaction, expression index e scenario builder.
**Requirement**: FQR-03, FQR-04, FQR-05, FQR-06, FQR-07, FQR-18, FQR-19, FQR-20, FQR-21, FQR-22, FQR-23, FQR-24, FQR-25, FQR-26, FQR-27, FQR-28, FQR-64, FQR-65, FQR-66, FQR-67

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`

**Done when**:

- [ ] Handler rejeita conta ausente/cross-book, intervalo, limit e cursor inválidos antes do port.
- [ ] CTE calcula running balance antes de aplicar `from`, `to` e cursor.
- [ ] Ordem usa data, sequência decimal e posting position; pages concatenadas não têm lacuna ou duplicata.
- [ ] Cada item possui todos os campos, sinais, flags e counterparties ordenados definidos na spec.
- [ ] Original e reversor ficam visíveis e anulam o saldo depois do reversor.
- [ ] A query usa dois statements constantes dentro de uma read transaction e busca `limit + 1` itens-base.
- [ ] Pelo menos 18 testes unitários e de integração cobrem todos os ACs e edge cases do extrato.

**Tests**: unit + integration
**Gate**: SQLite full
**Commit**: `feat(sqlite): paginate account statements`

### T11: Implementar a lista global de lançamentos

**What**: Entregar `ListJournalEntries` com filtros compostos, busca literal, cursor e classificação contábil.
**Where**: `packages/**/list-journal-entries*`
**Depends on**: T10
**Reuses**: `LedgerReadQueries`, cursor codec, read transaction, scenario builder e helpers de query.
**Requirement**: FQR-03, FQR-04, FQR-05, FQR-06, FQR-07, FQR-08, FQR-29, FQR-30, FQR-31, FQR-32, FQR-33, FQR-34, FQR-35, FQR-36, FQR-37, FQR-38, FQR-39, FQR-64, FQR-65, FQR-66, FQR-67

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`

**Done when**:

- [ ] Handler valida datas, lists, origins, busca, limit e cursor antes do port.
- [ ] União dentro de filtros e interseção entre grupos produzem IDs exatos sem multiplicar entries.
- [ ] Busca usa substring literal case-sensitive e valores permanecem bindados.
- [ ] Receita, despesa, transferência, ajuste, split e reversão produzem campos e classificações exatas.
- [ ] Pages concatenadas respeitam data/sequência decimal sem lacuna ou duplicata.
- [ ] A query usa dois statements constantes em um snapshot e o plano crítico usa o expression index.
- [ ] Pelo menos 18 testes unitários e de integração cobrem todos os ACs e edge cases da lista.
- [ ] O gate completo do workspace passa.

**Tests**: unit + integration
**Gate**: Build
**Commit**: `feat(sqlite): list journal entries`

### Phase 4: Indicadores financeiros

### T12: Implementar o fluxo de caixa mensal

**What**: Entregar `GetMonthlyCashFlow` no handler e no novo `SqliteInsightQueries`.
**Where**: `packages/**/get-monthly-cash-flow*`
**Depends on**: T11
**Reuses**: `InsightQueries`, validação de mês, safe boundary, helpers monetários e scenario builder.
**Requirement**: FQR-03, FQR-05, FQR-06, FQR-07, FQR-08, FQR-40, FQR-41, FQR-42, FQR-43, FQR-44, FQR-45, FQR-46, FQR-47, FQR-64, FQR-66, FQR-71

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`

**Done when**:

- [ ] Handler valida livro, meses e ordem do intervalo antes do port.
- [ ] Todos os meses inclusivos aparecem, inclusive os zerados.
- [ ] Receita, despesa e net usam sinais e aritmética inteira exatos.
- [ ] Transferência e pagamento de passivo sem categoria não entram; compra em passivo entra na data da compra.
- [ ] Reversão em outro mês preserva o efeito de cada mês e o líquido do período.
- [ ] Statement count é constante e livros/moedas não se misturam.
- [ ] Pelo menos 14 testes unitários e de integração cobrem todos os ACs e edge cases do fluxo.

**Tests**: unit + integration
**Gate**: SQLite full
**Commit**: `feat(sqlite): report monthly cash flow`

### T13: Implementar gastos por categoria

**What**: Entregar `GetCategorySpending` com splits, arquivamento, reversões, contagem e basis points.
**Where**: `packages/**/get-category-spending*`
**Depends on**: T12
**Reuses**: `InsightQueries`, `SqliteInsightQueries`, `bigint`, safe boundary e scenario builder.
**Requirement**: FQR-03, FQR-05, FQR-06, FQR-07, FQR-08, FQR-48, FQR-49, FQR-50, FQR-51, FQR-52, FQR-53, FQR-54, FQR-55, FQR-56, FQR-64, FQR-66, FQR-72

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`

**Done when**:

- [ ] Handler valida livro, período e category ID antes do port.
- [ ] Cada posting de split pertence somente à própria categoria e categoria arquivada permanece no histórico.
- [ ] Original e reversor somam com sinais opostos; reversor não incrementa transaction count.
- [ ] Basis points usam líquidos positivos, truncamento inteiro, zero denominator e nenhuma redistribuição.
- [ ] Filtro retorna a categoria exata sem descendentes e período vazio retorna lista vazia.
- [ ] Ordem por amount, nome e ID é determinística e statement count permanece constante.
- [ ] Pelo menos 14 testes unitários e de integração cobrem todos os ACs e edge cases de categorias.

**Tests**: unit + integration
**Gate**: SQLite full
**Commit**: `feat(sqlite): report category spending`

### T14: Implementar patrimônio líquido e fechar os gates

**What**: Entregar `GetNetWorth`, completar exports públicos e provar todos os gates da feature.
**Where**: `packages/**/get-net-worth*`
**Depends on**: T13
**Reuses**: `InsightQueries`, `SqliteInsightQueries`, balance helpers, safe boundary e scenario builder.
**Requirement**: FQR-03, FQR-05, FQR-06, FQR-07, FQR-08, FQR-57, FQR-58, FQR-59, FQR-60, FQR-61, FQR-62, FQR-64, FQR-66, FQR-68, FQR-69

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`

**Done when**:

- [ ] Handler valida livro e `asOf` antes do port.
- [ ] Ativos e passivos incluem contas arquivadas, negativas, zeradas e data histórica.
- [ ] `netWorthMinor` é exatamente `assetMinor - liabilityMinor` em `bigint`.
- [ ] Livro sem contas financeiras retorna três strings `"0"` e a moeda-base.
- [ ] Falhas do driver em qualquer nova query chegam como `UNEXPECTED_ERROR` sanitizado.
- [ ] Entry points públicos exportam contratos, handlers e adapters de produção, mas não driver ou fixtures de teste.
- [ ] Pelo menos 12 testes unitários, de integração e de API pública cobrem os ACs finais sem reduzir nenhuma suíte.
- [ ] Build, lint, typecheck, migration check e todos os testes do workspace passam sem warnings ou testes ignorados.

**Tests**: unit + integration
**Gate**: Build
**Commit**: `feat(sqlite): calculate net worth`

---

## Phase Execution Map

```text
Phase 1 -> Phase 2 -> Phase 3 -> Phase 4

Phase 1: T1 -> T2 -> T3 -> T4
Phase 2: T5 -> T6 -> T7 -> T8
Phase 3: T9 -> T10 -> T11
Phase 4: T12 -> T13 -> T14
```

As fases são sequenciais. Em Execute, 14 tarefas formam mais de um batch; a skill deve oferecer sub-agents antes de iniciar, sem despachar nenhum até o usuário aceitar.

---

## Task Granularity Check

| Task | Scope | Status |
| --- | --- | --- |
| T1 | Uma superfície pública de contratos | ✅ Granular |
| T2 | Um módulo de validação e cursor | ✅ Granular |
| T3 | Uma error boundary | ✅ Granular |
| T4 | Uma evolução vertical compatível de saldo | ✅ Granular |
| T5 | Um recurso de database | ✅ Granular |
| T6 | Um módulo de parsing e sinal | ✅ Granular |
| T7 | Uma migration de índices | ✅ Granular |
| T8 | Um scenario builder de teste | ✅ Granular |
| T9 | Uma capacidade de query | ✅ Granular |
| T10 | Uma capacidade de query | ✅ Granular |
| T11 | Uma capacidade de query | ✅ Granular |
| T12 | Uma capacidade de query | ✅ Granular |
| T13 | Uma capacidade de query | ✅ Granular |
| T14 | Uma capacidade de query e fechamento de exports | ✅ Granular |

---

## Diagram-Definition Cross-Check

| Task | Depends On (task body) | Diagram Shows | Status |
| --- | --- | --- | --- |
| T1 | None | Início da Phase 1 | ✅ Match |
| T2 | T1 | T1 -> T2 | ✅ Match |
| T3 | T2 | T2 -> T3 | ✅ Match |
| T4 | T3 | T3 -> T4 | ✅ Match |
| T5 | T4 | Início da Phase 2; dependência cross-phase válida | ✅ Match |
| T6 | T5 | T5 -> T6 | ✅ Match |
| T7 | T6 | T6 -> T7 | ✅ Match |
| T8 | T7 | T7 -> T8 | ✅ Match |
| T9 | T8 | Início da Phase 3; dependência cross-phase válida | ✅ Match |
| T10 | T9 | T9 -> T10 | ✅ Match |
| T11 | T10 | T10 -> T11 | ✅ Match |
| T12 | T11 | Início da Phase 4; dependência cross-phase válida | ✅ Match |
| T13 | T12 | T12 -> T13 | ✅ Match |
| T14 | T13 | T13 -> T14 | ✅ Match |

---

## Test Co-location Validation

| Task | Code Layer Created/Modified | Matrix Requires | Task Says | Status |
| --- | --- | --- | --- | --- |
| T1 | Ports e views | none | build-only | ✅ OK |
| T2 | Validação e cursor | unit | unit | ✅ OK |
| T3 | Error boundary e handlers | unit | unit | ✅ OK |
| T4 | Handler e adapters legados | integration | integration | ✅ OK |
| T5 | Database/read transaction | integration | integration | ✅ OK |
| T6 | Query value helpers | unit | unit | ✅ OK |
| T7 | Migration e plans | integration | integration | ✅ OK |
| T8 | Test support | integration | integration | ✅ OK |
| T9 | Handler e SQLite adapter | unit + integration | unit + integration | ✅ OK |
| T10 | Handler e SQLite adapter | unit + integration | unit + integration | ✅ OK |
| T11 | Handler e SQLite adapter | unit + integration | unit + integration | ✅ OK |
| T12 | Handler e SQLite adapter | unit + integration | unit + integration | ✅ OK |
| T13 | Handler e SQLite adapter | unit + integration | unit + integration | ✅ OK |
| T14 | Handler, SQLite adapter e public API | unit + integration | unit + integration | ✅ OK |

---

## Requirement-to-Task Traceability

| Requirements | Tasks |
| --- | --- |
| FQR-01, FQR-02 | T1, T6 |
| FQR-03, FQR-04 | T2, T3, T9-T14 |
| FQR-05, FQR-06 | T5, T8-T14 |
| FQR-07, FQR-08 | T1, T6, T9-T14 |
| FQR-09 to FQR-13 | T4 |
| FQR-14 to FQR-17, FQR-70 | T9 |
| FQR-18 to FQR-28 | T1, T2, T8, T10 |
| FQR-29 to FQR-39 | T1, T2, T7, T11 |
| FQR-40 to FQR-47, FQR-71 | T1, T2, T8, T12 |
| FQR-48 to FQR-56, FQR-72 | T1, T8, T13 |
| FQR-57 to FQR-62 | T1, T14 |
| FQR-63 | T7, T8 |
| FQR-64 | T4, T6, T9-T14 |
| FQR-65 | T5, T10, T11 |
| FQR-66 | T5, T9-T14 |
| FQR-67 | T7, T9-T11 |
| FQR-68 | T3, T5, T14 |
| FQR-69 | T7, T14 |

**Coverage:** 72 requirements mapped, 0 unmapped.
