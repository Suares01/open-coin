# STATE

## Decisions

### AD-001
- **Decision**: O Open Coin será local-first e todas as regras financeiras essenciais funcionarão sem conta, internet ou servidor.
- **Reason**: O dispositivo é a origem da operação; servidor, integrações e sincronização são capacidades opcionais.
- **Trade-off**: Capacidades remotas futuras deverão sincronizar réplicas sem se tornar pré-requisito para os fluxos financeiros.
- **Scope**: Toda a arquitetura, persistência, integrações e experiência do produto.
- **Date**: 2026-08-04
- **Status**: active

### AD-002
- **Decision**: O núcleo financeiro usará ledger de partidas dobradas append-oriented, e categorias serão contas `INCOME` ou `EXPENSE` do próprio ledger.
- **Reason**: Um único modelo consistente cobre contas, transferências, cartões, receitas, despesas e extensões futuras sem exceções paralelas.
- **Trade-off**: Casos de uso simples precisam produzir postings balanceados e correções exigem reversões explícitas.
- **Scope**: Domínio financeiro, consultas, planejamento, investimentos, integrações e relatórios.
- **Date**: 2026-08-04
- **Status**: active

### AD-003
- **Decision**: O monólito modular separará regras puras, coordenação e adapters nos pacotes `@open-coin/domain`, `@open-coin/application` e `@open-coin/infrastructure-memory`, com dependências apontando para dentro.
- **Reason**: A separação torna as invariantes independentes de framework e prova os contratos antes de SQLite, Tauri ou integrações.
- **Trade-off**: O monorepo terá mais configuração e fronteiras explícitas do que uma biblioteca única.
- **Scope**: Pacotes de domínio, aplicação e infraestrutura presentes e futuros.
- **Date**: 2026-08-04
- **Status**: active

### AD-004
- **Decision**: Adapters SQLite dependerão de `SqliteExecutor` e `SqliteDatabase` neutros de plataforma; drivers concretos de Node, Tauri ou outros runtimes permanecerão fora dos repositories e do entrypoint neutro.
- **Reason**: A mesma implementação de migrations, mappers, repositories, queries e transaction manager deve funcionar sobre uma conexão ou transação garantida pelo runtime.
- **Trade-off**: Cada runtime precisará fornecer e testar seu próprio driver, e o pacote neutro não poderá abrir o banco sozinho.
- **Scope**: Persistência SQLite, drivers locais e integrações de runtime presentes e futuras.
- **Date**: 2026-08-04
- **Status**: active

### AD-005
- **Decision**: Leituras orientadas a produto usarão query ports agrupados por contexto; read models complexos terão SQLite como implementação de referência, sem exigir um adapter em memória equivalente.
- **Reason**: Repositories permanecem focados em agregados e relatórios não serão duplicados em arrays com uma segunda implementação contábil.
- **Trade-off**: Testes de domínio e commands continuam rápidos em memória, enquanto listas e indicadores complexos dependem de SQLite `:memory:` para prova comportamental.
- **Scope**: Queries, relatórios, dashboards e read models presentes e futuros.
- **Date**: 2026-08-04
- **Status**: active

## Handoff
