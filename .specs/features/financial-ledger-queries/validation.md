# Financial Ledger Queries Validation

## Validation: Financial Ledger Queries - PASS

**Verdict**: PASS
**Date**: 2026-08-04
**Spec**: `.specs/features/financial-ledger-queries/spec.md`
**Diff range**: `216f51d..c3e7502` (produção; `validation.md`, `.specs/LESSONS.md` e `.specs/lessons.json` não são contados)
**Verifier**: verifier independente (author ≠ verifier)

Os 72 ACs foram rederivados contra os valores exatos da spec. Os quatro commits do segundo ciclo fecham os 19 gaps do primeiro relatório; não houve alteração de código ou testes durante esta verificação.

## Task Completion

| Task | Status | Notes |
| --- | --- | --- |
| T1 | ✅ Done | Contratos públicos e isolamento da aplicação. |
| T2 | ✅ Done | Validação, limites e codecs versionados. |
| T3 | ✅ Done | Error boundary sanitizada. |
| T4 | ✅ Done | Saldo legado enriquecido aditivamente. |
| T5 | ✅ Done | Read transaction deferred. |
| T6 | ✅ Done | Helpers de valores e sinais. |
| T7 | ✅ Done | Migration V2 e índices. |
| T8 | ✅ Done | Fixtures financeiras válidas. |
| T9 | ✅ Done | Lista de saldos. |
| T10 | ✅ Done | Extrato paginado. |
| T11 | ✅ Done | Lista global de lançamentos. |
| T12 | ✅ Done | Fluxo de caixa mensal. |
| T13 | ✅ Done | Gastos por categoria. |
| T14 | ✅ Done | Patrimônio líquido, exports e gates. |

## Spec-Anchored Acceptance Criteria

Cada linha abaixo cita o resultado exigido pela spec e uma asserção observável. Evidência sem `file:line` não foi contada.

| ID | Spec-defined outcome | `file:line` + assertion expression | Result |
| --- | --- | --- | --- |
| FQR-01 | Application define inputs/pages/read models sem importar `@open-coin/infrastructure-sqlite`. | `packages/application/src/public-api.test.ts:28-34` — `expect(applicationSource).not.toContain(forbiddenPackage)`. | ✅ PASS |
| FQR-02 | DTOs são objetos/arrays readonly serializáveis, sem valores não permitidos. | `packages/infrastructure-sqlite/tests/queries/sqlite-account-statement.test.ts:252-266` — `expect(result.items[0]).toEqual({ ... } )` com campos string, boolean e array de summaries; build/typecheck confirma os contratos readonly. | ✅ PASS |
| FQR-03 | Data real `YYYY-MM-DD`, mês `YYYY-MM` e intervalo invertido retornam `INVALID_QUERY` sem adapter. | `packages/application/src/querying/query-validation.test.ts:23-30` — `expect(error.code).toBe("INVALID_QUERY")`; `packages/application/src/ledger/queries/list-account-balances.test.ts:90-95` — código exato e `not.toHaveBeenCalled()`. | ✅ PASS |
| FQR-04 | Kind, ID obrigatório, cursor ou limit inválidos retornam `INVALID_QUERY` sem resultado parcial. | `packages/application/src/ledger/queries/list-account-statement.test.ts:93-109` — `expect(result.error.code).toBe("INVALID_QUERY")`, conta e port não chamados; `packages/application/src/ledger/queries/list-account-balances.test.ts:81-95` cobre kind/ID. | ✅ PASS |
| FQR-05 | Toda relação lida é explicitamente limitada ao `bookId`; dados externos não aparecem. | `packages/infrastructure-sqlite/tests/queries/sqlite-account-balances.test.ts:268-279` — foreign account `toBeUndefined()` e currency BRL; `sqlite-journal-entries.test.ts:291-302` — foreign entry não aparece; `sqlite-monthly-cash-flow.test.ts:159-170` — foreign book não altera o resultado; `sqlite-category-spending.test.ts:139-146` — foreign category não aparece. | ✅ PASS |
| FQR-06 | Query produz zero escrita, alteração de versão ou evento; leituras repetidas são iguais. | `packages/infrastructure-sqlite/tests/queries/sqlite-query-integrity.test.ts:134-148` — `expect(first).toEqual(second)`, `expect(between).toEqual(before)`, `expect(after).toEqual(before)`, eventos permanecem `[]`. | ✅ PASS |
| FQR-07 | Dinheiro e sequência cruzam a fronteira como strings decimais exatas. | `packages/infrastructure-sqlite/tests/queries/sqlite-account-statement.test.ts:98-106` — sequência decimal e running balances exatos; `sqlite-monthly-cash-flow.test.ts:148-156` — `expect(expenseMinor).toBe("9007199254740993")`. | ✅ PASS |
| FQR-08 | Agregados usam somente a moeda-base do livro. | `packages/infrastructure-sqlite/tests/queries/sqlite-monthly-cash-flow.test.ts:159-170` — foreign USD não altera `currency: "BRL"`; `sqlite-net-worth.test.ts:31-37` — DTO usa BRL. | ✅ PASS |
| FQR-09 | `GetAccountBalance` retorna todos os campos exatos, incluindo alias e `asOf`. | `packages/infrastructure-sqlite/tests/queries/sqlite-ledger-queries.test.ts:104-117` — `toEqual` exato de `accountId`, nome, kind, raw/display, alias, currency e `asOf`. | ✅ PASS |
| FQR-10 | Soma postings com `occurredOn <= asOf`; sem `asOf`, soma todo o ledger e retorna `asOf: null`. | `packages/infrastructure-sqlite/tests/queries/sqlite-ledger-queries.test.ts:99-117` — posting posterior excluído; `packages/infrastructure-memory/src/queries/in-memory-ledger-queries.test.ts:107-124` — full balance e `toBeNull()`. | ✅ PASS |
| FQR-11 | ASSET/EXPENSE mantêm sinal; LIABILITY/INCOME/EQUITY invertem; `amountMinor === displayBalanceMinor`. | `packages/infrastructure-sqlite/tests/queries/sqlite-ledger-queries.test.ts:138-153` — matriz dos cinco kinds, valores exatos e `expect(result.amountMinor).toBe(result.displayBalanceMinor)`. | ✅ PASS |
| FQR-12 | Conta ausente ou cross-book retorna `ENTITY_NOT_FOUND` sem revelar/consultar a conta. | `packages/infrastructure-sqlite/tests/contracts/query-use-cases.test.ts:314-321` — código exato e `throwingQueries` impede consulta. | ✅ PASS |
| FQR-13 | Conta sem postings retorna raw/display/alias exatamente `"0"`. | `packages/infrastructure-sqlite/tests/queries/sqlite-ledger-queries.test.ts:120-135` — DTO exato com três zeros. | ✅ PASS |
| FQR-14 | Lista omite ARCHIVED por default e inclui ARCHIVED com `includeArchived: true`. | `packages/infrastructure-sqlite/tests/queries/sqlite-account-balances.test.ts:137-164` — ausência default e `toContainEqual` exato do archived não-zero incluído. | ✅ PASS |
| FQR-15 | `accountKinds` aplica pertencimento exato ao conjunto informado. | `packages/infrastructure-sqlite/tests/queries/sqlite-account-balances.test.ts:109-134` — input `accountKinds: ["ASSET"]` e DTO esperado contém somente a conta ASSET. | ✅ PASS |
| FQR-16 | `accountKinds: []` retorna página vazia sem adapter. | `packages/application/src/ledger/queries/list-account-balances.test.ts:72-78` — `Result.ok({ items: [], nextCursor: null })` e port não chamado. | ✅ PASS |
| FQR-17 | Ordena por `accountKind`, `accountName`, `accountId`, crescente. | `packages/infrastructure-sqlite/tests/queries/sqlite-account-balances.test.ts:180-188` — empate de nomes compara IDs e espera `["cash-a", "cash-z"]`; `:101-105` cobre kind/name. | ✅ PASS |
| FQR-18 | `ListAccountStatement` retorna `items` e `nextCursor`. | `packages/application/src/ledger/queries/list-account-statement.test.ts:51-58` — página e cursor codificado esperados. | ✅ PASS |
| FQR-19 | Extrato usa `occurredOn DESC`, sequência decimal DESC e `postingPosition DESC`. | `packages/infrastructure-sqlite/tests/queries/sqlite-account-statement.test.ts:98-106` — ordem 11/10/9; `:237-240` — posting positions exatas. | ✅ PASS |
| FQR-20 | Cursor continua estritamente após a tupla e a página usa mais-um para detectar continuação. | `packages/infrastructure-sqlite/tests/queries/sqlite-account-statement.test.ts:127-130` — páginas sem duplicata e `nextKey` exato/null; `sqlite-query-integrity.test.ts:274-285` — duas chamadas constantes. | ✅ PASS |
| FQR-21 | Sem resultados posteriores, `nextCursor` é `null`. | `packages/infrastructure-sqlite/tests/queries/sqlite-account-statement.test.ts:129-130` — `expect(second.nextKey).toBeNull()`; handler em `packages/application/src/ledger/queries/list-account-statement.test.ts:51-58` codifica null quando não há key. | ✅ PASS |
| FQR-22 | `from`/`to` são inclusivos. | `packages/infrastructure-sqlite/tests/queries/sqlite-account-statement.test.ts:206-211` — resultado contém ambas as datas de borda. | ✅ PASS |
| FQR-23 | Item contém exatamente os 14 campos do contrato. | `packages/infrastructure-sqlite/tests/queries/sqlite-account-statement.test.ts:252-266` — `toEqual` completo de IDs, datas, valores, currency, origin, counterparties e flags. | ✅ PASS |
| FQR-24 | Running balance inclui histórico anterior a filtro/página. | `packages/infrastructure-sqlite/tests/queries/sqlite-account-statement.test.ts:146-151` — item in-range espera `runningBalanceMinor: "150"` após saldo anterior 100. | ✅ PASS |
| FQR-25 | Counterparties são outras contas, únicas, com id/name/kind e ordenadas por name/id. | `packages/infrastructure-sqlite/tests/queries/sqlite-account-statement.test.ts:306-310` — espera `[Alpha/counter-a, Alpha/counter-z, Beta/counter-b]` exatamente. | ✅ PASS |
| FQR-26 | Original e reversor permanecem visíveis e o saldo após reversor se anula. | `packages/infrastructure-sqlite/tests/queries/sqlite-account-statement.test.ts:313-338` — itens original/reversor, amounts `100/-100`, running balances `100/0` e `isReversal` exatos. | ✅ PASS |
| FQR-27 | Limit fora de 1..100 ou cursor inválido retorna `INVALID_QUERY` antes do acesso. | `packages/application/src/ledger/queries/list-account-statement.test.ts:93-109` — código exato e repositories/port não chamados. | ✅ PASS |
| FQR-28 | Conta alvo ausente/cross-book retorna `ENTITY_NOT_FOUND` sem items/port. | `packages/application/src/ledger/queries/list-account-statement.test.ts:112-142` — ambos os casos, código exato, mensagem da ausente e `not.toHaveBeenCalled()`. | ✅ PASS |
| FQR-29 | `ListJournalEntries` retorna página com `items` e `nextCursor`. | `packages/application/src/ledger/queries/list-journal-entries.test.ts:41-44` — `Result.ok` com item e cursor codificado. | ✅ PASS |
| FQR-30 | Lista global usa `occurredOn DESC` e sequência decimal DESC. | `packages/infrastructure-sqlite/tests/queries/sqlite-journal-entries.test.ts:263-266` — ordem 11/10/9 e key exata. | ✅ PASS |
| FQR-31 | Cursor global exclui todos os itens anteriores e continua estritamente. | `packages/infrastructure-sqlite/tests/queries/sqlite-journal-entries.test.ts:263-266` — primeira/segunda página sem repetição e null final. | ✅ PASS |
| FQR-32 | Filtros fazem união dentro de cada lista e interseção entre grupos. | `packages/infrastructure-sqlite/tests/queries/sqlite-journal-entries.test.ts:183-221` — dois account IDs, dois category IDs e dois origins retornam exatamente os quatro IDs da interseção. | ✅ PASS |
| FQR-33 | Search faz trim, substring literal e case-sensitive. | `packages/application/src/querying/query-validation.test.ts:124-128` — trim e vazio; `packages/infrastructure-sqlite/tests/queries/sqlite-journal-entries.test.ts:225-245` — somente descrição `Salary` para busca case-sensitive. | ✅ PASS |
| FQR-34 | Item global contém todos os campos e classificações exatos. | `packages/infrastructure-sqlite/tests/queries/sqlite-journal-entries.test.ts:140-158` — `toEqual` completo do DTO, incluindo recordedAt, sequence, description, arrays, valores e flags. | ✅ PASS |
| FQR-35 | `financialAccounts` e `categories` são separados, com id/name/kind e ordenação. | `packages/infrastructure-sqlite/tests/queries/sqlite-journal-entries.test.ts:129-138` — summaries financeiros; `:171-178` — categories e `isSplit` exatos. | ✅ PASS |
| FQR-36 | `incomeMinor` soma INCOME exibido e `expenseMinor` soma EXPENSE. | `packages/infrastructure-sqlite/tests/queries/sqlite-journal-entries.test.ts:118-127` — valores exatos para salary/groceries. | ✅ PASS |
| FQR-37 | Transferência ASSET/LIABILITY de dois postings retorna valor absoluto; demais formas retornam `"0"`. | `packages/infrastructure-sqlite/tests/queries/sqlite-journal-entries.test.ts:118-127` — transfer ASSET `20` e LIABILITY `15`; `:332-340` — par com categoria retorna `"0"`. | ✅ PASS |
| FQR-38 | Mais de um posting INCOME/EXPENSE é split; demais casos não. | `packages/infrastructure-sqlite/tests/queries/sqlite-journal-entries.test.ts:171-178` — split true; `:129-138` — transferência false. | ✅ PASS |
| FQR-39 | Lista/origin vazia ou search vazio retorna `INVALID_QUERY` sem acesso. | `packages/application/src/ledger/queries/list-journal-entries.test.ts:74-87` — código exato e book/port não chamados. | ✅ PASS |
| FQR-40 | Retorna todo mês inclusivo, inclusive vazio. | `packages/infrastructure-sqlite/tests/queries/sqlite-monthly-cash-flow.test.ts:88-96` — sequência August/September vazio/October exata. | ✅ PASS |
| FQR-41 | Income mensal soma display de postings INCOME. | `packages/infrastructure-sqlite/tests/queries/sqlite-monthly-cash-flow.test.ts:107` — `incomeMinor: "100"`. | ✅ PASS |
| FQR-42 | Expense mensal soma postings EXPENSE. | `packages/infrastructure-sqlite/tests/queries/sqlite-monthly-cash-flow.test.ts:107` — `expenseMinor: "35"`. | ✅ PASS |
| FQR-43 | `netMinor` é `incomeMinor - expenseMinor` com aritmética exata. | `packages/infrastructure-sqlite/tests/queries/sqlite-monthly-cash-flow.test.ts:107` — `netMinor: "65"`. | ✅ PASS |
| FQR-44 | Entry somente ASSET/LIABILITY contribui zero. | `packages/infrastructure-sqlite/tests/queries/sqlite-monthly-cash-flow.test.ts:124-126` — cenário de payment/transfer espera somente expense `50`, income `0`. | ✅ PASS |
| FQR-45 | Compra em LIABILITY com EXPENSE conta na data da compra. | `packages/infrastructure-sqlite/tests/queries/sqlite-monthly-cash-flow.test.ts:119-126` — despesa `50` e net `-50` no mês da compra. | ✅ PASS |
| FQR-46 | Original/reversor são agregados nos meses de ocorrência e o período completo fecha líquido zero. | `packages/infrastructure-sqlite/tests/queries/sqlite-monthly-cash-flow.test.ts:129-145` — August `100`, September `-100`, redução net total `"0"`. | ✅ PASS |
| FQR-47 | `fromMonth > toMonth` retorna `INVALID_QUERY` antes do adapter. | `packages/application/src/insights/queries/get-monthly-cash-flow.test.ts:49-60` — código exato e book/query não chamados. | ✅ PASS |
| FQR-48 | Agrupa postings EXPENSE por categoria no intervalo inclusivo. | `packages/infrastructure-sqlite/tests/queries/sqlite-category-spending.test.ts:35-47` — Food `70` e Travel `30` no período. | ✅ PASS |
| FQR-49 | Item de categoria contém id, name, amount, basis points, count e archived. | `packages/infrastructure-sqlite/tests/queries/sqlite-category-spending.test.ts:51-65` — `toEqual` completo, incluindo `categoryName: "Food"`. | ✅ PASS |
| FQR-50 | Split atribui a cada categoria somente seu próprio posting. | `packages/infrastructure-sqlite/tests/queries/sqlite-category-spending.test.ts:35-47` — Food `70` e Travel `30` separados. | ✅ PASS |
| FQR-51 | Categoria arquivada com movimento permanece. | `packages/infrastructure-sqlite/tests/queries/sqlite-category-spending.test.ts:51-65` — `archived: true` e item preservado. | ✅ PASS |
| FQR-52 | Original e reversor somam sinais opostos ao net exato. | `packages/infrastructure-sqlite/tests/queries/sqlite-category-spending.test.ts:51-65` — `amountMinor: "0"` após original/reversor. | ✅ PASS |
| FQR-53 | Count inclui originais positivos distintos e exclui reversor. | `packages/infrastructure-sqlite/tests/queries/sqlite-category-spending.test.ts:51-65` — `transactionCount: 1` no par original/reversor. | ✅ PASS |
| FQR-54 | Basis points usam positivos líquidos, truncam inteiro e zeram denominador zero. | `packages/infrastructure-sqlite/tests/queries/sqlite-category-spending.test.ts:69-76` — `6666`/`3333`; `:58-65` — denominador zero `0`. | ✅ PASS |
| FQR-55 | Ordena amount DESC, name ASC e ID ASC. | `packages/infrastructure-sqlite/tests/queries/sqlite-category-spending.test.ts:94-112` — empate de nome retorna IDs `[firstId, secondId]` em ordem crescente; `:45-47` cobre amount. | ✅ PASS |
| FQR-56 | Período sem EXPENSE retorna lista vazia. | `packages/infrastructure-sqlite/tests/queries/sqlite-category-spending.test.ts:88-92` — `resolves.toEqual([])`. | ✅ PASS |
| FQR-57 | Net worth retorna asset, liability, net worth, currency e asOf. | `packages/infrastructure-sqlite/tests/queries/sqlite-net-worth.test.ts:31-37` — DTO completo exato. | ✅ PASS |
| FQR-58 | Asset soma display de todas contas ASSET, inclusive archived e negativas. | `packages/infrastructure-sqlite/tests/queries/sqlite-net-worth.test.ts:40-47` — archived `75`; `:107-122` — saldo asset negativo e string int64 exata. | ✅ PASS |
| FQR-59 | Liability soma display de todas LIABILITY, inclusive archived e negativas. | `packages/infrastructure-sqlite/tests/queries/sqlite-net-worth.test.ts:81-104` — liability arquivada e liability display negativa, `liabilityMinor: "-125"`. | ✅ PASS |
| FQR-60 | `netWorthMinor` é exatamente `assetMinor - liabilityMinor`. | `packages/infrastructure-sqlite/tests/queries/sqlite-net-worth.test.ts:31-37` — `100 - 200 = -100`; `:98-104` prova outra equação. | ✅ PASS |
| FQR-61 | `asOf` inclusivo aplica-se aos três valores; omitido lê todo ledger. | `packages/infrastructure-sqlite/tests/queries/sqlite-net-worth.test.ts:58-78` — historical/current/omitted DTOs completos com asset, liability, net worth e asOf. | ✅ PASS |
| FQR-62 | Livro sem contas/atividade retorna três `"0"` e moeda-base. | `packages/infrastructure-sqlite/tests/queries/sqlite-net-worth.test.ts:125-134` — DTO zero completo. | ✅ PASS |
| FQR-63 | Queries usam SQLite `:memory:`, migrations reais e fixtures válidas. | `packages/infrastructure-sqlite/tests/support/financial-query-scenario.test.ts:48` — cenário de setup válido; `packages/infrastructure-sqlite/tests/migrations/financial-query-migrations.test.ts:35` — migration real/upgrade. | ✅ PASS |
| FQR-64 | Valores dentro de int64 e acima de safe integer preservam strings decimais. | `packages/infrastructure-sqlite/tests/queries/sqlite-net-worth.test.ts:107-122` — `9007199254740993` e `-18014398509481986` exatos. | ✅ PASS |
| FQR-65 | Multi-SELECTs compartilham snapshot em `BEGIN` deferred, nunca `BEGIN IMMEDIATE`. | `packages/infrastructure-sqlite/tests/queries/sqlite-query-integrity.test.ts:151-211` — queries reais, `queryCount === 2`, `BEGIN`, `not.toContain("BEGIN IMMEDIATE")`, `COMMIT`, writer só após snapshot; rollback real em `:215-246`. | ✅ PASS |
| FQR-66 | Statement count é constante apesar da cardinalidade retornada. | `packages/infrastructure-sqlite/tests/queries/sqlite-query-integrity.test.ts:249-296` — balances `1/1`, statement `2/2`, journal `2/2` para recortes de uma/muitas linhas; capability-specific aggregate tests também fixam um statement (`sqlite-monthly-cash-flow.test.ts:182-188`, `sqlite-category-spending.test.ts:129-136`, `sqlite-net-worth.test.ts:137-144`). | ✅ PASS |
| FQR-67 | Planos dos SQLs efetivamente emitidos usam índices book/filter/order aplicáveis. | `packages/infrastructure-sqlite/tests/queries/sqlite-query-plan.test.ts:115-160` — captura SQL real, executa `EXPLAIN QUERY PLAN` e afirma `ix_ledger_accounts_book`, `ix_postings_book_account_entry_position`, `ix_postings_account_entry` e `ix_journal_entries_book_date_sequence_numeric`. | ✅ PASS |
| FQR-68 | Falha SQLite chega como `UNEXPECTED_ERROR`/`Financial query failed`, sem SQL/params/path/driver. | `packages/infrastructure-sqlite/tests/public-api.test.ts:143-152` — driver fechado na fronteira pública, código/mensagem exatos e `not.toMatch(/SQL|parameters|closed|\.db|\//i)`. | ✅ PASS |
| FQR-69 | Build, lint, typecheck e testes concluem sem warnings/skips. | Gate abaixo: quatro comandos 0, migration check 0, 895 testes passados e 0 skips. | ✅ PASS |
| FQR-70 | Zero accounts permanecem por default/true e são removidas por false após `asOf`. | `packages/infrastructure-sqlite/tests/queries/sqlite-account-balances.test.ts:193-213` — zero future account aparece com `includeZeroBalance: true` e `not.toContainEqual` com false. | ✅ PASS |
| FQR-71 | Pagamento de LIABILITY sem INCOME/EXPENSE não entra no cash flow. | `packages/infrastructure-sqlite/tests/queries/sqlite-monthly-cash-flow.test.ts:119-126` — somente compra expense `50`, income zero. | ✅ PASS |
| FQR-72 | `categoryId` filtra categoria exata, sem descendentes. | `packages/infrastructure-sqlite/tests/queries/sqlite-category-spending.test.ts:81-86` — IDs resultantes são exatamente `[foodId]`. | ✅ PASS |

**Spec-anchored status**: ✅ 72/72 ACs têm evidência de asserção compatível com o outcome exato da spec; 0 gaps; 0 spec-precision gaps.

## Discrimination Sensor

O sensor foi executado em cópias isoladas sob `/tmp`, criadas com `git archive HEAD`; não houve `git stash`. O porcelain real foi capturado antes e depois e permaneceu exatamente:

```text
 M .specs/LESSONS.md
 M .specs/lessons.json
?? .specs/features/financial-ledger-queries/validation.md
```

| Mutation | Scratch target | Description | Result |
| --- | --- | --- | --- |
| 1 | `packages/infrastructure-sqlite/src/queries/sqlite-ledger-queries.ts:345` | `input.limit + 1` → `input.limit` no page fetch. | ✅ Killed — `sqlite-journal-entries.test.ts`: 1 failed, 10 passed. |
| 2 | `packages/infrastructure-sqlite/src/queries/sqlite-query-values.ts:86` | Branch de `toDisplayMinor` invertida. | ✅ Killed — `sqlite-query-values.test.ts`: 5 failed, 9 passed. |
| 3 | `packages/infrastructure-sqlite/src/queries/sqlite-insight-queries.ts:93` | Count de reversor `IS NULL` → `IS NOT NULL`. | ✅ Killed — `sqlite-category-spending.test.ts`: 1 failed, 8 passed. |

**Sensor depth**: lightweight, três mutações comportamentais de maior risco.
**Sensor result**: ✅ 3/3 killed, 0 survived.
**Isolation**: ✅ porcelain real idêntico antes/depois; todos os scratch dirs foram removidos.

## Interactive UAT

N/A. A feature é backend/application/SQLite e não possui superfície interativa.

## Code Quality

| Principle | Status | Evidence / note |
| --- | --- | --- |
| No features beyond requested scope | ✅ | Diff de produção está limitado às sete capacidades, contratos, migrations, fixtures e testes da feature. |
| No single-use abstractions or unrequested flexibility | ✅ | Cursor, value helpers e read transaction são abstrações previstas em `design.md`. |
| Surgical changes and no unrelated improvement | ✅ | Os quatro commits de fix adicionam somente evidência dos gaps listados; `git diff --check 216f51d..c3e7502` passou. |
| Existing patterns and project style | ✅ | Lint passou com `--max-warnings 0`; testes usam Vitest e builders existentes. |
| Test integrity | ✅ | Nenhum teste foi removido, ignorado, desabilitado ou enfraquecido; fixes adicionaram asserções exatas. |
| Senior-engineer approval of implementation shape | ✅ | Contratos, adapters e snapshots seguem o design aprovado; o sensor matou as três mutações. |
| Spec-anchored asserted values | ✅ | 72/72 outcomes exatos na tabela acima. |
| Per-layer coverage expectation | ✅ | Handlers unitários, adapters SQLite, migrations, database, plans, precision e public API têm evidência. |
| Every in-scope test maps to a requirement or done-when criterion | ✅ | Integrity, plans, public boundary e outcome tests mapeiam ACs/edge cases da feature. |
| Documented guidelines followed | ✅ | `.codex/skills/tlc-spec-driven/references/coding-principles.md`; `tasks.md` declara nenhum guideline adicional. |

## Edge Cases

| Edge case from spec | Result |
| --- | --- |
| Cross-book filter/data isolation | ✅ `sqlite-account-balances.test.ts:268-279`, `sqlite-journal-entries.test.ts:291-302`, monthly/category isolation. |
| Decimal sequence `9`/`10` and values above safe integer | ✅ `sqlite-account-statement.test.ts:98-106`, `sqlite-journal-entries.test.ts:263-266`. |
| Multiple postings use `postingPosition` | ✅ `sqlite-account-statement.test.ts:237-240`. |
| Reversal in later month | ✅ `sqlite-monthly-cash-flow.test.ts:129-145`; statement cancellation `sqlite-account-statement.test.ts:313-338`. |
| Negative displayed liability in net worth | ✅ `sqlite-net-worth.test.ts:81-104` and `:107-122`. |
| All category values non-positive produce zero percentage | ✅ `sqlite-category-spending.test.ts:51-65`. |
| Page fetch is at most `limit + 1` | ✅ `sqlite-account-statement.test.ts:127-130`; sensor kills off-by-one removal. |
| Archived account historical effects | ✅ Archived balances `sqlite-account-balances.test.ts:137-164`, category `sqlite-category-spending.test.ts:51-65`, net worth `sqlite-net-worth.test.ts:40-47` and `:81-104`. |

## Gate Check

- **Workspace gate**: `pnpm build && pnpm lint && pnpm check-types && pnpm test` — ✅ exit 0.
- **Migration gate**: `pnpm --filter @open-coin/infrastructure-sqlite check:migrations` — ✅ exit 0.
- **Structural task validator**: `python3 .codex/skills/tlc-spec-driven/scripts/validate_tasks.py financial-ledger-queries` — ✅ 0 errors, 0 warnings.
- **Diff whitespace check**: `git diff --check 216f51d..c3e7502` — ✅ passed.
- **Tests**: 895 passed across 73 files: domain 115, application 88, infrastructure-memory 164, infrastructure-sqlite 528.
- **Failed tests**: 0.
- **Skipped tests**: 0; no Vitest skip/pending output and no warning output in the required gates.
- **Warnings**: 0 observed in lint/build/typecheck/test/migration outputs.
- **Test integrity delta**: no test deletion or weakening in the requested production range; the second cycle adds 17 passing assertions/tests over the prior 878-test report. The pre-feature comparison recorded in the first verifier pass was 712 → 895 (+183), with no skips.

## Lessons

No new lesson was registered in this cycle: there were no surviving mutants, uncovered ACs, spec-precision gaps or `SPEC_DEVIATION` signals after the four fix commits. Existing `.specs/LESSONS.md` and `.specs/lessons.json` changes were preserved and not counted as production.

## Requirement Traceability Update

`spec.md` was not edited, per verifier scope. Its statuses remain unchanged. This report is the independent evidence record for all 72 requirements.

## Closing Validation

`validate_state.py financial-ledger-queries` must be run after this report is written. A PASS verdict is recorded only if that deterministic validator accepts this file.

## Summary

**Overall**: ✅ Ready
**Spec-anchored check**: 72/72 matched exact spec outcomes; 0 gaps; 0 spec-precision gaps.
**Sensor**: 3/3 mutations killed, 0 survived, real porcelain unchanged.
**Gate**: build, lint, typecheck, tests and migration check passed; 895 tests, 0 failures, 0 skips.
**Gaps**: none.
