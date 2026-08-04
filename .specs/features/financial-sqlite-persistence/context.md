# Persistência Financeira em SQLite — Contexto

**Gathered:** 2026-08-04
**Spec:** `.specs/features/financial-sqlite-persistence/spec.md`
**Status:** Ready for design

---

## Feature Boundary

Esta feature implementa as portas financeiras atuais sobre SQLite em um pacote independente de plataforma. Ela inclui abstração mínima do driver, configuração de conexão, migrations, schema inicial, mappers, três repositories, queries, transaction manager, tratamento de erros e testes com `better-sqlite3` em memória. Ela não cria domínio novo nem conecta uma aplicação Tauri inexistente no worktree atual.

---

## Implementation Decisions

### Direção de dependências

- A direção é `@open-coin/domain <- @open-coin/application <- @open-coin/infrastructure-sqlite`.
- O pacote SQLite pode importar domínio e aplicação, mas não React, Tauri, Zustand, TanStack Query ou integrações.
- Repositories não importam um driver concreto. Todo SQL passa por `SqliteExecutor`.
- `SqliteDatabase` estende o executor com `transaction` e `close`.

### Escopo alinhado ao código atual

- O contexto transacional contém `books`, `accounts`, `journalEntries` e `facts`.
- Recorrências, ocorrências planejadas, budgets, assets e investment operations não entram até existirem portas próprias.
- O schema persiste somente os campos atuais de `FinancialBookSnapshot`, `LedgerAccountSnapshot`, `JournalEntrySnapshot` e `PostingSnapshot`.
- `journal_sequences` e `postings.position` são metadados necessários para implementar contratos já existentes.
- Campos futuros mostrados no material de referência, como payee, source reference, replacement links, parent account, memo e timestamps, ficam adiados.

### Transações e concorrência

- Toda transação de escrita começa com `BEGIN IMMEDIATE`.
- O driver Node usa uma conexão e statements manuais `BEGIN IMMEDIATE`, `COMMIT` e `ROLLBACK`; não usa `better-sqlite3.transaction()` com callback assíncrono.
- Callbacks concorrentes na mesma instância são serializados em FIFO.
- `createSqliteRepositoryContext` constrói todos os repositories com o mesmo executor transacional e um coletor de fatos novo.
- `CommittedTransaction` só expõe fatos depois do commit.
- Rollback inclui aggregates, postings, links de reversão, sequência e fatos pendentes.
- Transações aninhadas não são suportadas neste recorte.

### Conexão e durabilidade

- Toda conexão aplica `foreign_keys = ON` e `busy_timeout = 5000` antes de transações.
- Bancos locais em arquivo aplicam `journal_mode = WAL` e `synchronous = FULL`.
- Bancos `:memory:` não solicitam WAL.
- Cada teste recebe sua própria conexão `:memory:` e a fecha no teardown.

### Migrations

- Arquivos `.sql` são a fonte canônica e são compartilhados entre testes e runtimes futuros.
- Migrations têm versão crescente, nome, checksum e SQL imutável depois de publicadas.
- Cada migration e sua row em `schema_migrations` são confirmadas na mesma transação.
- O runner valida versões desconhecidas e checksums alterados antes de aplicar pendências.
- A suíte cobre banco vazio, versão imediatamente anterior, reexecução, falha intermediária e rollback.
- Cada estado suportado termina com `integrity_check` e `foreign_key_check`.

### Schema e responsabilidades

- O banco valida tipos básicos, enums, `NOT NULL`, unicidade, foreign keys, escopo de livro, posting não zero e coerência de colunas relacionais.
- O domínio continua validando lançamento balanceado, ao menos dois postings, ao menos duas contas, moeda compatível e regras de reversão.
- Tabelas usam `STRICT`.
- Foreign keys que transportam `book_id` são compostas para impedir relações entre livros.
- Colunas filhas de foreign key recebem índices compatíveis com suas consultas.
- A unicidade de conta segue o contrato atual: `(book_id, kind, normalized_name)` sem ignorar contas arquivadas.

### Dinheiro, sequência e transporte de inteiros

- `amount_minor` e a sequência persistida usam `INTEGER`.
- Escritas convertem `bigint` para string decimal antes de atravessar `SqliteExecutor`.
- Leituras e agregados fazem `CAST(... AS TEXT)` antes de retornar ao JavaScript.
- O adapter documenta e testa o intervalo inteiro assinado de 64 bits.
- Valores fora do intervalo são rejeitados antes da escrita; a taxonomia atual força mapeamento sanitizado para `UNEXPECTED_ERROR` até existir decisão diferente.

### Repositories, mappers e queries

- Mappers convertem rows/parâmetros e aggregates/snapshots. Eles não consultam o banco.
- `save` usa `UPDATE ... WHERE id = ? AND version = ?`; não faz `SELECT` preventivo para validar versão.
- Um segundo lookup ocorre apenas quando zero rows são afetadas, para separar inexistência de conflito.
- `JournalEntry` é carregado por um único statement com `JOIN` e `ORDER BY postings.position`.
- Entry e postings são inseridos pelo mesmo executor transacional.
- Queries retornam DTOs sem reidratar aggregates.
- Reversões não são filtradas de saldo ou extrato; original e reversor se anulam pelos postings.
- Saldos correntes são calculados cronologicamente antes de o extrato ser devolvido em ordem decrescente.

### Erros

- O driver normaliza `code`, `extendedCode`, `message` e `cause` internamente.
- Chaves primárias e unicidade viram `DUPLICATE_ENTITY`.
- Falta de row em `save` vira `ENTITY_NOT_FOUND`; conflito de versão vira `OPTIMISTIC_CONCURRENCY_FAILURE`.
- Outras constraints viram `UNEXPECTED_ERROR` enquanto a taxonomia de aplicação permanecer inalterada.
- Mensagens públicas não contêm SQL, parâmetros, caminho do banco ou texto bruto do driver.

### Testes de equivalência

- Repository contracts e `LedgerQueries` serão extraídos para harnesses executáveis pelos dois adapters.
- Os casos de uso atuais também executarão contra os dois transaction managers.
- Testes SQLite adicionais cobrem PRAGMAs, constraints, migrations, precisão, ordem, concorrência e rollback.
- Testes derivam resultados esperados da spec financeira, não do SQL implementado.

### Agent's Discretion

- Nomes exatos dos row types e helpers internos.
- Organização interna de fixtures e builders de teste.
- Estratégia de empacotamento dos arquivos SQL, desde que o arquivo versionado permaneça canônico e seja idêntico nos testes e no runtime.
- Estrutura do erro interno do driver, desde que preserve os quatro campos definidos e sanitize a fronteira pública.

### Declined / Undiscussed Gray Areas → Assumptions

- O material inclui um bridge Tauri, mas o worktree não contém aplicação Tauri. A spec adia o bridge e a integração real para não criar um host como efeito colateral.
- O domínio aceita `bigint` arbitrário, mas SQLite `INTEGER` tem 64 bits. A spec escolhe limite explícito e rejeição anterior ao SQL.
- A taxonomia atual não possui `INVALID_REFERENCE` ou `PERSISTENCE_CONSTRAINT`. A spec preserva o contrato e usa `UNEXPECTED_ERROR` sanitizado para essas falhas defensivas.
- Savepoints e transações aninhadas não foram pedidos. A spec rejeita a ampliação e cobre apenas uma transação por conexão.

---

## Specific References

- Estrutura, interfaces, sequência de implementação e exemplos SQL fornecidos pelo usuário nesta solicitação.
- `.specs/features/financial-domain-core/` como contrato funcional de origem.
- `packages/application/src/ports/` como fonte das portas que o adapter deve implementar.
- `packages/infrastructure-memory/` como referência de comportamento observável, não como modelo de implementação SQL.
- Documentação oficial do SQLite para transações, foreign keys, PRAGMAs, tabelas `STRICT`, WAL, índices e integridade.
- Documentação do `better-sqlite3` para statements, transações e inteiros seguros.
- Referência JavaScript do plugin SQL do Tauri para delimitar a integração futura.

---

## Deferred Ideas

- `@open-coin/infrastructure-tauri-sqlite` com bridge TypeScript por `invoke`.
- Comandos Rust que associam cada `transactionId` à mesma `sqlx::SqliteConnection` até commit ou rollback.
- Integração do banco em arquivo com uma aplicação Tauri e seu ciclo de vida.
- Migrations para payees, referências externas, recorrências, budgets, assets e investments quando os respectivos contracts existirem.
- Taxonomia pública específica para violações de referência, constraint e limite de persistência.
