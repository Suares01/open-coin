# Especificação da Persistência Financeira em SQLite

**Status**: Approved
**Feature version**: 1.0.0
**Depends on**: `.specs/features/financial-domain-core/` v1.1.0

## Problem Statement

O núcleo financeiro já prova domínio, casos de uso, repositórios, transações e consultas com armazenamento em memória. O Open Coin precisa persistir os mesmos agregados e executar os mesmos contratos sobre SQLite local sem acoplar domínio ou aplicação a um driver, a Tauri ou a detalhes SQL.

O primeiro recorte deve entregar um pacote `@open-coin/infrastructure-sqlite` reutilizável, migrations determinísticas e um driver `better-sqlite3` para testes. A equivalência com `@open-coin/infrastructure-memory` será provada por suítes de contrato compartilhadas, acrescidas de testes de integridade, concorrência, migrations e precisão numérica.

## Goals

- [ ] Implementar todas as portas atuais de repository, transaction manager e ledger queries sobre SQLite sem modificar o domínio.
- [ ] Persistir e reidratar `FinancialBook`, `LedgerAccount`, `JournalEntry` e `Posting` sem perda de campos, ordem ou precisão dentro dos limites documentados.
- [ ] Aplicar migrations incrementais, atômicas, idempotentes e protegidas por checksum.
- [ ] Garantir foreign keys, unicidade, concorrência otimista, sequência monotônica por livro e rollback integral.
- [ ] Executar os contratos e casos de uso existentes contra bancos SQLite `:memory:` isolados por teste.

## Out of Scope

Explicitamente excluído deste recorte para evitar acoplamento prematuro.

| Feature | Reason |
| --- | --- |
| Alterar invariantes, snapshots ou factories de `@open-coin/domain` | A infraestrutura deve adaptar o modelo implementado, não redefini-lo. |
| Criar novos repositories para recorrências, ocorrências planejadas, orçamentos, ativos ou investimentos | Essas portas ainda não existem em `@open-coin/application`. |
| Payees, referências externas, replacement links, hierarquia de contas, memo e timestamps de persistência | Esses campos não pertencem aos snapshots atuais do núcleo financeiro. |
| Bridge Tauri customizado, comandos Rust e integração com uma aplicação desktop | O repositório ainda não possui host Tauri; a abstração será compatível com um driver futuro, mas esse runtime terá spec própria. |
| Importar `@tauri-apps/plugin-sql` nos repositories | Os repositories dependem somente de `SqliteExecutor`. |
| Sincronização, banco remoto, filesystem de rede, backup e restore | Este recorte cobre um banco SQLite local e single-device. |
| Alterar a taxonomia pública de erros de `@open-coin/application` | O adapter mapeará falhas para os códigos atuais. |
| Transações aninhadas | SQLite não aceita `BEGIN` aninhado; savepoints serão tratados em uma feature futura. |
| Exclusão física de livros, contas ou lançamentos | Os contratos atuais não expõem operações de remoção. |

---

## Assumptions & Open Questions

Toda ambiguidade está resolvida ou registrada aqui.

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| Nome e limite do pacote | Criar `@open-coin/infrastructure-sqlite` para abstrações, migrations, mappers, repositories, queries e transaction manager | Mantém a direção `domain <- application <- infrastructure-sqlite` e segue a convenção atual do workspace. | Sim |
| Driver dos testes | Manter `better-sqlite3` como dependência de desenvolvimento e `BetterSqliteDatabase` em suporte de testes do pacote | O driver Node serve para prova de contrato e não deve entrar no bundle de um runtime Tauri futuro. | Sim |
| Driver Tauri neste recorte | Adiar bridge TypeScript/Rust e conexão com a aplicação para uma spec própria | Não existe host Tauri no worktree atual; incluí-lo exigiria criar uma nova aplicação e ampliar materialmente o escopo. | Sim |
| Contratos de aplicação | Implementar exatamente `FinancialBookRepository`, `LedgerAccountRepository`, `JournalEntryRepository`, `LedgerQueries`, `RepositoryContext` e `TransactionManager` atuais | O pedido define SQLite como adapter dos contratos existentes. | Sim |
| Coleta de fatos | Cada contexto transacional cria um `DomainFactCollector`; fatos só saem em `CommittedTransaction` depois de `COMMIT` | Preserva a semântica já provada pelo transaction manager em memória. | Sim |
| Schema inicial | Persistir somente os campos presentes nos snapshots atuais, mais `position`, `journal_sequences` e metadados de migration | Campos futuros do exemplo não podem ser inventados sem portas e invariantes correspondentes. | Sim |
| Unicidade de nome de conta | Aplicar a chave atual `(book_id, kind, normalized_name)` a todas as contas, independentemente do status | `existsWithName` no adapter em memória não ignora contas arquivadas. | Sim |
| Limite de inteiros | Aceitar `amountMinor` no intervalo `-9223372036854775808` a `9223372036854775807` e sequência de `1` a `9223372036854775807` | `INTEGER` do SQLite é assinado de 64 bits; o limite deve ser explícito na fronteira do adapter. | Sim |
| Valores fora do intervalo SQLite | Rejeitar antes da escrita com `ApplicationError` de código `UNEXPECTED_ERROR` e mensagem sanitizada | A taxonomia atual não possui erro público de limite de persistência e sua expansão está fora do escopo. | Sim |
| Erros de constraint não antecipados pela aplicação | Mapear `UNIQUE`/`PRIMARY KEY` para `DUPLICATE_ENTITY`; mapear demais constraints para `UNEXPECTED_ERROR` sanitizado | Usa somente os códigos públicos existentes e não expõe SQL. | Sim |
| Transações concorrentes na conexão Node | Serializar callbacks assíncronos por instância e usar `BEGIN IMMEDIATE` | Uma conexão não suporta transações sobrepostas; a fila preserva a ordem e o writer lock é adquirido no início. | Sim |
| Banco em memória | Usar uma conexão privada `:memory:` por teste e não habilitar WAL | Evita compartilhamento implícito e segue o comportamento do SQLite para bancos puramente em memória. | Sim |
| Banco em arquivo | Aplicar `journal_mode=WAL` e `synchronous=FULL` após abrir a conexão local | Favorece leitura concorrente e durabilidade de dados financeiros. | Sim |
| Fonte das migrations | Arquivos SQL versionados são canônicos e a mesma lista é executada em testes e runtimes futuros | Evita divergência entre schema de teste e produção. | Sim |
| Observabilidade | Não adicionar logger, métricas ou tracing neste pacote | O projeto ainda não definiu uma porta de observabilidade; erros tipados e testes cobrem o recorte. | Sim |

**Open questions:** none. Todos os defaults foram aprovados em 2026-08-04.

## Implicit Requirement Dimensions

| Dimension | Resolution |
| --- | --- |
| Input validation & bounds | Coberta por FSP-13, FSP-14, FSP-22, FSP-24, FSP-25 e FSP-51. |
| Failure / partial-failure states | Coberta por FSP-18 a FSP-21, FSP-30, FSP-31, FSP-37, FSP-41 e FSP-42. |
| Idempotency / retry / duplicate handling | Coberta por FSP-17, FSP-20, FSP-28, FSP-32, FSP-38 e FSP-50. |
| Auth boundaries & rate limits | N/A porque o pacote é local, não expõe endpoint nem identidade autenticada. |
| Concurrency / ordering | Coberta por FSP-30, FSP-38 a FSP-40 e FSP-47. |
| Data lifecycle / expiry | N/A porque os contratos atuais não possuem delete, TTL, retenção ou sincronização. |
| Observability | N/A porque não existe porta de observabilidade no projeto e este recorte não adiciona uma. |
| External-dependency failure | Coberta por FSP-41, FSP-51 e FSP-52 para falhas do driver local; serviços remotos não participam do recorte. |
| State-transition integrity | Coberta por FSP-18 a FSP-21, FSP-29 a FSP-31, FSP-37, FSP-41 e FSP-42. |

---

## User Stories

### P1: Isolar os repositories do driver SQLite ⭐ MVP

**User Story**: Como mantenedor do Open Coin, quero uma abstração SQLite mínima para que os adapters financeiros funcionem em testes Node e em runtimes futuros sem conhecer o driver concreto.

**Why P1**: Todos os demais componentes dependem de uma fronteira transacional estável e independente de plataforma.

**Acceptance Criteria**:

1. The pacote `@open-coin/infrastructure-sqlite` SHALL ter dependências de produção somente em `@open-coin/domain` e `@open-coin/application`. (`FSP-01`)
2. The pacote `@open-coin/infrastructure-sqlite` SHALL permanecer sem imports de React, Tauri, Zustand, TanStack Query, Pluggy ou APIs de uma aplicação host. (`FSP-02`)
3. The adapter SHALL expor `SqliteValue`, `SqliteParameters`, `SqliteExecutionResult`, `SqliteExecutor` e `SqliteDatabase` com os métodos `execute`, `query`, `executeBatch`, `transaction` e `close` definidos no contexto desta feature. (`FSP-03`)
4. The acesso SQL de cada repository SHALL depender somente de um `SqliteExecutor`, permitindo usar a mesma classe com a conexão ou com o executor transacional. (`FSP-04`)
5. The adapter SHALL implementar os contratos públicos atuais de `@open-coin/application` sem alterar assinaturas ou o comportamento público de `@open-coin/domain`. (`FSP-05`)
6. WHEN um `SqliteExecutor` receber parâmetros posicionais ou nomeados válidos THEN o driver SHALL vinculá-los sem interpolar valores na string SQL. (`FSP-06`)
7. WHEN `execute` concluir THEN o driver SHALL retornar `rowsAffected` e, quando o driver fornecer o valor, `lastInsertRowId` como string decimal. (`FSP-07`)

**Independent Test**: Compilar o pacote, executar um executor fake contra um repository e provar que a classe usa apenas os métodos do contrato mínimo.

### P1: Abrir conexões SQLite previsíveis ⭐ MVP

**User Story**: Como mantenedor, quero conexões configuradas de modo uniforme para que testes e bancos locais apliquem integridade e durabilidade conhecidas.

**Why P1**: Foreign keys e comportamento transacional dependem da configuração de cada conexão.

**Acceptance Criteria**:

1. WHEN uma conexão for inicializada THEN o adapter SHALL aplicar `PRAGMA foreign_keys = ON` e `PRAGMA busy_timeout = 5000` antes de abrir qualquer transação. (`FSP-08`)
2. WHEN um banco local em arquivo for inicializado THEN o adapter SHALL solicitar `PRAGMA journal_mode = WAL` e `PRAGMA synchronous = FULL`. (`FSP-09`)
3. WHEN um banco `:memory:` for inicializado THEN o adapter SHALL manter o journal mode próprio de memória e não solicitar WAL. (`FSP-10`)
4. WHEN um teste criar `BetterSqliteDatabase(":memory:")` THEN o driver SHALL usar uma única conexão privada até `close`. (`FSP-11`)
5. WHEN `close` for chamado pela primeira vez THEN o driver SHALL liberar a conexão; IF uma operação for solicitada depois disso THEN o driver SHALL rejeitá-la sem reabrir o banco. (`FSP-12`)
6. IF um posting tiver `amountMinor` fora do intervalo inteiro assinado de 64 bits THEN o adapter SHALL rejeitar a escrita antes de executar o `INSERT`. (`FSP-13`)
7. IF a próxima sequência ultrapassar `9223372036854775807` THEN o adapter SHALL abortar a reserva e preservar a sequência persistida anterior. (`FSP-14`)

**Independent Test**: Inicializar conexões em memória e em arquivo temporário, consultar os PRAGMAs efetivos, testar fechamento e verificar os dois limites inteiros.

### P1: Evoluir o schema por migrations verificáveis ⭐ MVP

**User Story**: Como mantenedor, quero migrations únicas e auditáveis para que testes e runtimes criem exatamente o mesmo schema e detectem alterações indevidas.

**Why P1**: Persistência durável não pode depender de setup ad hoc ou de um schema diferente nos testes.

**Acceptance Criteria**:

1. The adapter SHALL manter uma lista ordenada de migrations com `version`, `name`, `checksum` e `sql`, sem versões repetidas ou fora de ordem crescente. (`FSP-15`)
2. WHEN o runner for executado em um banco vazio THEN ele SHALL criar `schema_migrations` como tabela `STRICT` com `version`, `name`, `checksum` e `applied_at`. (`FSP-16`)
3. WHEN uma migration for aplicada THEN o runner SHALL persistir o checksum calculado sobre seu SQL canônico na mesma transação da alteração de schema. (`FSP-17`)
4. IF o banco registrar uma versão ausente da lista atual THEN o runner SHALL falhar com erro tipado de migration desconhecida antes de aplicar qualquer migration pendente. (`FSP-18`)
5. IF o checksum persistido diferir do checksum atual da mesma versão THEN o runner SHALL falhar com erro tipado de migration modificada antes de aplicar qualquer migration pendente. (`FSP-19`)
6. WHEN o runner for executado novamente sobre a versão atual THEN ele SHALL concluir sem reaplicar SQL nem inserir outra linha de controle. (`FSP-20`)
7. IF qualquer comando de uma migration falhar THEN o runner SHALL reverter todo o SQL e o registro de controle daquela migration. (`FSP-21`)
8. WHEN a migration inicial for aplicada THEN o schema SHALL conter `financial_books`, `ledger_accounts`, `journal_sequences`, `journal_entries` e `postings` com todos os campos dos snapshots atuais. (`FSP-22`)
9. The schema SHALL usar tabelas `STRICT`, foreign keys compostas para impedir relacionamentos entre livros e índices para todas as colunas filhas de foreign key consultadas. (`FSP-23`)
10. The schema SHALL restringir moedas a três letras ASCII maiúsculas, versões e posições a valores não negativos, postings a valores diferentes de zero e enums aos valores atuais do domínio. (`FSP-24`)
11. The schema SHALL garantir unicidade de ID, propósito de sistema por livro, nome normalizado por livro e tipo, sequência por livro e posição de posting por lançamento. (`FSP-25`)
12. The schema SHALL deixar balanceamento, quantidade mínima de postings, contas distintas, conta ativa e regras de reversão sob responsabilidade do domínio e da aplicação. (`FSP-26`)

**Independent Test**: Migrar um banco vazio e cada versão anterior, repetir o runner, adulterar checksum/versão e provocar uma migration intermediária inválida enquanto se verifica o schema resultante.

### P1: Persistir e reidratar os agregados atuais ⭐ MVP

**User Story**: Como consumidor da aplicação, quero repositories SQLite equivalentes aos repositories em memória para trocar a infraestrutura sem mudar casos de uso.

**Why P1**: A equivalência dos contracts é a condição para adotar SQLite sem regressão no núcleo financeiro.

**Acceptance Criteria**:

1. The mappers SQLite SHALL converter somente entre rows/parâmetros e snapshots/agregados, sem executar consultas ou levantar fatos de domínio durante `restore`. (`FSP-27`)
2. WHEN um agregado for carregado THEN o repository SHALL retornar uma nova instância com snapshot igual ao persistido e sem referências mutáveis compartilhadas. (`FSP-28`)
3. IF `add` receber um agregado com versão diferente de `0` THEN o repository SHALL rejeitar a escrita com `OPTIMISTIC_CONCURRENCY_FAILURE`. (`FSP-29`)
4. WHEN `save` receber `expectedVersion = N` e um agregado de versão `N + 1` sobre uma row de versão `N` THEN o repository SHALL atualizar a row por um único `UPDATE` condicionado à versão esperada. (`FSP-30`)
5. IF o `UPDATE` condicionado afetar zero rows THEN o repository SHALL distinguir `ENTITY_NOT_FOUND` de `OPTIMISTIC_CONCURRENCY_FAILURE` sem sobrescrever o estado persistido. (`FSP-31`)
6. IF `add` violar ID, nome normalizado ou propósito de sistema único THEN o repository SHALL rejeitar a escrita com `DUPLICATE_ENTITY`. (`FSP-32`)
7. WHEN `FinancialBookRepository` executar `add`, `findById` ou `save` THEN ele SHALL preservar `id`, `name`, `baseCurrency`, `timezone` e `version`. (`FSP-33`)
8. WHEN `LedgerAccountRepository` executar seus cinco métodos THEN ele SHALL preservar todos os campos atuais e filtrar `findBySystemPurpose` e `existsWithName` por `bookId`. (`FSP-34`)
9. WHEN `JournalEntryRepository.findById` carregar um lançamento THEN ele SHALL reconstruir entry e postings a partir de um único statement com postings ordenados por `position`. (`FSP-35`)
10. WHEN `findActiveOpeningBalanceByAccount` for chamado THEN o repository SHALL retornar somente um lançamento do mesmo livro que conecte a conta alvo à conta de sistema `OPENING_BALANCE` e não possua `reversalOf` nem `reversedBy`. (`FSP-36`)

**Independent Test**: Executar a suíte de contrato dos três repositories contra SQLite e comparar snapshots, erros e independência de referências com o adapter em memória.

### P1: Confirmar journal, sequência e fatos na mesma transação ⭐ MVP

**User Story**: Como consumidor dos casos de uso, quero commits atômicos para que lançamentos parciais, sequências consumidas ou fatos de operações revertidas nunca escapem.

**Why P1**: O ledger perde auditabilidade se entry, postings, links de reversão, sequência e fatos divergirem.

**Acceptance Criteria**:

1. WHEN `JournalEntryRepository.add` for executado pelo `SqliteTransactionManager` THEN entry e todos os postings SHALL ser persistidos na mesma transação. (`FSP-37`)
2. WHEN `reserveNextSequence(bookId)` for chamado dentro de uma transação THEN o repository SHALL reservar atomicamente uma sequência decimal única, estritamente crescente e independente por livro. (`FSP-38`)
3. WHEN `SqliteDatabase.transaction` iniciar THEN o driver SHALL executar `BEGIN IMMEDIATE` antes do callback assíncrono. (`FSP-39`)
4. WHILE uma transação estiver ativa na instância Node, callbacks concorrentes submetidos à mesma instância SHALL aguardar em uma fila FIFO sem intercalar statements. (`FSP-40`)
5. IF o callback, um statement ou o `COMMIT` falhar THEN o driver SHALL executar `ROLLBACK` quando a conexão ainda estiver em transação e relançar o erro original. (`FSP-41`)
6. WHEN o `COMMIT` concluir THEN `SqliteTransactionManager` SHALL retornar `CommittedTransaction` com o valor do callback e somente os fatos coletados pelas escritas confirmadas. (`FSP-42`)
7. IF a transação for revertida THEN o adapter SHALL remover entry, postings, mudanças de versão, sequência reservada e fatos pendentes dessa transação. (`FSP-43`)

**Independent Test**: Forçar falha depois de cada etapa de uma escrita de journal e provar rollback integral; executar callbacks concorrentes e verificar ordem, sequências e fatos confirmados.

### P1: Consultar saldo e extrato diretamente do ledger SQLite ⭐ MVP

**User Story**: Como usuário local, quero saldos e extratos idênticos aos do adapter em memória para que a troca de persistência não altere resultados financeiros.

**Why P1**: Consultas são a saída observável do ledger e precisam preservar sinal, precisão e ordem.

**Acceptance Criteria**:

1. WHEN `getAccountBalance` receber `asOf` THEN a query SHALL somar somente postings do mesmo livro e conta com `occurredOn` menor ou igual à data informada. (`FSP-44`)
2. WHEN `getAccountBalance` calcular o total THEN a query SHALL converter o saldo bruto para o saldo de exibição segundo `normalBalanceOf` da conta. (`FSP-45`)
3. WHEN uma conta não tiver postings THEN `getAccountBalance` SHALL retornar `amountMinor: "0"` e a moeda-base do livro. (`FSP-46`)
4. WHEN `getAccountStatement` for executado THEN a query SHALL calcular saldos correntes em ordem `occurredOn ASC, sequence ASC` e retornar itens em ordem `occurredOn DESC, sequence DESC`. (`FSP-47`)
5. The query layer SHALL transportar `amountMinor`, `runningBalanceMinor`, somas e sequências como strings decimais exatas, usando casts para `TEXT` antes de cruzar a fronteira do driver. (`FSP-48`)
6. WHEN um lançamento original e sua reversão existirem THEN as queries SHALL incluir ambos e permitir que seus postings se anulem naturalmente. (`FSP-49`)
7. IF existirem IDs ou postings semelhantes em outro livro THEN as queries SHALL ignorá-los e retornar somente dados do `bookId` solicitado. (`FSP-50`)

**Independent Test**: Executar a mesma suíte de `LedgerQueries` contra memória e SQLite, incluindo cinco tipos de conta, datas, quatro lançamentos no mesmo dia, reversão, livro concorrente e valores acima de `Number.MAX_SAFE_INTEGER`.

### P1: Provar constraints, migrations e equivalência do adapter ⭐ MVP

**User Story**: Como mantenedor, quero gates determinísticos para detectar corrupção e regressões antes que SQLite seja ligado a uma aplicação real.

**Why P1**: Testes apenas de happy path não provam atomicidade, integridade relacional ou compatibilidade de contrato.

**Acceptance Criteria**:

1. WHEN o driver receber uma falha SQLite THEN o adapter SHALL preservar `code`, `extendedCode`, mensagem e `cause` internamente antes de mapeá-la para `ApplicationError`. (`FSP-51`)
2. IF uma falha chegar à fronteira pública THEN o adapter SHALL retornar um código atual de `ApplicationError` e uma mensagem sem SQL, parâmetros, caminhos de arquivo ou detalhes do driver. (`FSP-52`)
3. The suíte compartilhada de repository contracts SHALL executar contra `@open-coin/infrastructure-memory` e `@open-coin/infrastructure-sqlite` sem expectativas específicas de implementação. (`FSP-53`)
4. The suíte dos casos de uso atuais SHALL executar com os dois adapters e produzir os mesmos resultados, erros, fatos e rollbacks observáveis. (`FSP-54`)
5. The suíte SQLite SHALL testar foreign keys entre livros, unicidade, checks, ordem dos postings, precisão acima de `Number.MAX_SAFE_INTEGER`, conflito de versão e rollback após falha intermediária. (`FSP-55`)
6. WHEN cada estado de migration suportado for testado THEN a suíte SHALL executar `PRAGMA integrity_check` e `PRAGMA foreign_key_check`, exigir `integrity_check = "ok"` e zero violações de foreign key. (`FSP-56`)
7. WHEN os gates do pacote forem executados THEN build, lint, typecheck e todos os testes SHALL concluir sem warnings ou testes ignorados. (`FSP-57`)
8. The API pública de `@open-coin/infrastructure-sqlite` SHALL exportar somente contratos e adapters de produção; helpers `better-sqlite3` e fixtures de teste SHALL permanecer fora do entrypoint público. (`FSP-58`)

**Independent Test**: Rodar os gates focados e do workspace em um checkout limpo, inspecionar os PRAGMAs de integridade e confirmar que o entrypoint público não depende do driver Node.

---

## Edge Cases

- IF uma migration conhecida tiver checksum diferente THEN o runner SHALL parar antes de executar qualquer migration pendente. (`FSP-19`)
- IF o callback transacional falhar depois de reservar sequência e inserir parte de um journal THEN o adapter SHALL restaurar todo o estado anterior. (`FSP-43`)
- IF duas transações concorrentes reservarem sequência para o mesmo livro THEN o adapter SHALL produzir valores distintos em ordem de commit sem intercalar callbacks na mesma conexão. (`FSP-38`)
- IF uma conta ou lançamento referenciar outro livro THEN o schema SHALL rejeitar a relação por foreign key composta. (`FSP-23`)
- IF um `amountMinor` for maior que `Number.MAX_SAFE_INTEGER` e couber em 64 bits THEN a leitura SHALL devolver exatamente a mesma string decimal. (`FSP-48`)
- IF uma escrita violar uma constraint não representada pela taxonomia pública atual THEN o adapter SHALL devolver `UNEXPECTED_ERROR` sanitizado. (`FSP-52`)
- WHEN o banco não contiver postings para a conta THEN saldo e extrato SHALL retornar zero e lista vazia, respectivamente. (`FSP-46`)
- WHEN o runner for executado duas vezes THEN a segunda execução SHALL ser um no-op observável. (`FSP-20`)

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| --- | --- | --- | --- |
| FSP-01 | P1: Isolar repositories do driver | Tasks | In Tasks |
| FSP-02 | P1: Isolar repositories do driver | Tasks | In Tasks |
| FSP-03 | P1: Isolar repositories do driver | Tasks | In Tasks |
| FSP-04 | P1: Isolar repositories do driver | Tasks | In Tasks |
| FSP-05 | P1: Isolar repositories do driver | Tasks | In Tasks |
| FSP-06 | P1: Isolar repositories do driver | Tasks | In Tasks |
| FSP-07 | P1: Isolar repositories do driver | Tasks | In Tasks |
| FSP-08 | P1: Abrir conexões previsíveis | Tasks | In Tasks |
| FSP-09 | P1: Abrir conexões previsíveis | Tasks | In Tasks |
| FSP-10 | P1: Abrir conexões previsíveis | Tasks | In Tasks |
| FSP-11 | P1: Abrir conexões previsíveis | Tasks | In Tasks |
| FSP-12 | P1: Abrir conexões previsíveis | Tasks | In Tasks |
| FSP-13 | P1: Abrir conexões previsíveis | Tasks | In Tasks |
| FSP-14 | P1: Abrir conexões previsíveis | Tasks | In Tasks |
| FSP-15 | P1: Evoluir schema por migrations | Tasks | In Tasks |
| FSP-16 | P1: Evoluir schema por migrations | Tasks | In Tasks |
| FSP-17 | P1: Evoluir schema por migrations | Tasks | In Tasks |
| FSP-18 | P1: Evoluir schema por migrations | Tasks | In Tasks |
| FSP-19 | P1: Evoluir schema por migrations | Tasks | In Tasks |
| FSP-20 | P1: Evoluir schema por migrations | Tasks | In Tasks |
| FSP-21 | P1: Evoluir schema por migrations | Tasks | In Tasks |
| FSP-22 | P1: Evoluir schema por migrations | Tasks | In Tasks |
| FSP-23 | P1: Evoluir schema por migrations | Tasks | In Tasks |
| FSP-24 | P1: Evoluir schema por migrations | Tasks | In Tasks |
| FSP-25 | P1: Evoluir schema por migrations | Tasks | In Tasks |
| FSP-26 | P1: Evoluir schema por migrations | Tasks | In Tasks |
| FSP-27 | P1: Persistir e reidratar agregados | Tasks | In Tasks |
| FSP-28 | P1: Persistir e reidratar agregados | Tasks | In Tasks |
| FSP-29 | P1: Persistir e reidratar agregados | Tasks | In Tasks |
| FSP-30 | P1: Persistir e reidratar agregados | Tasks | In Tasks |
| FSP-31 | P1: Persistir e reidratar agregados | Tasks | In Tasks |
| FSP-32 | P1: Persistir e reidratar agregados | Tasks | In Tasks |
| FSP-33 | P1: Persistir e reidratar agregados | Tasks | In Tasks |
| FSP-34 | P1: Persistir e reidratar agregados | Tasks | In Tasks |
| FSP-35 | P1: Persistir e reidratar agregados | Tasks | In Tasks |
| FSP-36 | P1: Persistir e reidratar agregados | Tasks | In Tasks |
| FSP-37 | P1: Confirmar journal, sequência e fatos | Tasks | In Tasks |
| FSP-38 | P1: Confirmar journal, sequência e fatos | Tasks | In Tasks |
| FSP-39 | P1: Confirmar journal, sequência e fatos | Tasks | In Tasks |
| FSP-40 | P1: Confirmar journal, sequência e fatos | Tasks | In Tasks |
| FSP-41 | P1: Confirmar journal, sequência e fatos | Tasks | In Tasks |
| FSP-42 | P1: Confirmar journal, sequência e fatos | Tasks | In Tasks |
| FSP-43 | P1: Confirmar journal, sequência e fatos | Tasks | In Tasks |
| FSP-44 | P1: Consultar saldo e extrato | Tasks | In Tasks |
| FSP-45 | P1: Consultar saldo e extrato | Tasks | In Tasks |
| FSP-46 | P1: Consultar saldo e extrato | Tasks | In Tasks |
| FSP-47 | P1: Consultar saldo e extrato | Tasks | In Tasks |
| FSP-48 | P1: Consultar saldo e extrato | Tasks | In Tasks |
| FSP-49 | P1: Consultar saldo e extrato | Tasks | In Tasks |
| FSP-50 | P1: Consultar saldo e extrato | Tasks | In Tasks |
| FSP-51 | P1: Provar equivalência e integridade | Tasks | In Tasks |
| FSP-52 | P1: Provar equivalência e integridade | Tasks | In Tasks |
| FSP-53 | P1: Provar equivalência e integridade | Tasks | In Tasks |
| FSP-54 | P1: Provar equivalência e integridade | Tasks | In Tasks |
| FSP-55 | P1: Provar equivalência e integridade | Tasks | In Tasks |
| FSP-56 | P1: Provar equivalência e integridade | Tasks | In Tasks |
| FSP-57 | P1: Provar equivalência e integridade | Tasks | In Tasks |
| FSP-58 | P1: Provar equivalência e integridade | Tasks | In Tasks |

**ID format:** `FSP-NN` (`Financial SQLite Persistence`).

**Status values:** Pending → In Design → In Tasks → Implementing → Verified.

**Coverage:** 58 requisitos, 58 mapeados a stories, 0 sem cobertura.

## Success Criteria

- [ ] Os três repository contracts, `TransactionManager` e `LedgerQueries` produzem os mesmos resultados observáveis nos adapters memory e SQLite.
- [ ] Todos os casos de uso atuais passam usando uma conexão SQLite `:memory:` nova por teste.
- [ ] Migrations passam de banco vazio e de cada versão anterior até a atual, são idempotentes e rejeitam versão desconhecida ou checksum alterado.
- [ ] Rollback remove writes parciais, sequência reservada e fatos pendentes.
- [ ] `PRAGMA integrity_check` retorna `ok` e `PRAGMA foreign_key_check` retorna zero rows após cada cenário de migration suportado.
- [ ] Valores monetários acima de `Number.MAX_SAFE_INTEGER`, dentro de 64 bits, fazem round-trip exato.
- [ ] O pacote compila sem dependência de Tauri, React ou do driver Node no entrypoint de produção.
