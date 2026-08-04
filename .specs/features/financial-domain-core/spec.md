# Especificação do Núcleo Financeiro

**Status**: Implemented (v1.0.0); amendment specified (v1.1.0)
**Feature version**: 1.1.0
**Implementation commit range (v1.0.0)**: `d1c1c79^..570afc1`
**Validation date (v1.0.0)**: 2026-08-04

## Problem Statement

O Open Coin precisa de um núcleo financeiro confiável antes de receber interface, banco local, integrações, planejamento ou sincronização. O primeiro recorte deve provar que um livro financeiro isolado registra e consulta movimentações por partidas dobradas sem depender de frameworks ou infraestrutura externa.

## Goals

- [x] Permitir que um consumidor da camada de aplicação execute o fluxo completo de criação do livro, contas, saldo inicial, despesas, receitas, transferências e reversões.
- [x] Garantir que todo lançamento persistido permaneça balanceado, auditável e isolado por livro.
- [x] Consultar saldo e extrato a partir dos lançamentos, sem armazenar saldos mutáveis como fonte de verdade.
- [x] Validar o comportamento da aplicação com repositórios e transações em memória determinísticos.
- [ ] Ordenar lançamentos do mesmo dia pela sequência real de registro, sem depender do formato do ID.
- [ ] Impedir saldo inicial ativo duplicado e fechar as regras temporais e de encadeamento de reversões.
- [ ] Versionar envelopes de evento antes da introdução de persistência durável e outbox.

## Out of Scope

Explicitamente excluído deste recorte para evitar que capacidades futuras definam prematuramente o núcleo.

| Feature | Reason |
| --- | --- |
| Interface React, Tauri, mobile ou web | Esta especificação cobre somente domínio, aplicação e infraestrutura em memória. |
| SQLite, migrations e adapters nativos | Terão spec própria com migrations reais, foreign keys habilitadas, transações e a mesma suíte de contratos dos repositories em memória. |
| Autenticação, servidor self-hosted e sincronização | O núcleo deve funcionar localmente e sem conta. |
| Importação CSV/OFX, Pluggy e outras integrações | Uma camada externa mutável fará staging e conciliação antes de criar `JournalEntry` imutável e idempotente. |
| Planejamento, recorrências, orçamentos, objetivos e projeções | Dependem do ledger já estável. |
| Investimentos, posições e cotações | Dependem do ledger e de tipos numéricos próprios. |
| Payees, tags, projetos, pessoas e categorização automática | Não são necessários para provar o primeiro recorte. |
| Hierarquia, renomeação, movimentação e arquivamento de contas | O recorte cria contas simples e preserva apenas as invariantes das contas de sistema. |
| Split de despesas, parcelamentos e alteração com lançamento substituto | Serão especificados depois do lançamento simples e da reversão. |
| Multimoeda e conversão cambial | Cada lançamento usa uma única moeda e não realiza conversão na V1. |
| Exclusão física de lançamentos | O histórico é append-oriented e correções usam reversão. |

---

## Assumptions & Open Questions

Toda ambiguidade está resolvida ou registrada aqui.

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| Escopo do primeiro recorte | Domínio, aplicação e infraestrutura em memória, sem UI e sem SQLite | O segundo texto define este recorte como a prova das decisões fundamentais antes da persistência real. | Sim |
| Convenção de sinal dos postings | Positivo representa débito; negativo representa crédito | A convenção está explícita na proposta e permite soma zero em todo lançamento. | Sim |
| Papel das categorias | Categorias são `LedgerAccount` de tipo `INCOME` ou `EXPENSE` | Evita um modelo paralelo desconectado do ledger. | Sim |
| Saldo informado ao definir saldo inicial | O comando recebe um saldo de exibição positivo; o tipo da conta determina o sinal contábil | Mantém a entrada orientada ao usuário e preserva o saldo normal de ativos e passivos. | Sim |
| Comandos manuais repetidos | Não são idempotentes sem uma chave explícita; cada execução aceita cria um novo agregado, exceto `SetOpeningBalance`, que rejeita a repetição enquanto houver saldo inicial ativo | O recorte não possui transporte externo nem chave de deduplicação, mas o nome `SetOpeningBalance` exige semântica de definição única. IDs duplicados continuam sendo rejeitados. | Sim |
| Publicação de eventos | O publisher deste recorte é local, síncrono e não falha depois do commit | Garantia de entrega, outbox e recuperação de falha pertencem à persistência/sincronização futura. | Sim |
| Precisão monetária | Valores entram como string inteira em unidades mínimas e viram `bigint` no domínio | Evita perda de precisão e mantém a fronteira serializável. | Sim |
| Formato de moeda | O núcleo aceita códigos com exatamente três letras ASCII maiúsculas e exige a moeda-base do livro em todos os lançamentos | É um contrato determinístico para a V1 sem introduzir catálogo ou conversão cambial. | Sim |
| Identificadores de produção | São opacos e gerados por uma porta da aplicação; nenhuma regra funcional depende de sua ordenação | A regra essencial é não gerar IDs dentro do domínio nem inferir tempo pelo seu formato. | Sim |
| Nome e timezone do livro | Nome é normalizado com `trim`; timezone é uma string IANA não vazia, sem validação da base IANA neste recorte | A validação completa exigiria uma dependência externa não necessária ao núcleo. | Sim |
| Normalização para nomes duplicados | Comparar `trim`, normalização Unicode NFC e conversão para minúsculas independente de locale | Evita duplicatas apenas por espaços, caixa ou representação Unicode sem impor regras linguísticas. | Sim |
| Descrição de lançamento | É obrigatória depois de `trim` e preservada como texto fornecido | Lançamentos auditáveis precisam de descrição, mas regras de tamanho e sanitização pertencem à fronteira futura. | Sim |
| Autorização | Não existe no núcleo local; isolamento é feito por `bookId` | Autenticação só surge com servidor ou compartilhamento, ambos fora do escopo. | Sim |
| Ordem intradiária | Cada lançamento persiste `recordedAt` e uma `sequence` reservada transacionalmente pelo `JournalEntryRepository`, estritamente crescente por livro; o extrato usa `occurredOn DESC, sequence DESC` | A ordem deve refletir o registro real, resistir à concorrência no adapter persistente e não depender do algoritmo de IDs opacos. | Sim |
| Repetição de saldo inicial | Cada conta pode ter somente um lançamento de saldo inicial sem `reversedBy`; uma correção exige reverter o anterior e executar o comando novamente | `SetOpeningBalance` define um ponto de partida, não um incremento cumulativo. | Sim |
| Data de reversão | `reversal.occurredOn` deve ser igual ou posterior a `original.occurredOn` | Uma reversão anterior ao fato original cria um saldo histórico impossível. | Sim |
| Reversão de reversão | Um lançamento com `reversalOf` não pode ser alvo de `ReverseJournalEntry` | A V1 mantém o grafo de correção simples; uma nova correção usa um lançamento substituto explícito. | Sim |
| Evolução de eventos | Todo envelope inclui `eventVersion` e `aggregateVersion`; a versão inicial de cada evento é `1` | Persistência e consumidores futuros precisam distinguir evolução de payload e versão do agregado. | Sim |

**Open questions: none** — requisitos e defaults confirmados em 2026-08-04.

## Implicit Requirement Dimensions

| Dimension | Resolution |
| --- | --- |
| Input validation & bounds | Coberta por FDC-02, FDC-03, FDC-07, FDC-14, FDC-15, FDC-17, FDC-20 a FDC-24, FDC-27, FDC-30 e FDC-33. Limites de tamanho de texto ficam fora porque não há transporte nem UI. |
| Failure / partial-failure states | Coberta por FDC-09, FDC-49, FDC-50 e FDC-56. |
| Idempotency / retry / duplicate handling | Coberta por FDC-48 para IDs duplicados. Comandos manuais sem chave são explicitamente não idempotentes neste recorte. |
| Auth boundaries & rate limits | N/A porque o pacote local não expõe endpoint, usuário autenticado ou transporte remoto. |
| Concurrency / ordering | Coberta por FDC-42, FDC-47, FDC-49, FDC-50 e FDC-64. A unicidade e monotonicidade da sequência são verificadas por livro. |
| Data lifecycle / expiry | N/A porque não há exclusão, expiração, retenção ou sincronização neste recorte. |
| Observability | N/A porque o núcleo puro não escolhe logging, métricas ou tracing; os erros tipados são cobertos por FDC-57. |
| External-dependency failure | N/A porque todos os adapters deste recorte são locais e em memória. |
| State-transition integrity | Coberta por FDC-16, FDC-31, FDC-35 a FDC-38 e FDC-59 a FDC-61. |

---

## User Stories

### P1: Primitivas financeiras seguras ⭐ MVP

**User Story**: Como mantenedor do Open Coin, quero tipos financeiros puros e determinísticos para que as regras do ledger não dependam de coerções ou APIs de plataforma.

**Why P1**: Todos os demais comportamentos dependem de dinheiro, moeda, datas e identificadores corretos.

**Acceptance Criteria**:

1. The núcleo financeiro SHALL representar valores monetários como unidades mínimas em `bigint`, sem usar `number` em cálculos monetários. (`FDC-01`)
2. IF uma operação tentar combinar valores de moedas diferentes THEN o núcleo financeiro SHALL rejeitá-la com o erro `CURRENCY_MISMATCH`. (`FDC-02`)
3. IF uma data não representar um dia real no formato `YYYY-MM-DD` THEN o núcleo financeiro SHALL rejeitá-la com um erro de data inválida. (`FDC-03`)
4. WHEN um caso de uso precisar de um novo identificador ou da data atual THEN a aplicação SHALL obtê-lo pelas portas `IdGenerator` ou `Clock`. (`FDC-04`)
5. The pacote de domínio SHALL permanecer sem imports de React, Tauri, SQLite, APIs externas, APIs de persistência ou APIs globais para geração de IDs e relógio. (`FDC-05`)

**Independent Test**: Executar testes unitários de `Money`, `Currency`, `LocalDate` e portas determinísticas sem banco, runtime nativo ou mocks de framework.

### P1: Criar um livro financeiro isolado ⭐ MVP

**User Story**: Como usuário local, quero criar um livro financeiro com moeda e timezone definidos para manter meus dados isolados e coerentes.

**Why P1**: O livro é o limite de isolamento de todos os agregados do recorte.

**Acceptance Criteria**:

1. WHEN `CreateFinancialBook` receber nome, moeda-base e timezone válidos THEN a aplicação SHALL criar um `FinancialBook` com nome normalizado, versão `0` e o ID fornecido por `IdGenerator`. (`FDC-06`)
2. IF o nome ou timezone estiver vazio, ou a moeda-base não tiver exatamente três letras ASCII maiúsculas, THEN a aplicação SHALL rejeitar a criação sem persistir qualquer agregado. (`FDC-07`)
3. WHEN um `FinancialBook` for criado THEN a aplicação SHALL criar exatamente uma conta para cada propósito `OPENING_BALANCE`, `RECONCILIATION_ADJUSTMENT`, `UNCATEGORIZED_INCOME` e `UNCATEGORIZED_EXPENSE`, com os tipos `EQUITY`, `EQUITY`, `INCOME` e `EXPENSE`, respectivamente. (`FDC-08`)
4. IF a persistência do livro ou de qualquer conta de sistema falhar THEN a aplicação SHALL reverter a criação inteira. (`FDC-09`)
5. WHILE um livro existir a aplicação SHALL manter sua moeda-base imutável. (`FDC-10`)
6. IF uma operação combinar agregados com `bookId` diferentes THEN a aplicação SHALL rejeitá-la sem persistir mudanças. (`FDC-11`)

**Independent Test**: Criar um livro em memória, consultar o agregado e suas quatro contas de sistema e provocar uma falha intermediária para provar o rollback.

### P1: Criar contas financeiras e categorias ⭐ MVP

**User Story**: Como usuário local, quero criar contas patrimoniais e categorias para classificar corretamente cada lado de uma movimentação.

**Why P1**: O ledger só pode registrar movimentações entre contas válidas.

**Acceptance Criteria**:

1. The núcleo financeiro SHALL tratar `ASSET`, `LIABILITY`, `INCOME`, `EXPENSE` e `EQUITY` como os tipos contábeis de `LedgerAccount`. (`FDC-12`)
2. WHEN uma conta financeira ou categoria válida for criada THEN a aplicação SHALL persistir uma `LedgerAccount` com nome normalizado, status `ACTIVE`, versão `0` e o `bookId` informado. (`FDC-13`)
3. IF `CreateFinancialAccount` receber um tipo diferente de `ASSET` ou `LIABILITY` THEN a aplicação SHALL rejeitar a criação com `INVALID_ACCOUNT_KIND`. (`FDC-14`)
4. IF `CreateIncomeCategory` ou `CreateExpenseCategory` tentar criar um tipo diferente de `INCOME` ou `EXPENSE`, respectivamente, THEN a aplicação SHALL rejeitar a criação com `INVALID_ACCOUNT_KIND`. (`FDC-15`)
5. IF uma conta de sistema receber uma solicitação de arquivamento ou mudança de tipo THEN o domínio SHALL rejeitar a transição sem alterar a conta. (`FDC-16`)
6. IF já existir uma conta não sistêmica com o mesmo nome normalizado, tipo e `bookId` THEN a aplicação SHALL rejeitar a nova conta com `DUPLICATE_ENTITY`. (`FDC-17`)

**Independent Test**: Criar uma conta corrente e uma categoria de alimentação no mesmo livro e provar as rejeições de tipo, nome duplicado e alteração de conta de sistema.

### P1: Preservar as invariantes de todo lançamento ⭐ MVP

**User Story**: Como usuário local, quero que movimentações inválidas nunca entrem no ledger para confiar nos saldos derivados.

**Why P1**: O balanceamento é a fonte de verdade de todas as consultas posteriores.

**Acceptance Criteria**:

1. IF um `JournalEntry` tiver menos de dois postings THEN o domínio SHALL rejeitá-lo com `INSUFFICIENT_POSTINGS`. (`FDC-18`)
2. IF os postings de um `JournalEntry` referenciarem menos de duas contas distintas THEN o domínio SHALL rejeitá-lo com `INSUFFICIENT_ACCOUNTS`. (`FDC-19`)
3. IF um posting tiver valor zero THEN o domínio SHALL rejeitá-lo com `ZERO_POSTING_AMOUNT`. (`FDC-20`)
4. IF qualquer posting de um `JournalEntry` usar moeda diferente da moeda-base do livro THEN o domínio SHALL rejeitá-lo com `CURRENCY_MISMATCH`. (`FDC-21`)
5. IF a soma assinada dos postings de um `JournalEntry` não for zero THEN o domínio SHALL rejeitá-lo com `UNBALANCED_JOURNAL_ENTRY`. (`FDC-22`)
6. IF um posting referenciar uma conta inativa ou de outro livro THEN a aplicação SHALL rejeitar o lançamento sem persistir mudanças. (`FDC-23`)
7. IF a descrição normalizada do lançamento estiver vazia THEN a aplicação SHALL rejeitar o comando sem persistir mudanças. (`FDC-24`)

**Independent Test**: Construir lançamentos válidos e um caso isolado para cada violação, verificando o código exato do erro e a ausência de persistência.

### P1: Definir saldo inicial e registrar fluxo financeiro ⭐ MVP

**User Story**: Como usuário local, quero definir o ponto de partida e registrar despesas e receitas para acompanhar meu dinheiro com semântica contábil correta.

**Why P1**: Este é o fluxo financeiro mínimo útil do produto.

**Acceptance Criteria**:

1. WHEN `SetOpeningBalance` receber uma conta `ASSET` e valor positivo THEN a aplicação SHALL criar um lançamento com débito de igual valor na conta e crédito de igual valor na conta de sistema `OPENING_BALANCE`. (`FDC-25`)
2. WHEN `SetOpeningBalance` receber uma conta `LIABILITY` e valor positivo THEN a aplicação SHALL criar um lançamento com crédito de igual valor na conta e débito de igual valor na conta de sistema `OPENING_BALANCE`. (`FDC-26`)
3. IF `SetOpeningBalance` receber valor zero, valor negativo, moeda diferente da moeda-base ou conta que não seja `ASSET` nem `LIABILITY` THEN a aplicação SHALL rejeitar o comando sem persistir lançamento. (`FDC-27`)
4. WHEN `RecordExpense` receber uma conta financeira, categoria `EXPENSE` e valor positivo THEN a aplicação SHALL criar débito na categoria e crédito de igual valor na conta financeira. (`FDC-28`)
5. WHEN `RecordIncome` receber uma conta financeira, categoria `INCOME` e valor positivo THEN a aplicação SHALL criar débito na conta financeira e crédito de igual valor na categoria. (`FDC-29`)
6. IF `RecordExpense` ou `RecordIncome` receber valor zero, valor negativo ou moeda incompatível THEN a aplicação SHALL rejeitar o comando sem persistir lançamento. (`FDC-30`)
7. WHILE um `JournalEntry` estiver registrado o domínio SHALL impedir alteração direta de data, descrição, postings, moeda ou contas. (`FDC-31`)
8. IF já existir para a conta um lançamento de saldo inicial sem `reversedBy` THEN `SetOpeningBalance` SHALL rejeitar o comando com `OPENING_BALANCE_ALREADY_SET` sem persistir lançamento ou publicar evento. (`FDC-59`)

**Independent Test**: Definir saldos iniciais de ativo e passivo, registrar uma despesa e uma receita e conferir os postings assinados exatos de cada lançamento.

### P1: Transferir entre contas sem alterar receitas ou despesas ⭐ MVP

**User Story**: Como usuário local, quero transferir dinheiro entre contas para que movimentações patrimoniais não sejam contadas como renda ou gasto.

**Why P1**: Transferências incorretas corrompem fluxo de caixa e relatórios futuros.

**Acceptance Criteria**:

1. WHEN `TransferMoney` receber origem, destino e valor válidos THEN a aplicação SHALL criar crédito na origem e débito de igual valor no destino. (`FDC-32`)
2. IF origem e destino forem iguais, não forem contas financeiras ativas, pertencerem a livros diferentes, o valor não for positivo ou sua moeda diferir da moeda-base THEN a aplicação SHALL rejeitar a transferência sem persistir lançamento. (`FDC-33`)
3. WHEN uma transferência for registrada THEN o lançamento SHALL conter somente as contas financeiras de origem e destino, sem posting em conta `INCOME` ou `EXPENSE`. (`FDC-34`)
4. WHEN os cenários usarem despesa em `ASSET`, despesa em `LIABILITY` ou transferência em qualquer par ordenado de `ASSET` e `LIABILITY` THEN a aplicação SHALL aceitar cada combinação válida e manter os sinais definidos por `FDC-28` e `FDC-32`. (`FDC-62`)

**Independent Test**: Transferir entre duas contas e provar que o saldo se desloca pelo valor exato enquanto o total de receita e despesa permanece zero.

### P1: Reverter uma movimentação sem apagar histórico ⭐ MVP

**User Story**: Como usuário local, quero corrigir uma movimentação por reversão para preservar uma trilha auditável.

**Why P1**: O ledger append-oriented depende de correções explícitas, não de edição destrutiva.

**Acceptance Criteria**:

1. WHEN `ReverseJournalEntry` receber um lançamento reversível THEN a aplicação SHALL criar um novo lançamento com a mesma moeda e postings de contas e valores exatamente opostos ao original. (`FDC-35`)
2. WHEN a reversão for confirmada THEN a aplicação SHALL persistir atomicamente o novo lançamento, `reversalOf` no reversor e `reversedBy` no original. (`FDC-36`)
3. IF um lançamento já possuir `reversedBy` THEN a aplicação SHALL rejeitar nova reversão com `JOURNAL_ENTRY_ALREADY_REVERSED`. (`FDC-37`)
4. WHEN uma reversão for criada THEN a aplicação SHALL preservar sem alteração o lançamento e os postings originais. (`FDC-38`)
5. IF a data solicitada para a reversão for anterior a `original.occurredOn` THEN a aplicação SHALL rejeitar o comando com `REVERSAL_DATE_BEFORE_ORIGINAL` sem persistir mudanças ou publicar eventos. (`FDC-60`)
6. IF o lançamento alvo possuir `reversalOf` THEN a aplicação SHALL rejeitar o comando com `JOURNAL_ENTRY_REVERSAL_NOT_REVERSIBLE` sem persistir mudanças ou publicar eventos. (`FDC-61`)

**Independent Test**: Reverter uma despesa, verificar os vínculos entre entradas, comparar posting a posting e provar que a soma combinada é zero.

### P1: Consultar saldo e extrato derivados ⭐ MVP

**User Story**: Como usuário local, quero consultar saldo e extrato para verificar o efeito de cada movimentação.

**Why P1**: O recorte só é útil se o estado financeiro puder ser reconstruído e inspecionado.

**Acceptance Criteria**:

1. WHEN `GetAccountBalance` consultar uma conta em uma data-limite THEN a aplicação SHALL somar somente os postings dessa conta com `occurredOn` menor ou igual à data informada. (`FDC-39`)
2. WHEN um saldo for exibido THEN a aplicação SHALL manter o sinal bruto para `ASSET` e `EXPENSE` e invertê-lo para `LIABILITY`, `INCOME` e `EQUITY`. (`FDC-40`)
3. WHEN `GetAccountStatement` consultar uma conta THEN a aplicação SHALL retornar um item por posting da conta com ID do lançamento, data, descrição, valor assinado e saldo corrente. (`FDC-41`)
4. WHEN itens de extrato compartilharem a mesma data THEN a aplicação SHALL ordená-los por `occurredOn` decrescente e depois por `sequence` decrescente. (`FDC-42`)
5. IF uma consulta solicitar uma conta ausente ou de outro livro THEN a aplicação SHALL retornar `ENTITY_NOT_FOUND` sem expor dados de outro livro. (`FDC-43`)
6. WHEN um lançamento e sua reversão estiverem no período consultado THEN a aplicação SHALL exibir ambos no extrato e refletir efeito líquido zero no saldo. (`FDC-44`)

**Independent Test**: Consultar ativo e passivo antes e depois de lançamentos e reversões, verificando valores, ordenação, isolamento e saldo corrente de cada linha.

### P1: Executar casos de uso de forma atômica e determinística ⭐ MVP

**User Story**: Como mantenedor do Open Coin, quero contratos de aplicação e adapters em memória fiéis para validar o núcleo antes do SQLite.

**Why P1**: A infraestrutura em memória é o primeiro gate comportamental e não pode mascarar falhas que surgiriam na persistência real.

**Acceptance Criteria**:

1. WHEN um command entrar na camada de aplicação THEN a aplicação SHALL aceitar somente primitivos serializáveis e converter esses valores para tipos de domínio dentro do caso de uso. (`FDC-45`)
2. The aplicação SHALL usar repositórios somente para raízes de agregação e query ports separados para saldo e extrato. (`FDC-46`)
3. WHEN um repositório em memória salvar ou carregar um agregado THEN ele SHALL usar uma cópia independente para impedir persistência implícita sem `add` ou `save`. (`FDC-47`)
4. IF um repositório receber um ID já persistido em `add` THEN ele SHALL rejeitar a operação com `DUPLICATE_ENTITY`. (`FDC-48`)
5. IF qualquer operação dentro de `TransactionManager.execute` falhar THEN o gerenciador SHALL restaurar todos os repositórios ao estado anterior à transação. (`FDC-49`)
6. IF `save` receber uma versão esperada diferente da versão persistida THEN o repositório SHALL rejeitar a escrita com `OPTIMISTIC_CONCURRENCY_FAILURE` e preservar o agregado persistido. (`FDC-50`)
7. WHEN uma transação de escrita for confirmada THEN a aplicação SHALL publicar os eventos de domínio produzidos somente depois do commit. (`FDC-51`)
8. WHEN um livro e suas contas de sistema forem confirmados THEN a aplicação SHALL publicar um `FinancialBookCreated` e quatro `LedgerAccountCreated`. (`FDC-52`)
9. WHEN uma conta financeira ou categoria for confirmada THEN a aplicação SHALL publicar um `LedgerAccountCreated` para a conta criada. (`FDC-53`)
10. WHEN saldo inicial, despesa, receita ou transferência for confirmado THEN a aplicação SHALL publicar um `JournalEntryPosted` para o lançamento criado. (`FDC-54`)
11. WHEN uma reversão for confirmada THEN a aplicação SHALL publicar um `JournalEntryPosted` para o reversor e um `JournalEntryReversed` que relacione original e reversor. (`FDC-55`)
12. IF uma transação de escrita falhar ou sofrer rollback THEN a aplicação SHALL publicar zero eventos dessa transação. (`FDC-56`)
13. IF uma regra esperada de domínio ou aplicação falhar THEN o caso de uso SHALL retornar um `Result` de falha com código estável, sem expor uma exceção de infraestrutura ao consumidor. (`FDC-57`)
14. WHEN testes fornecerem `Clock`, `IdGenerator` e event publisher determinísticos THEN a aplicação SHALL produzir os mesmos IDs, datas, eventos e resultados em execuções equivalentes. (`FDC-58`)
15. WHEN um `JournalEntry` for confirmado THEN a aplicação SHALL persistir `recordedAt` como o instante ISO 8601 fornecido por `Clock`. (`FDC-63`)
16. WHEN um `JournalEntry` for confirmado THEN a aplicação SHALL persistir `sequence` como uma string decimal reservada dentro da mesma transação por `JournalEntryRepository.reserveNextSequence(bookId)`, única e estritamente crescente dentro do `bookId`. (`FDC-64`)
17. WHEN um evento de domínio for envelopado THEN a aplicação SHALL incluir `eventVersion` igual a `1`. (`FDC-65`)
18. WHEN um evento de domínio for envelopado THEN a aplicação SHALL incluir `aggregateVersion` igual à versão do agregado que produziu o fato. (`FDC-66`)

**Independent Test**: Executar os casos de uso contra um store em memória, provocar duplicidade, conflito de versão e falha intermediária e comparar estado, eventos e resultados antes e depois.

---

## Edge Cases

- `FDC-02`, `FDC-21`, `FDC-27`, `FDC-30` e `FDC-33` cobrem incompatibilidades de moeda.
- `FDC-18` a `FDC-24` impedem qualquer forma de lançamento estruturalmente inválido.
- `FDC-09` e `FDC-49` cobrem rollback de alterações em múltiplos agregados.
- `FDC-35` a `FDC-38`, `FDC-60` e `FDC-61` cobrem reversão exata, data válida e encadeamento proibido.
- `FDC-41`, `FDC-42`, `FDC-44`, `FDC-63` e `FDC-64` cobrem extrato temporalmente determinístico e saldos correntes após reversões.
- `FDC-59` impede que `SetOpeningBalance` some acidentalmente dois saldos iniciais ativos.
- `FDC-62` cobre explicitamente despesas e transferências entre os tipos financeiros `ASSET` e `LIABILITY`.
- `FDC-47` e `FDC-50` impedem que referências compartilhadas ou escritas concorrentes alterem o estado sem persistência válida.

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| --- | --- | --- | --- |
| FDC-01 | P1: Primitivas financeiras seguras | Validation | Verified |
| FDC-02 | P1: Primitivas financeiras seguras | Validation | Verified |
| FDC-03 | P1: Primitivas financeiras seguras | Validation | Verified |
| FDC-04 | P1: Primitivas financeiras seguras | Validation | Verified |
| FDC-05 | P1: Primitivas financeiras seguras | Validation | Verified |
| FDC-06 | P1: Criar um livro financeiro isolado | Validation | Verified |
| FDC-07 | P1: Criar um livro financeiro isolado | Validation | Verified |
| FDC-08 | P1: Criar um livro financeiro isolado | Validation | Verified |
| FDC-09 | P1: Criar um livro financeiro isolado | Validation | Verified |
| FDC-10 | P1: Criar um livro financeiro isolado | Validation | Verified |
| FDC-11 | P1: Criar um livro financeiro isolado | Validation | Verified |
| FDC-12 | P1: Criar contas financeiras e categorias | Validation | Verified |
| FDC-13 | P1: Criar contas financeiras e categorias | Validation | Verified |
| FDC-14 | P1: Criar contas financeiras e categorias | Validation | Verified |
| FDC-15 | P1: Criar contas financeiras e categorias | Validation | Verified |
| FDC-16 | P1: Criar contas financeiras e categorias | Validation | Verified |
| FDC-17 | P1: Criar contas financeiras e categorias | Validation | Verified |
| FDC-18 | P1: Preservar as invariantes de todo lançamento | Validation | Verified |
| FDC-19 | P1: Preservar as invariantes de todo lançamento | Validation | Verified |
| FDC-20 | P1: Preservar as invariantes de todo lançamento | Validation | Verified |
| FDC-21 | P1: Preservar as invariantes de todo lançamento | Validation | Verified |
| FDC-22 | P1: Preservar as invariantes de todo lançamento | Validation | Verified |
| FDC-23 | P1: Preservar as invariantes de todo lançamento | Validation | Verified |
| FDC-24 | P1: Preservar as invariantes de todo lançamento | Validation | Verified |
| FDC-25 | P1: Definir saldo inicial e registrar fluxo financeiro | Validation | Verified |
| FDC-26 | P1: Definir saldo inicial e registrar fluxo financeiro | Validation | Verified |
| FDC-27 | P1: Definir saldo inicial e registrar fluxo financeiro | Validation | Verified |
| FDC-28 | P1: Definir saldo inicial e registrar fluxo financeiro | Validation | Verified |
| FDC-29 | P1: Definir saldo inicial e registrar fluxo financeiro | Validation | Verified |
| FDC-30 | P1: Definir saldo inicial e registrar fluxo financeiro | Validation | Verified |
| FDC-31 | P1: Definir saldo inicial e registrar fluxo financeiro | Validation | Verified |
| FDC-32 | P1: Transferir entre contas | Validation | Verified |
| FDC-33 | P1: Transferir entre contas | Validation | Verified |
| FDC-34 | P1: Transferir entre contas | Validation | Verified |
| FDC-35 | P1: Reverter uma movimentação | Validation | Verified |
| FDC-36 | P1: Reverter uma movimentação | Validation | Verified |
| FDC-37 | P1: Reverter uma movimentação | Validation | Verified |
| FDC-38 | P1: Reverter uma movimentação | Validation | Verified |
| FDC-39 | P1: Consultar saldo e extrato | Validation | Verified |
| FDC-40 | P1: Consultar saldo e extrato | Validation | Verified |
| FDC-41 | P1: Consultar saldo e extrato | Validation | Verified |
| FDC-42 | P1: Consultar saldo e extrato | Validation | Verified |
| FDC-43 | P1: Consultar saldo e extrato | Validation | Verified |
| FDC-44 | P1: Consultar saldo e extrato | Validation | Verified |
| FDC-45 | P1: Execução atômica e determinística | Validation | Verified |
| FDC-46 | P1: Execução atômica e determinística | Validation | Verified |
| FDC-47 | P1: Execução atômica e determinística | Validation | Verified |
| FDC-48 | P1: Execução atômica e determinística | Validation | Verified |
| FDC-49 | P1: Execução atômica e determinística | Validation | Verified |
| FDC-50 | P1: Execução atômica e determinística | Validation | Verified |
| FDC-51 | P1: Execução atômica e determinística | Validation | Verified |
| FDC-52 | P1: Execução atômica e determinística | Validation | Verified |
| FDC-53 | P1: Execução atômica e determinística | Validation | Verified |
| FDC-54 | P1: Execução atômica e determinística | Validation | Verified |
| FDC-55 | P1: Execução atômica e determinística | Validation | Verified |
| FDC-56 | P1: Execução atômica e determinística | Validation | Verified |
| FDC-57 | P1: Execução atômica e determinística | Validation | Verified |
| FDC-58 | P1: Execução atômica e determinística | Validation | Verified |
| FDC-59 | P1: Definir saldo inicial e registrar fluxo financeiro | Validation | Verified |
| FDC-60 | P1: Reverter uma movimentação | Validation | Verified |
| FDC-61 | P1: Reverter uma movimentação | Validation | Verified |
| FDC-62 | P1: Transferir entre contas | Validation | Verified |
| FDC-63 | P1: Execução atômica e determinística | Validation | Verified |
| FDC-64 | P1: Execução atômica e determinística | Validation | Verified |
| FDC-65 | P1: Execução atômica e determinística | Validation | Verified |
| FDC-66 | P1: Execução atômica e determinística | Validation | Verified |

**Coverage:** 66 requisitos, 66 mapeados para tarefas, 0 não mapeados. A baseline v1.0.0 verificou FDC-01 a FDC-58. Na v1.1.0, o FDC-42 emendado e FDC-59 a FDC-66 foram verificados nesta validação.

---

## Known Deferred Decisions

| Decision | Boundary for the next spec |
| --- | --- |
| Persistência SQLite | Reutilizar uma suíte de repository contracts entre memória e SQLite; cobrir cópias independentes, duplicidade, concorrência otimista, rollback, isolamento por `bookId`, reidratação, vínculos de reversão, ordenação, constraints e migrations reais em `:memory:` com foreign keys habilitadas. |
| Entrega durável de eventos | Persistir agregados e eventos na mesma transação por transactional outbox; o dispatcher lê, publica e marca itens processados com retry idempotente. |
| Origem e importações | Evoluir `origin` para distinguir `MANUAL`, `SYSTEM` com operação, `IMPORT` com identidade externa, `SCHEDULE` com ocorrência e `INVESTMENT` com operação. Manter o registro externo mutável e conciliar antes de produzir `JournalEntry` imutável. A chave de deduplicação de importação será `bookId + provider + connectionId + externalId`. |
| Conciliação | Especificar `ReconcileAccountBalance` usando a conta `RECONCILIATION_ADJUSTMENT`, sem alterar lançamentos históricos. |
| Splits | Expor casos de uso especializados, validar a soma dos splits e definir `Money.allocate` com distribuição determinística das unidades mínimas restantes antes de um lançamento genérico. |
| Multimoeda | Registrar ADR antes do schema SQLite definitivo escolhendo livro estritamente monomoeda ou moeda por conta com operação cambial explícita. |
| Consultas para UI | Especificar `GetFinancialBook`, `ListFinancialAccounts`, `ListIncomeCategories`, `ListExpenseCategories`, `GetJournalEntry`, `ListJournalEntries` e extrato com `from`, `to`, cursor e limite. |

## Next Dependent Specifications

1. `sqlite-financial-adapter` para schema, migrations, foreign keys, transações e repository contracts compartilhados.
2. `financial-event-outbox` para entrega durável e evolução de eventos.
3. `account-reconciliation` para ajuste contra saldo externo.
4. `split-journal-entries` para splits e alocação monetária determinística.
5. `financial-read-models` para listagens e paginação exigidas pela UI.
6. `external-transaction-staging` para CSV, OFX e provedores externos.

---

## Success Criteria

- [x] Os nove testes independentes das histórias v1.0.0 passam sem React, Tauri, SQLite, rede ou relógio real.
- [x] Todo lançamento aceito soma exatamente zero em sua moeda.
- [x] O fluxo completo cria um livro, duas contas financeiras, uma categoria, saldo inicial, despesa, receita, transferência e reversão, e reconstrói os saldos esperados pelo extrato.
- [x] Falhas intermediárias deixam zero alterações parciais e zero eventos publicados.
- [x] Consultas nunca combinam dados de livros diferentes.
- [ ] Lançamentos do mesmo dia retornam em ordem de registro e mantêm saldos correntes intermediários corretos.
- [ ] Saldo inicial duplicado, reversão retroativa e reversão de reversão falham com os códigos exatos e sem efeitos.
- [ ] A matriz `ASSET`/`LIABILITY` e os campos de versão dos eventos possuem evidência automatizada.
