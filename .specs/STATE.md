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

## Handoff

