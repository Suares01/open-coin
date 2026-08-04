# Contexto das Queries Financeiras do Ledger

**Gathered:** 2026-08-04
**Spec:** `.specs/features/financial-ledger-queries/spec.md`
**Status:** Ready for design

---

## Feature Boundary

Esta feature entrega sete capacidades de leitura sobre o ledger existente: saldo de conta, lista de saldos, extrato paginado, lista global de lançamentos, fluxo de caixa mensal, gastos por categoria e patrimônio líquido. Ela define contratos e handlers na aplicação e usa SQLite como implementação de referência para as novas listas e agregações.

O recorte não amplia o domínio financeiro. Payees, hierarquia, multimoeda, planning, investments, dashboard composto, cache e read models persistidos continuam fora.

---

## Implementation Decisions

### Contratos e compatibilidade

- `GetAccountBalance` e `GetAccountStatement` permanecem públicos.
- `GetAccountBalance` recebe campos adicionais sem remover `amountMinor`, que continua sendo o saldo de exibição.
- O extrato paginado é uma capacidade nova e não altera o retorno em array do `GetAccountStatement` legado.
- As capacidades operacionais são agrupadas em um port de ledger e os indicadores em um port de insights.
- Handlers dependem de query ports, nunca de repositories usados como API de relatório.
- Read models retornam somente valores serializáveis e imutáveis.

### Fonte de leitura e adapters

- SQLite é a implementação de referência das novas listas e agregações.
- Os testes usam SQLite `:memory:` com migrations reais e fixtures válidas.
- O adapter em memória mantém somente as duas capacidades legadas necessárias às features anteriores.
- Uma query com múltiplos `SELECT`s usa um único snapshot em transação de leitura deferred.
- O número de statements permanece constante em relação ao volume retornado.

### Datas, ordenação e paginação

- `from`, `to` e `asOf` são inclusivos e filtram `occurredOn`.
- `asOf` omitido significa ledger sem limite superior e retorna `asOf: null`.
- Extrato ordena por `occurredOn`, `sequence` e `postingPosition` em ordem decrescente.
- Lista global ordena por `occurredOn` e `sequence` em ordem decrescente.
- Cursores são opacos, exclusivos e rejeitados com `INVALID_QUERY` quando inválidos.
- `limit` é obrigatório e aceita inteiros de 1 a 100.
- Running balance considera todo o histórico até o item, inclusive movimentos anteriores ao filtro ou à página atual.

### Convenções financeiras

- Valores monetários e sequências cruzam a fronteira como strings decimais exatas.
- `ASSET` e `EXPENSE` mantêm o sinal bruto na exibição; `LIABILITY`, `INCOME` e `EQUITY` o invertem.
- Transferências internas não entram em receita ou despesa.
- Compra em passivo conta como despesa na data da compra; pagamento sem categoria não conta novamente.
- Original e reversor permanecem nas leituras e se anulam pela soma dos postings.
- Patrimônio líquido é `ativos - passivos` após converter cada saldo para exibição.
- A moeda-base do livro é a única moeda agregada nesta versão.

### Listas, histórico e agrupamentos

- Contas arquivadas ficam ocultas por default na lista operacional de saldos.
- Extrato, gastos por categoria e patrimônio preservam efeitos de contas arquivadas.
- Busca global usa substring literal sensível a caixa depois de `trim`.
- Filtros usam união dentro de uma lista e interseção entre grupos.
- Percentuais de categoria usam basis points, divisão inteira e nenhum rateio de resto.
- Contagem de categoria considera lançamentos originais com contribuição positiva e não incrementa no reversor.
- O filtro por categoria é exato; descendentes não existem neste modelo.

### Agent's Discretion

- Formato interno e versionamento do cursor, desde que permaneça opaco e satisfaça as chaves de ordenação confirmadas.
- Divisão de SQL entre template strings e arquivos `.sql` conforme tamanho e legibilidade.
- Quantidade exata de statements por query, desde que seja constante, use um snapshot quando necessário e evite N+1.
- Organização interna de rows, mappers e helpers, preservando os limites públicos definidos.

### Declined / Undiscussed Gray Areas → Assumptions

Nenhuma. Todos os defaults registrados na especificação foram aprovados em 2026-08-04.

---

## Specific References

- Texto fornecido pelo usuário sobre CQRS leve, query ports, read models, paginação por cursor, sinais contábeis, reversões, transferências, testes SQLite e ordem recomendada de implementação.
- `.specs/features/financial-domain-core/` v1.1.0 como fonte das invariantes, sinais, sequência e contratos legados.
- `.specs/features/financial-sqlite-persistence/` v1.0.0 como fonte do schema, executor, migrations e guarantees transacionais atuais.

---

## Deferred Ideas

- Payees, tags, projetos e busca textual normalizada.
- Hierarquia de categorias e `includeDescendants`.
- Fluxo de caixa filtrado por subconjunto de contas com alocação inequívoca de splits.
- Conversão cambial e valuation de investimentos.
- Planning, orçamentos, projeções e investment queries.
- Dashboard composto, caches e read models persistidos.
