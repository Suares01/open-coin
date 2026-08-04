# Especificação das Queries Financeiras do Ledger

**Status**: Approved
**Feature version**: 1.0.0
**Depends on**: `.specs/features/financial-domain-core/` v1.1.0 e `.specs/features/financial-sqlite-persistence/` v1.0.0
**Approved on**: 2026-08-04

## Problem Statement

O Open Coin já persiste um ledger de partidas dobradas e expõe consultas básicas de saldo e extrato. A aplicação ainda não possui read models completos para listas operacionais, paginação, fluxo de caixa, gastos por categoria e patrimônio líquido.

Esta feature transforma o ledger SQLite em uma fronteira de leitura orientada a capacidades. As queries retornam DTOs serializáveis, preservam precisão monetária, isolam livros e aplicam as convenções contábeis sem reconstruir agregados de domínio.

## Goals

- [ ] Evoluir saldo e extrato sem quebrar os casos de uso públicos já implementados.
- [ ] Listar saldos, postings de uma conta e lançamentos globais com filtros e paginação por cursor estável.
- [ ] Calcular fluxo de caixa mensal, gastos por categoria e patrimônio líquido diretamente do ledger.
- [ ] Centralizar sinais de exibição e impedir soma entre moedas diferentes.
- [ ] Provar as queries contra SQLite `:memory:` com migrations e fixtures financeiramente válidas.

## Out of Scope

Explicitamente excluído deste recorte para evitar ampliar o domínio antes das leituras fundamentais.

| Feature | Reason |
| --- | --- |
| UI, Tauri, HTTP, CLI ou formatação localizada | Esta feature entrega contratos, handlers e adapters de leitura. |
| Payees, tags, projetos, memo e busca nesses campos | O schema atual não persiste esses conceitos. |
| Subtipos e hierarquia de contas ou categorias | `LedgerAccount` ainda não possui `subtype` nem `parentId`. |
| Consolidação opcional de categorias descendentes | Depende da hierarquia de contas. |
| Conversão cambial e market value de investimentos | O núcleo atual exige a moeda-base do livro em cada lançamento. |
| Filtro de fluxo de caixa por subconjunto de contas financeiras | Um lançamento com várias contas e categorias não contém vínculos que permitam alocação inequívoca. |
| Planejamento, orçamento, projeções e investimentos | Esses contextos ainda não possuem domínio ou persistência implementados. |
| Dashboard composto e snapshot entre capacidades distintas | Será especificado quando existir uma tela com esse requisito. |
| Cache ou read models persistidos | SQLite local será medido e indexado antes de introduzir invalidação ou projeções derivadas. |
| OFFSET pagination | As listas desta feature usam cursor por chave estável. |

---

## Assumptions & Open Questions

Toda ambiguidade está resolvida ou registrada aqui.

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| Escopo das queries fundamentais | Entregar as sete capacidades do texto: saldo de conta, saldos de contas, extrato, lista global, fluxo mensal, gastos por categoria e patrimônio líquido | Forma um recorte de leitura útil e mantém planning e investments fora da primeira entrega. | Sim |
| Relação com saldo e extrato existentes | Preservar `GetAccountBalance` e `GetAccountStatement`; enriquecer saldo de forma aditiva e criar um novo extrato paginado | Os contratos atuais já foram verificados nas duas features anteriores e não possuem paginação. | Sim |
| Organização dos ports | Agrupar capacidades operacionais em um port de ledger e indicadores em um port de insights; handlers dependem apenas do grupo necessário | Segue a recomendação do texto sem transformar repositories em serviços de relatório. | Sim |
| Adapter em memória | Manter somente a compatibilidade das duas queries legadas; as novas listas e agregações terão implementação de referência no SQLite | Reproduzir relatórios em arrays criaria uma segunda implementação contábil complexa e divergente. | Sim |
| Limite do modelo retornado | Omitir payee, subtipo e parent da V1 em vez de retornar campos sempre nulos | Read models devem refletir dados existentes, não antecipar schema futuro. | Sim |
| Ausência de `asOf` | Não aplicar limite superior e retornar `asOf: null` | Preserva a semântica pública atual de `GetAccountBalance` e não introduz dependência implícita de relógio. | Sim |
| Intervalos de data | `from`, `to` e `asOf` são inclusivos e usam `occurredOn`; `createdAt` e `recordedAt` não filtram competência financeira | `occurredOn` é a data financeira definida pelo núcleo. | Sim |
| Limites de página | Exigir `limit` inteiro entre 1 e 100; não aplicar default silencioso | Um bound explícito evita respostas ilimitadas e mantém o contrato determinístico. | Sim |
| Busca global | Comparar a substring informada com `description` de forma literal e sensível a caixa após `trim` | O schema não possui texto normalizado nem uma política de busca Unicode confirmada. | Sim |
| Saldos de contas arquivadas | Omitir por default nas listas operacionais, mas sempre incluí-las em histórico e patrimônio; permitir inclusão explícita em `ListAccountBalances` | Arquivamento impede operação futura, não apaga efeitos financeiros passados. | Sim |
| Percentuais de categoria | Calcular sobre valores líquidos positivos, em basis points por divisão inteira; restos não são redistribuídos e total zero produz zero para todas as categorias | Evita ponto flutuante e define um resultado estável sem inventar regra de arredondamento visual. | Sim |
| Contagem de transações por categoria | Contar lançamentos originais distintos com posting positivo na categoria; o lançamento reversor não incrementa a contagem | A reversão anula valor, mas o fato histórico da compra continua existindo. | Sim |
| Moeda | Retornar a moeda-base do livro e nunca agrupar valores de moedas diferentes | O domínio V1 rejeita lançamentos fora da moeda-base; conversão cambial permanece fora. | Sim |

**Open questions:** none. Todos os defaults foram aprovados em 2026-08-04.

## Implicit Requirement Dimensions

| Dimension | Resolution |
| --- | --- |
| Input validation & bounds | Coberta por FQR-03, FQR-04, FQR-16, FQR-17, FQR-27, FQR-28, FQR-39 e FQR-47. |
| Failure / partial-failure states | Coberta por FQR-05, FQR-12, FQR-18, FQR-29 e FQR-56. Queries não produzem estado parcial. |
| Idempotency / retry / duplicate handling | Leituras são repetíveis e não alteram estado, coberto por FQR-06 e FQR-54. Deduplicação de commands não pertence a esta feature. |
| Auth boundaries & rate limits | N/A porque os pacotes locais não expõem transporte nem identidade autenticada; isolamento defensivo por `bookId` é coberto por FQR-05. |
| Concurrency / ordering | Coberta por FQR-19, FQR-20, FQR-30, FQR-31 e FQR-65. |
| Data lifecycle / expiry | N/A porque queries não criam, expiram ou removem dados; contas arquivadas são cobertas por FQR-14, FQR-51, FQR-58 e FQR-59. |
| Observability | N/A porque o projeto ainda não definiu porta de logging, métricas ou tracing. Query plans verificáveis são cobertos por FQR-67. |
| External-dependency failure | Coberta por FQR-56 para falhas do driver SQLite local; não há serviço remoto. |
| State-transition integrity | N/A porque queries não alteram agregados, status, versões, sequências ou eventos; essa ausência de efeitos é coberta por FQR-06. |

---

## User Stories

### P1: Expor uma fronteira de leitura segura ⭐ MVP

**User Story**: Como consumidor da aplicação, quero executar queries por contratos próprios para receber dados prontos sem depender de agregados ou detalhes do SQLite.

**Why P1**: Todas as capacidades de leitura dependem de uma fronteira serializável e isolada por livro.

**Acceptance Criteria**:

1. The camada de aplicação SHALL definir inputs, páginas e read models das queries sem importar `@open-coin/infrastructure-sqlite`. (`FQR-01`)
2. The query layer SHALL retornar somente objetos e arrays `readonly` compostos por strings, números inteiros seguros, booleanos, `null` e outros read models. (`FQR-02`)
3. IF uma query receber data fora do formato de dia real `YYYY-MM-DD`, mês fora de `YYYY-MM` ou intervalo inicial posterior ao final THEN a aplicação SHALL retornar `INVALID_QUERY` sem consultar o adapter. (`FQR-03`)
4. IF uma query receber kind, ID obrigatório, cursor ou limite fora do contrato THEN a aplicação SHALL retornar `INVALID_QUERY` sem devolver resultado parcial. (`FQR-04`)
5. WHEN qualquer query acessar ledger, contas ou postings THEN o adapter SHALL filtrar explicitamente todas as relações pelo `bookId` solicitado. (`FQR-05`)
6. WHEN uma query for executada THEN a aplicação SHALL produzir zero escrita, zero alteração de versão e zero evento de domínio. (`FQR-06`)
7. The query layer SHALL transportar todo valor monetário e sequência como string decimal exata, sem expor `bigint` ou converter por `number`. (`FQR-07`)
8. The query layer SHALL usar a moeda-base do livro como a única moeda de cada resultado agregado desta feature. (`FQR-08`)

**Independent Test**: Compilar application sem dependência de infraestrutura, executar uma query duas vezes sobre o mesmo banco e comparar DTOs, tabelas, versões e eventos antes e depois.

### P1: Consultar um saldo e listar saldos de contas ⭐ MVP

**User Story**: Como usuário local, quero consultar uma conta ou todas as contas para visualizar posições financeiras e categorias com sinais consistentes.

**Why P1**: Saldos são a base para seleção de contas, visão patrimonial e diagnósticos do ledger.

**Acceptance Criteria**:

1. WHEN `GetAccountBalance` consultar uma conta válida THEN a aplicação SHALL retornar `accountId`, `accountName`, `accountKind`, `rawBalanceMinor`, `displayBalanceMinor`, o alias compatível `amountMinor`, `currency` e `asOf`. (`FQR-09`)
2. WHEN um saldo for calculado THEN a query SHALL somar os postings da conta com `occurredOn` menor ou igual ao `asOf` inclusivo, ou todos os postings quando `asOf` for omitido. (`FQR-10`)
3. WHEN um saldo for convertido para exibição THEN a query SHALL manter o sinal bruto para `ASSET` e `EXPENSE`, inverter o sinal para `LIABILITY`, `INCOME` e `EQUITY`, e manter `amountMinor` igual a `displayBalanceMinor`. (`FQR-11`)
4. IF `GetAccountBalance` receber uma conta ausente ou pertencente a outro livro THEN a aplicação SHALL retornar `ENTITY_NOT_FOUND` sem revelar a existência da conta em outro livro. (`FQR-12`)
5. WHEN uma conta não possuir postings no recorte consultado THEN a query SHALL retornar saldos bruto e de exibição iguais a `"0"`. (`FQR-13`)
6. WHEN `ListAccountBalances` for executada sem `includeArchived` THEN a query SHALL omitir contas `ARCHIVED`; WHEN `includeArchived` for `true` THEN a query SHALL incluí-las. (`FQR-14`)
7. WHEN `ListAccountBalances` receber `accountKinds` THEN a query SHALL retornar somente contas do livro cujo kind pertença ao conjunto informado. (`FQR-15`)
8. IF `accountKinds` for um array vazio THEN `ListAccountBalances` SHALL retornar uma lista vazia. (`FQR-16`)
9. WHEN `ListAccountBalances` retornar itens THEN a query SHALL ordená-los por `accountKind`, `accountName` e `accountId`, todos em ordem crescente. (`FQR-17`)
10. WHEN `includeZeroBalance` for omitido ou `true` THEN `ListAccountBalances` SHALL manter contas zeradas; WHEN for `false` THEN SHALL omiti-las depois de aplicar `asOf`. (`FQR-70`)

**Independent Test**: Criar os cinco kinds, postar valores em datas diferentes, arquivar uma conta e comparar saldos bruto e visual em consulta individual e lista filtrada.

### P1: Paginar o extrato de uma conta ⭐ MVP

**User Story**: Como usuário local, quero percorrer o extrato de uma conta sem perder ou repetir movimentos quando o volume crescer.

**Why P1**: O extrato é a leitura operacional central e precisa de ordem total, saldo corrente e cursor estável.

**Acceptance Criteria**:

1. WHEN `ListAccountStatement` consultar uma conta válida THEN a aplicação SHALL retornar uma página com `items` e `nextCursor`. (`FQR-18`)
2. WHEN itens de extrato forem ordenados THEN a query SHALL usar `occurredOn DESC`, `sequence DESC` e `postingPosition DESC` como ordem total. (`FQR-19`)
3. WHEN uma página possuir mais resultados depois do último item retornado THEN a query SHALL fornecer um cursor opaco que continue estritamente depois da tupla desse item. (`FQR-20`)
4. WHEN não houver mais resultados THEN `ListAccountStatement` SHALL retornar `nextCursor: null`. (`FQR-21`)
5. WHEN `from` ou `to` forem informados THEN a query SHALL incluir somente itens cujo `occurredOn` esteja no intervalo inclusivo. (`FQR-22`)
6. WHEN um item de extrato for retornado THEN ele SHALL conter `entryId`, `postingId`, `occurredOn`, `recordedAt`, `sequence`, `description`, `rawAmountMinor`, `displayAmountMinor`, `runningBalanceMinor`, `currency`, `origin`, `counterpartyAccounts`, `isReversal` e `isReversed`. (`FQR-23`)
7. WHEN `runningBalanceMinor` for calculado THEN a query SHALL acumular todo o histórico da conta até o item em ordem ascendente, inclusive movimentos anteriores a `from` e a páginas já percorridas. (`FQR-24`)
8. WHEN `counterpartyAccounts` for montado THEN a query SHALL incluir `id`, `name` e `kind` das outras contas do mesmo lançamento uma única vez e ordená-las por `name` e `id` crescentes. (`FQR-25`)
9. WHEN um lançamento original e seu reversor estiverem no intervalo THEN a query SHALL exibir ambos e seus efeitos monetários SHALL se anular no saldo corrente depois do reversor. (`FQR-26`)
10. IF `limit` estiver fora de 1 a 100 ou o cursor não puder ser decodificado para uma chave válida THEN a aplicação SHALL retornar `INVALID_QUERY`. (`FQR-27`)
11. IF a conta alvo estiver ausente ou pertencer a outro livro THEN a aplicação SHALL retornar `ENTITY_NOT_FOUND` sem devolver itens. (`FQR-28`)

**Independent Test**: Paginar um extrato com empates de data, split, transferência e reversão, concatenar as páginas e comparar IDs, ordem e saldos com a sequência completa esperada.

### P1: Listar lançamentos globais ⭐ MVP

**User Story**: Como usuário local, quero buscar e filtrar lançamentos do livro para construir uma visão global de transações.

**Why P1**: Uma tela de transações não pode depender do extrato de uma conta nem reconstruir agregados para cada linha.

**Acceptance Criteria**:

1. WHEN `ListJournalEntries` for executada THEN a aplicação SHALL retornar uma página com `items` e `nextCursor`. (`FQR-29`)
2. WHEN lançamentos forem ordenados THEN a query SHALL usar `occurredOn DESC` e `sequence DESC` como ordem total. (`FQR-30`)
3. WHEN o cursor for reutilizado sobre o mesmo filtro THEN a página seguinte SHALL excluir todos os itens anteriores e começar estritamente depois da chave codificada. (`FQR-31`)
4. WHEN `from`, `to`, `accountIds`, `categoryIds` ou `origins` forem informados THEN a query SHALL aplicar união dentro de cada lista e interseção entre grupos de filtros. (`FQR-32`)
5. WHEN `search` for informado THEN a query SHALL aplicar `trim` e retornar somente descrições que contenham literalmente a substring não vazia, com distinção de caixa. (`FQR-33`)
6. WHEN um item global for retornado THEN ele SHALL conter `id`, `occurredOn`, `recordedAt`, `sequence`, `description`, `origin`, `financialAccounts`, `categories`, `incomeMinor`, `expenseMinor`, `transferMinor`, `currency`, `isSplit`, `isReversal` e `isReversed`. (`FQR-34`)
7. WHEN contas forem agregadas em um item THEN `financialAccounts` e `categories` SHALL conter itens com `id`, `name` e `kind`, separados entre kinds financeiros e de categoria e ordenados por `name` e `id` crescentes. (`FQR-35`)
8. WHEN valores do item forem calculados THEN `incomeMinor` SHALL somar os saldos de exibição dos postings `INCOME` e `expenseMinor` SHALL somar os postings `EXPENSE`. (`FQR-36`)
9. WHEN um lançamento tiver exatamente dois postings, ambos em contas `ASSET` ou `LIABILITY`, e nenhum posting de categoria THEN `transferMinor` SHALL ser o valor absoluto de um dos lados; em qualquer outro caso SHALL ser `"0"`. (`FQR-37`)
10. WHEN um lançamento contiver mais de um posting em contas `INCOME` ou `EXPENSE` THEN `isSplit` SHALL ser `true`; nos demais casos SHALL ser `false`. (`FQR-38`)
11. IF qualquer lista de IDs ou origins for informada vazia, ou `search` ficar vazio depois de `trim`, THEN `ListJournalEntries` SHALL retornar `INVALID_QUERY`. (`FQR-39`)

**Independent Test**: Criar receita, despesa, transferência, split, ajuste e reversão, então provar campos, classificação, filtros, busca e paginação sem N+1.

### P1: Calcular fluxo de caixa mensal ⭐ MVP

**User Story**: Como usuário local, quero comparar receitas, despesas e resultado por mês sem contar transferências ou pagamentos de dívida duas vezes.

**Why P1**: Fluxo mensal é o primeiro indicador temporal do produto.

**Acceptance Criteria**:

1. WHEN `GetMonthlyCashFlow` receber `fromMonth` e `toMonth` válidos THEN a query SHALL retornar um item para cada mês do intervalo inclusivo, inclusive meses sem movimento. (`FQR-40`)
2. WHEN um item mensal for calculado THEN `incomeMinor` SHALL somar o saldo de exibição dos postings em contas `INCOME` ocorridos no mês. (`FQR-41`)
3. WHEN um item mensal for calculado THEN `expenseMinor` SHALL somar os postings em contas `EXPENSE` ocorridos no mês. (`FQR-42`)
4. WHEN `netMinor` for calculado THEN a query SHALL retornar `incomeMinor - expenseMinor` com aritmética inteira exata. (`FQR-43`)
5. WHEN um lançamento contiver somente contas `ASSET` ou `LIABILITY` THEN a query SHALL contribuir `"0"` para receita e despesa. (`FQR-44`)
6. WHEN uma compra em passivo contiver posting `EXPENSE` THEN a query SHALL contabilizá-la como despesa na `occurredOn` da compra. (`FQR-45`)
7. WHEN o pagamento de um passivo não contiver posting `INCOME` ou `EXPENSE` THEN a query SHALL ignorá-lo no fluxo de caixa. (`FQR-71`)
8. WHEN lançamentos originais e reversores estiverem no intervalo THEN a query SHALL agregá-los nos respectivos meses de `occurredOn` e preservar o efeito líquido do período completo. (`FQR-46`)
9. IF `fromMonth` for posterior a `toMonth` THEN a aplicação SHALL retornar `INVALID_QUERY`. (`FQR-47`)

**Independent Test**: Consultar meses com receita, despesa em ativo, compra e pagamento de passivo, transferência, split, reversão em outro mês e mês vazio.

### P1: Agregar gastos por categoria ⭐ MVP

**User Story**: Como usuário local, quero saber quanto gastei em cada categoria para comparar participação e frequência no período.

**Why P1**: A categorização só gera valor quando pode ser agregada sem perder splits ou histórico.

**Acceptance Criteria**:

1. WHEN `GetCategorySpending` receber `from` e `to` válidos THEN a query SHALL agrupar postings de contas `EXPENSE` por categoria no intervalo inclusivo. (`FQR-48`)
2. WHEN um item de categoria for retornado THEN ele SHALL conter `categoryId`, `categoryName`, `amountMinor`, `percentageBasisPoints`, `transactionCount` e `archived`. (`FQR-49`)
3. WHEN um lançamento dividido contiver postings em categorias diferentes THEN a query SHALL atribuir a cada categoria exatamente o valor do seu próprio posting. (`FQR-50`)
4. WHEN uma categoria arquivada tiver movimento no período THEN a query SHALL mantê-la no resultado. (`FQR-51`)
5. WHEN original e reversor atingirem a mesma categoria THEN seus valores SHALL se somar com sinais opostos e produzir o efeito líquido do período. (`FQR-52`)
6. WHEN `transactionCount` for calculado THEN a query SHALL contar lançamentos originais distintos com contribuição positiva na categoria e não SHALL contar o lançamento reversor. (`FQR-53`)
7. WHEN `percentageBasisPoints` for calculado THEN a query SHALL dividir cada `max(amountMinor, 0)` pela soma dos valores líquidos positivos, multiplicar por `10000` e truncar o resto inteiro; IF o denominador for zero THEN SHALL retornar `0`. (`FQR-54`)
8. WHEN itens de categoria forem retornados THEN a query SHALL ordená-los por `amountMinor` decrescente, `categoryName` crescente e `categoryId` crescente. (`FQR-55`)
9. WHEN o período não possuir postings `EXPENSE` THEN `GetCategorySpending` SHALL retornar uma lista vazia. (`FQR-56`)
10. WHEN `categoryId` for informado THEN `GetCategorySpending` SHALL retornar somente a categoria exata, sem incluir descendentes. (`FQR-72`)

**Independent Test**: Agregar categorias ativa e arquivada com split, percentuais não inteiros, reversão e período vazio, conferindo strings e basis points exatos.

### P1: Calcular patrimônio líquido ⭐ MVP

**User Story**: Como usuário local, quero ver ativos, passivos e patrimônio líquido em uma data para acompanhar minha posição financeira.

**Why P1**: Patrimônio resume o estado das contas financeiras sem misturar receitas, despesas ou equity.

**Acceptance Criteria**:

1. WHEN `GetNetWorth` for executada THEN a query SHALL retornar `assetMinor`, `liabilityMinor`, `netWorthMinor`, `currency` e `asOf`. (`FQR-57`)
2. WHEN ativos forem agregados THEN `assetMinor` SHALL somar os saldos de exibição de todas as contas `ASSET` do livro, inclusive arquivadas e negativas. (`FQR-58`)
3. WHEN passivos forem agregados THEN `liabilityMinor` SHALL somar os saldos de exibição de todas as contas `LIABILITY` do livro, inclusive arquivadas e negativas. (`FQR-59`)
4. WHEN patrimônio líquido for calculado THEN `netWorthMinor` SHALL ser `assetMinor - liabilityMinor`. (`FQR-60`)
5. WHEN `asOf` for informado THEN todos os três valores SHALL considerar somente postings com `occurredOn` menor ou igual à data inclusiva; WHEN omitido THEN SHALL considerar todo o ledger. (`FQR-61`)
6. WHEN o livro não possuir contas financeiras ou todas estiverem zeradas THEN a query SHALL retornar `"0"` para os três valores. (`FQR-62`)

**Independent Test**: Combinar ativo positivo e negativo, cartão, empréstimo, conta arquivada, reversão e data histórica, verificando a equação exata.

### P1: Provar precisão, consistência e custo limitado ⭐ MVP

**User Story**: Como mantenedor, quero testes e query plans verificáveis para que os read models não introduzam divergência contábil ou degradação proporcional ao número de itens.

**Why P1**: Resultados corretos em fixtures pequenas não bastam para provar precisão, snapshot e ausência de N+1.

**Acceptance Criteria**:

1. The suíte de queries SHALL usar SQLite `:memory:`, migrations reais e fixtures criadas por casos de uso ou builders de domínio válidos. (`FQR-63`)
2. WHEN uma query ler valores dentro do intervalo inteiro assinado de 64 bits e acima de `Number.MAX_SAFE_INTEGER` THEN o resultado SHALL preservar a string decimal exata. (`FQR-64`)
3. WHEN uma query exigir múltiplos `SELECT`s para montar um resultado THEN todos os statements SHALL executar no mesmo snapshot por uma transação de leitura deferred, sem `BEGIN IMMEDIATE`. (`FQR-65`)
4. The número de statements executados por uma query SHALL permanecer constante em relação à quantidade de itens retornados. (`FQR-66`)
5. WHEN os planos de saldo, extrato e listas paginadas forem inspecionados THEN `EXPLAIN QUERY PLAN` SHALL demonstrar busca por índices iniciados em `book_id` e nas chaves de filtro e ordenação aplicáveis, sem scan integral por item. (`FQR-67`)
6. IF o driver SQLite falhar THEN a fronteira pública SHALL retornar um `ApplicationError` sanitizado sem SQL, parâmetros, caminho de arquivo ou detalhes do driver. (`FQR-68`)
7. WHEN os gates da feature forem executados THEN build, lint, typecheck e todos os testes SHALL concluir sem warnings nem testes ignorados. (`FQR-69`)

**Independent Test**: Instrumentar statements, executar cada query com volume suficiente para várias páginas, inspecionar planos, provocar falha do driver e rodar os gates focados e do workspace.

---

## Edge Cases

- IF um ID de filtro pertencer a outro livro THEN a query SHALL tratá-lo como sem correspondência e não SHALL expor dados nem confirmar a existência da entidade externa. (`FQR-05`)
- WHEN duas entries compartilharem `occurredOn` THEN a sequência decimal do livro SHALL desempatar sem conversão para `number`. (`FQR-19`, `FQR-30`)
- WHEN uma entry possuir mais de um posting na conta consultada THEN `postingPosition` SHALL impedir ordem ou cursor ambíguo. (`FQR-19`)
- WHEN uma reversão ocorrer em mês posterior ao original THEN cada mês SHALL refletir o fato ocorrido nele e o intervalo completo SHALL preservar o efeito líquido. (`FQR-46`)
- WHEN um passivo possuir saldo de exibição negativo THEN o patrimônio SHALL subtrair esse valor negativo conforme a equação definida. (`FQR-59`, `FQR-60`)
- IF todas as categorias tiverem valor líquido menor ou igual a zero THEN seus percentuais SHALL ser zero. (`FQR-54`)
- WHEN uma lista ultrapassar o limite da página THEN o adapter SHALL buscar no máximo `limit + 1` itens-base para determinar `nextCursor`. (`FQR-20`, `FQR-31`)
- WHEN uma conta arquivada tiver saldo ou movimento histórico THEN extrato, gastos e patrimônio SHALL preservar seus efeitos. (`FQR-24`, `FQR-51`, `FQR-58`, `FQR-59`)

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| --- | --- | --- | --- |
| FQR-01 | P1: Fronteira de leitura | Specify | Pending |
| FQR-02 | P1: Fronteira de leitura | Specify | Pending |
| FQR-03 | P1: Fronteira de leitura | Specify | Pending |
| FQR-04 | P1: Fronteira de leitura | Specify | Pending |
| FQR-05 | P1: Fronteira de leitura | Specify | Pending |
| FQR-06 | P1: Fronteira de leitura | Specify | Pending |
| FQR-07 | P1: Fronteira de leitura | Specify | Pending |
| FQR-08 | P1: Fronteira de leitura | Specify | Pending |
| FQR-09 | P1: Saldo e saldos de contas | Specify | Pending |
| FQR-10 | P1: Saldo e saldos de contas | Specify | Pending |
| FQR-11 | P1: Saldo e saldos de contas | Specify | Pending |
| FQR-12 | P1: Saldo e saldos de contas | Specify | Pending |
| FQR-13 | P1: Saldo e saldos de contas | Specify | Pending |
| FQR-14 | P1: Saldo e saldos de contas | Specify | Pending |
| FQR-15 | P1: Saldo e saldos de contas | Specify | Pending |
| FQR-16 | P1: Saldo e saldos de contas | Specify | Pending |
| FQR-17 | P1: Saldo e saldos de contas | Specify | Pending |
| FQR-18 | P1: Extrato paginado | Specify | Pending |
| FQR-19 | P1: Extrato paginado | Specify | Pending |
| FQR-20 | P1: Extrato paginado | Specify | Pending |
| FQR-21 | P1: Extrato paginado | Specify | Pending |
| FQR-22 | P1: Extrato paginado | Specify | Pending |
| FQR-23 | P1: Extrato paginado | Specify | Pending |
| FQR-24 | P1: Extrato paginado | Specify | Pending |
| FQR-25 | P1: Extrato paginado | Specify | Pending |
| FQR-26 | P1: Extrato paginado | Specify | Pending |
| FQR-27 | P1: Extrato paginado | Specify | Pending |
| FQR-28 | P1: Extrato paginado | Specify | Pending |
| FQR-29 | P1: Lista global | Specify | Pending |
| FQR-30 | P1: Lista global | Specify | Pending |
| FQR-31 | P1: Lista global | Specify | Pending |
| FQR-32 | P1: Lista global | Specify | Pending |
| FQR-33 | P1: Lista global | Specify | Pending |
| FQR-34 | P1: Lista global | Specify | Pending |
| FQR-35 | P1: Lista global | Specify | Pending |
| FQR-36 | P1: Lista global | Specify | Pending |
| FQR-37 | P1: Lista global | Specify | Pending |
| FQR-38 | P1: Lista global | Specify | Pending |
| FQR-39 | P1: Lista global | Specify | Pending |
| FQR-40 | P1: Fluxo de caixa mensal | Specify | Pending |
| FQR-41 | P1: Fluxo de caixa mensal | Specify | Pending |
| FQR-42 | P1: Fluxo de caixa mensal | Specify | Pending |
| FQR-43 | P1: Fluxo de caixa mensal | Specify | Pending |
| FQR-44 | P1: Fluxo de caixa mensal | Specify | Pending |
| FQR-45 | P1: Fluxo de caixa mensal | Specify | Pending |
| FQR-46 | P1: Fluxo de caixa mensal | Specify | Pending |
| FQR-47 | P1: Fluxo de caixa mensal | Specify | Pending |
| FQR-48 | P1: Gastos por categoria | Specify | Pending |
| FQR-49 | P1: Gastos por categoria | Specify | Pending |
| FQR-50 | P1: Gastos por categoria | Specify | Pending |
| FQR-51 | P1: Gastos por categoria | Specify | Pending |
| FQR-52 | P1: Gastos por categoria | Specify | Pending |
| FQR-53 | P1: Gastos por categoria | Specify | Pending |
| FQR-54 | P1: Gastos por categoria | Specify | Pending |
| FQR-55 | P1: Gastos por categoria | Specify | Pending |
| FQR-56 | P1: Gastos por categoria | Specify | Pending |
| FQR-57 | P1: Patrimônio líquido | Specify | Pending |
| FQR-58 | P1: Patrimônio líquido | Specify | Pending |
| FQR-59 | P1: Patrimônio líquido | Specify | Pending |
| FQR-60 | P1: Patrimônio líquido | Specify | Pending |
| FQR-61 | P1: Patrimônio líquido | Specify | Pending |
| FQR-62 | P1: Patrimônio líquido | Specify | Pending |
| FQR-63 | P1: Precisão e consistência | Specify | Pending |
| FQR-64 | P1: Precisão e consistência | Specify | Pending |
| FQR-65 | P1: Precisão e consistência | Specify | Pending |
| FQR-66 | P1: Precisão e consistência | Specify | Pending |
| FQR-67 | P1: Precisão e consistência | Specify | Pending |
| FQR-68 | P1: Precisão e consistência | Specify | Pending |
| FQR-69 | P1: Precisão e consistência | Specify | Pending |
| FQR-70 | P1: Saldo e saldos de contas | Specify | Pending |
| FQR-71 | P1: Fluxo de caixa mensal | Specify | Pending |
| FQR-72 | P1: Gastos por categoria | Specify | Pending |

**ID format:** `FQR-NN` (`Financial Queries`).

**Status values:** Pending → In Design → In Tasks → Implementing → Verified.

**Coverage:** 72 requisitos, 72 mapeados a stories, 0 sem cobertura.

## Success Criteria

- [ ] As sete capacidades retornam read models serializáveis com isolamento por livro e aritmética inteira exata.
- [ ] Extrato e lista global percorrem todas as páginas sem lacunas nem duplicatas em empates de data.
- [ ] Fluxo, categorias e patrimônio produzem os valores exatos dos cenários de receita, despesa, transferência, passivo, split e reversão.
- [ ] Nenhuma query executa quantidade de statements proporcional aos itens retornados.
- [ ] Os query plans críticos usam índices coerentes com filtros e ordenação.
- [ ] Build, lint, typecheck e testes focados e do workspace passam sem warnings ou testes ignorados.
