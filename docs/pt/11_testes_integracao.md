# Estratégia de testes com serviços reais

> **Estado: validado em 27/08/2026.** H2 foi removido do backend. A suíte
> de integração usa PostgreSQL 16 e Redis 7 reais, iniciados pelo Testcontainers.

[← Índice](./00_index.md)

## Camadas

- `.\mvnw.cmd test`: testes unitários rápidos. Mocks permanecem apenas nesta camada para
  isolar regras puras e cenários de falha; não existem mocks no código de produção.
- `.\mvnw.cmd --batch-mode --no-transfer-progress verify -Pintegration`: executa
  também os testes `*IT` contra containers Docker reais. Em Linux/macOS, use
  `./mvnw` no lugar de `.\mvnw.cmd`. A execução é obrigatória no CI.

Os testes de integração validam Flyway V1–V10, PostgreSQL/JSONB, notificações,
contatos privados, identidade/heartbeat de servidores, inventário, adesivos,
chaveiros, kit de música, rate limit com TTL atômico, state Steam one-time e
rotação concorrente de refresh token com armazenamento hash. Eles
não podem usar H2, Redis em memória ou serviços simulados.

PostgreSQL e Redis são singletons por processo Failsafe: as portas permanecem
estáveis enquanto o Spring reutiliza o contexto. Cada teste roda em transação
revertida no PostgreSQL, e o Redis autenticado é limpo após cada caso. Tarefas
agendadas ficam desativadas somente nessa suíte para não disputar dados com os
testes.

## Pré-requisitos locais

Docker Desktop/Engine deve estar iniciado e acessível pelo usuário antes de rodar
`verify -Pintegration`. A suíte falha explicitamente sem Docker, usa bancos
efêmeros isolados e não se conecta
ao Compose de desenvolvimento nem aos seus volumes.

No GitHub Actions, o workflow verifica a engine antes do Maven, limita a execução
a 20 minutos e publica relatórios Surefire/Failsafe quando houver falha.

## Evolução obrigatória

Cada migration nova deve ganhar uma asserção de integração no PostgreSQL. Fluxos
que alterarem PostgreSQL e Redis devem ter ao menos um teste end-to-end de serviço
real. Provedores externos (Steam, FACEIT, R2, pagamento e DatHost) precisam de
ambientes sandbox/contratos próprios; não devem ser falsamente cobertos por mock.
