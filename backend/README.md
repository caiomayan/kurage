# Kurage API

API REST do Kurage em Java 21 e Spring Boot 4.1. O backend atual é um monólito
modular e permanece a autoridade para identidade, times, dados competitivos,
inventário, servidores e, no roadmap, billing/entitlements.

## Estado

Alfa técnica. A suíte atual possui 137 testes aprovados, mas usa H2 e mocks; não
valida todo o conjunto PostgreSQL/Redis/Mongo/R2/Steam/FACEIT. Motor de partidas,
ELO transacional, billing e provisionamento de servidores ainda não existem.

Módulos implementados ou parciais:

- Steam OpenID, JWT e refresh rotativo no Redis;
- usuários, perfis, FACEIT, visitas e busca;
- times, membros, convites, links e papéis;
- ranking e snapshots de leitura;
- inventário/loadout virtual em JSONB;
- notificações em MongoDB;
- heartbeat/browser de servidores;
- uploads opcionais no Cloudflare R2.

## Desenvolvimento local

Pré-requisitos: Java 21, Maven 3.9+, Docker e Docker Compose.

```powershell
Copy-Item .env.example .env
# Configure chaves de desenvolvimento e gere JWT_SECRET único.
docker compose -f compose.yaml --env-file .env up -d
mvn spring-boot:run
```

A API usa `http://localhost:8080` e atualmente não possui prefixo global `/api`.
Nunca reutilize credenciais/defaults do Compose em ambiente acessível externamente.

## Teste e package

```powershell
mvn test
mvn package
docker compose -f compose.yaml --env-file .env config --quiet
```

O próximo nível de cobertura deve usar Testcontainers com PostgreSQL/Redis e a
migração das notificações para PostgreSQL, além de contracts, concorrência e E2E.

## Bloqueadores de produção

- remover todos os fallbacks de segredo e falhar no boot;
- não publicar portas de bancos;
- autenticar cada servidor individualmente;
- adicionar state/nonce Steam e refresh atômico;
- validar/reencodar uploads;
- remover geolocalização de IP via HTTP;
- implementar backup, restore, observabilidade, CI/CD e runbooks;
- concluir os domínios Match, Billing, Entitlement e ServerLease.

Detalhes e evidências: [auditoria completa](../docs/pt/08_auditoria_estado_atual.md).
O código está sob a [licença proprietária Kurage](../LICENSE).

