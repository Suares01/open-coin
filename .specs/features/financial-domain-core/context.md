# Contexto do Núcleo Financeiro

**Gathered:** 2026-08-04
**Updated:** 2026-08-04
**Spec:** `.specs/features/financial-domain-core/spec.md`
**Status:** Completed
**Feature version:** 1.1.0

---

## Feature Boundary

Este recorte entrega o núcleo financeiro local e independente de frameworks: `FinancialBook`, contas e categorias como `LedgerAccount`, lançamentos de partidas dobradas, saldo inicial, despesas, receitas, transferências, reversões, saldo e extrato. A camada de aplicação coordena tudo sobre repositórios e transações em memória. UI, SQLite, integrações, planejamento, investimentos e sincronização ficam fora.

---

## Implementation Decisions

### Modelo contábil

- O ledger usa partidas dobradas e valores assinados: positivo é débito, negativo é crédito.
- `JournalEntry` é append-oriented e imutável depois de registrado.
- Correções criam um lançamento de reversão; o original permanece no histórico.
- Saldos são derivados dos postings, nunca mantidos como estado mutável autoritativo.

### Livro, contas e categorias

- `FinancialBook` é o limite de isolamento e possui moeda-base e timezone.
- Categorias são contas `INCOME` ou `EXPENSE`; contas financeiras são `ASSET` ou `LIABILITY`.
- A criação do livro e de suas quatro contas de sistema ocorre na mesma transação.
- Contas de sistema são protegidas por propósito estável, não pelo texto exibido de seus nomes.

### Fronteiras da aplicação

- O domínio não conhece React, Tauri, SQLite, Pluggy nem APIs de plataforma.
- Commands recebem tipos primitivos e serializáveis; casos de uso constroem os value objects.
- IDs e tempo entram pelas portas `IdGenerator` e `Clock`.
- Repositórios persistem raízes de agregação; saldo e extrato usam query ports separados.
- Eventos são publicados somente depois de uma transação confirmada.
- Cada lançamento recebe `recordedAt` e uma `sequence` estritamente crescente por livro; a ordem intradiária não depende do ID.
- Um saldo inicial permanece único enquanto seu lançamento não tiver sido revertido.
- Reversões não antecedem o lançamento original e não podem apontar para outro reversor.
- Envelopes de evento incluem `eventVersion` e `aggregateVersion` antes da persistência durável.

### Validação inicial

- Testes de domínio não usam banco nem mocks de framework.
- Testes de aplicação usam implementações concretas em memória.
- O store em memória clona agregados e suporta rollback para não mascarar a ausência de `save`.
- SQLite e repository contract tests serão especificados em um recorte posterior.

### Agent's Discretion

- Nomes de arquivos, exports públicos e organização interna de módulos, respeitando os limites de pacote.
- Forma concreta dos builders e fixtures de teste.
- Estrutura interna do store em memória e estratégia de cópia de agregados.
- Texto das mensagens de erro; os códigos estáveis definidos pela especificação não podem mudar.
- Payload adicional dos eventos, desde que o envelope preserve tipo, versão do evento, agregado, versão do agregado, livro e data técnica.

### Declined / Undiscussed Gray Areas → Assumptions

- Comandos manuais não têm chave de idempotência neste recorte; `SetOpeningBalance` é a exceção semântica e rejeita repetição enquanto houver lançamento ativo.
- O saldo inicial entra como valor positivo de exibição; o tipo da conta define o sinal contábil.
- O publisher local é síncrono e não falha depois do commit.
- Empates de data no extrato são resolvidos por `sequence` decrescente; o ID permanece opaco.
- Timezones precisam ser não vazios, mas não são validados contra uma base IANA nesta etapa.
- Moedas usam códigos de três letras ASCII maiúsculas e todo lançamento usa a moeda-base do livro.
- Duplicidade de nome usa `trim`, Unicode NFC e conversão para minúsculas independente de locale.
- Descrições são obrigatórias e normalizadas com `trim`, sem limite de tamanho neste pacote.
- Corrigir saldo inicial significa reverter o lançamento anterior e executar `SetOpeningBalance` novamente.
- Uma reversão usa data igual ou posterior à original; reversores não são reversíveis na V1.

Esses defaults também constam em `Assumptions & Open Questions` na especificação e foram confirmados em 2026-08-04.

---

## Specific References

- O texto “Proposta para o núcleo de domínio” define o modelo, as invariantes, a ordem recomendada e o primeiro recorte funcional.
- O texto “Direção arquitetural recomendada” fixa a visão local-first e mantém integrações e servidor como capacidades opcionais futuras.
- Não há uma aplicação anterior cuja interface ou comportamento visual precise ser reproduzido.

---

## Deferred Ideas

- Persistência SQLite com migrations reais, foreign keys habilitadas e testes de contrato compartilhados entre adapters.
- Transactional outbox para persistir estado e eventos na mesma transação.
- Origem externa mutável e idempotente antes da criação de `JournalEntry` imutável.
- Conciliação de saldo com `RECONCILIATION_ADJUSTMENT`.
- Hierarquia completa de categorias, renomeação, movimentação e arquivamento.
- Alteração de lançamento por reversão mais substituição.
- Splits com alocação determinística, parcelamentos, cartões e faturas como fluxos especializados.
- ADR de multimoeda antes do schema SQLite definitivo.
- Queries paginadas de livro, contas, categorias, lançamentos e extrato antes da UI.
- Planning, investimentos, importações, sincronização, backup e insights.
