# Kurage API

API REST do Kurage em Java 21 e Spring Boot 4.1. O backend atual é um monólito
modular e permanece a autoridade para identidade, times, dados competitivos,
inventário, servidores e, no roadmap, billing/entitlements.

## Estado

Alfa técnica. A camada unitária contém mocks somente para isolar regras locais; a
camada de integração usa PostgreSQL e Redis reais via Testcontainers, com Flyway.
Ela não valida ainda R2/Steam/FACEIT. Motor de partidas,
ELO transacional, billing e provisionamento de servidores ainda não existem.

Módulos implementados ou parciais:

- Steam OpenID com state one-time, JWT e refresh atômico no Redis;
- usuários, perfis, FACEIT, visitas e busca;
- times, membros, convites, links e papéis;
- ranking e snapshots de leitura;
- inventário/loadout virtual em JSONB;
- notificações genéricas e entregas por usuário no PostgreSQL;
- heartbeat/browser de servidores;
- uploads opcionais no Cloudflare R2, com validação pelo conteúdo, limites,
  reencode PNG, chaves imutáveis e descarte seguro de versões substituídas.

## Desenvolvimento local

Pré-requisitos: Java 21, Maven 3.9+, Docker e Docker Compose.

```powershell
Copy-Item .env.example .env
# Substitua os placeholders e gere JWT_SECRET e GAME_SERVER_API_KEY independentes
# com pelo menos 32 bytes/caracteres antes de iniciar a API.
docker compose -f compose.yaml --env-file .env up -d
mvn spring-boot:run
```

A API usa `http://localhost:8080` e atualmente não possui prefixo global `/api`.
Nunca reutilize credenciais/defaults do Compose em ambiente acessível externamente.
Mesmo com `GAME_SERVER_BOOTSTRAP_ENABLED=false`, a chave é vinculada ao ID estável
do Retake #1 seedado pelo Flyway; habilitar o bootstrap também reconcilia nome,
host, porta e capacidade a partir do ambiente.

## Teste e package

```powershell
.\mvnw.cmd test
.\mvnw.cmd --batch-mode --no-transfer-progress verify -Pintegration
.\mvnw.cmd package
docker compose -f compose.yaml --env-file .env config --quiet
```

`verify -Pintegration` exige Docker iniciado e usa containers efêmeros; ele
também é executado no CI. Consulte a [estratégia de testes](../docs/pt/11_testes_integracao.md).

## Segurança já aplicada

- a API falha no boot sem `JWT_SECRET` e `GAME_SERVER_API_KEY` fortes;
- o heartbeat falha fechado e compara a credencial em tempo constante;
- cada servidor possui seu próprio hash SHA-256 de credencial no PostgreSQL; a
  chave em texto puro existe somente no ambiente do backend e do processo CS2;
- o Compose de produção mantém PostgreSQL/Redis apenas na rede privada, exige
  credenciais e habilita autenticação/persistência no Redis;
- containers possuem healthchecks e ordem de inicialização por saúde.
- refresh tokens ficam hashados no Redis, famílias possuem vida absoluta de 30
  dias e chamadas concorrentes recebem uma única rotação;
- Caddy normaliza o IP real somente a partir de proxies Cloudflare confiáveis e
  refresh/logout exigem uma origem frontend permitida.
- o JWT identifica a conta, mas papel e status são sempre relidos do PostgreSQL;
  suspensão e alteração de papel passam a valer sem esperar o token expirar.

## Bloqueadores de produção restantes

- adicionar API/painel administrativo e trilha de auditoria durável para
  operar suspensões (o estado e a revogação imediata já existem);
- remover geolocalização de IP via HTTP;
- implantar dashboards/alertas, backup, restore e runbooks (métricas Prometheus e
  correlação de requisições já estão instrumentadas);
- concluir os domínios Match, Billing, Entitlement e ServerLease.

Detalhes e evidências: [auditoria completa](../docs/pt/08_auditoria_estado_atual.md).
O código está sob a [licença proprietária Kurage](../LICENSE).
