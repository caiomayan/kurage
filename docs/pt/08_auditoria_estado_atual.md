# Auditoria completa do estado atual do Kurage

> **Atualização de implementação (21/08/2026):** MongoDB foi removido e as
> notificações passaram para PostgreSQL por `V4__notifications_in_postgres.sql`.
> As referências a Mongo neste documento descrevem o snapshot auditado em
> 20/08/2026 e permanecem como registro histórico. Consulte
> [Notificações no PostgreSQL](./10_notificacoes_postgres.md) para o estado atual.
>
> **Atualização de testes (22/08/2026):** H2 foi removido. A suíte de integração
> usa PostgreSQL e Redis reais via Testcontainers e é obrigatória no CI.
>
> **Atualização de segurança (29/08/2026):** heartbeat agora usa credenciais
> individuais por servidor e falha fechado; autenticação consulta papel e estado
> atuais da conta; uploads são limitados, validados, reencodados e armazenados em
> chaves imutáveis. Os achados originais permanecem abaixo como baseline e a
> tabela de P0 registra o estado resolvido.
>
> **Atualização de integridade dos dados (29/08/2026):** perfis, hovercards,
> menu, home e ranking deixaram de fabricar posição, ELO, rating e histórico.
> Contas sem partidas não recebem posição nem entram na classificação. A regra
> foi validada contra PostgreSQL 16 real; lint, testes e build do frontend agora
> também são um gate dedicado do CI.
>
> **Atualização de estados de falha (29/08/2026):** ranking, busca, pódio da home,
> inventário público e perfis distinguem ausência legítima de indisponibilidade.
> Os proxies de inventário não devolvem mais HTTP 200 com loadout vazio quando
> seus upstreams falham.
>
> **Fechamento operacional (29/08/2026):** o cadastro deixou de transmitir IP a
> serviço HTTP de geolocalização, links jurídicos agora apontam para minutas reais,
> CI ganhou scan de segredos/Dependabot e foi publicado um runbook com RPO/RTO e
> gates separados para alfa fechada e produção paga. A alfa ainda depende das
> ações externas listadas no documento 15.

**Data-base:** 20 de agosto de 2026  
**Escopo:** frontend, backend, dados, autenticação, integrações, plugins CS2,
infraestrutura, segurança, operação, produto, qualidade e prontidão para Git.  
**Classificação:** alfa técnica; não aprovado para produção ou cobrança.

## 1. Parecer executivo

Kurage já é um portfólio tecnicamente relevante: há uma aplicação Next.js de boa
qualidade visual, um backend Spring Boot com domínio substancial, autenticação
Steam, sessões rotativas, times, rankings, inventário virtual, telemetria de
servidor e plugins CounterStrikeSharp. A suíte Java é ampla para o estágio e passa
integralmente.

Ainda não existe, porém, um SaaS vendável de ponta a ponta. O código atual é uma
base de produto com protótipos conectados. Os quatro elos que formariam o negócio
— **partida válida, atualização de ELO, servidor provisionado e assinatura paga**
— não estão implementados como um único fluxo. A interface vende planos cujos
botões não executam checkout, o servidor exibido não pertence a um tenant, o ELO
não recebe resultado de partida e o plugin de inventário não aplica itens no jogo.

O lançamento também está bloqueado por defaults de segredo, bancos publicados no
host, heartbeat fail-open, login Steam sem nonce de uso único, upload sem validação
forte, dados estatísticos artificiais no frontend, inventário local que pode
atravessar contas e ausência de LGPD/operação/recuperação.

**Decisão:** manter o backend como monólito modular, concluir um único loop
competitivo e operar inicialmente no Brasil. Usar Mercado Pago para cobrança e
DatHost como infraestrutura de servidores por API. Não construir bare metal,
anti-cheat próprio ou microserviços antes de haver uso que justifique isso.

## 2. Como a auditoria foi feita

- inventário de arquivos e dependências;
- leitura cruzada de controllers, services, entidades, migrations, hooks, páginas,
  providers, rotas, plugins e manifests;
- busca estática de contratos, autenticação, secrets, URLs, uploads e flags;
- execução de testes, lint, builds e validação dos Compose quando possível;
- comparação entre documentação, interface e comportamento implementado;
- verificação pública dos domínios documentados;
- consulta a fontes oficiais sobre Steam, LGPD, registro de software, GitHub e
  licença CounterStrikeSharp.

Limitações:

- a raiz recebida não continha `.git`; histórico, autoria de commits e vazamentos
  anteriores não puderam ser auditados;
- arquivos `.env` locais existem e contêm valores configurados; nenhum valor foi
  lido para o relatório ou reproduzido;
- o browser integrado não iniciou por falha no runtime confiável, portanto não
  houve QA visual automatizado. Build, rotas, estados e código foram inspecionados;
- não havia SDK .NET, Postgres local disponível no probe nem servidor CS2 dedicado;
- ambientes privados não informados ficaram fora do escopo.

## 3. Inventário factual

| Área | Base atual |
|---|---|
| Backend | Java 21, Spring Boot 4.1.0, Maven, 124 fontes principais (~6,6 mil linhas) |
| Frontend | Next.js 16.3.1, React 19.2.8, TypeScript, Tailwind 4, 97 fontes TS/TSX (~17,4 mil linhas) |
| Plugins | C#/.NET 10, CounterStrikeSharp 1.0.371, `Kurage.Core`, `Kurage.RetakeWeapons` e Inventory Simulator original |
| Transacional | PostgreSQL 16, JPA e Flyway |
| Efêmero/cache | Redis 7 |
| Notificações | MongoDB 6 |
| Objetos | Cloudflare R2 via API S3 |
| Integrações | Steam OpenID/Web API, FACEIT Data API e `ip-api.com` |
| Edge/containers | Caddy e Docker Compose |

Foram encontrados artefatos gerados (`target`, `.next`, `node_modules`, `bin`,
`obj`, DLL/PDB e releases) e mais de 1 GiB de thumbnails contando duplicações. Em
`frontend/public`, 312 arquivos ocupavam 760,55 MB; `public/thumbs` respondia por
758,68 MB. Considerando também a pasta `thumbs` da raiz, havia 441 arquivos para
apenas 149 conteúdos únicos: 292 cópias redundantes, aproximadamente 758,68 MiB.

A auditoria adicionou regras defensivas de Git/Docker para evitar secrets,
artefatos e duplicações evidentes no primeiro commit. Os 149 PNGs canônicos ainda
devem ser convertidos para AVIF/WebP e movidos para CDN/R2.

## 4. Arquitetura como construída

```mermaid
flowchart LR
    B[Navegador] --> N[Next.js App Router]
    N -->|REST| S[Spring Boot<br/>monólito modular]
    P[Plugins CS2] -->|REST| S
    S --> PG[(PostgreSQL)]
    S --> R[(Redis)]
    S --> M[(MongoDB)]
    S --> O[Cloudflare R2]
    S --> V[Steam]
    S --> F[FACEIT]
    C[Caddy] --> S
```

O sistema não é microserviços e não possui SSE, apesar de documentos antigos
afirmarem isso. É um conjunto distribuído com uma API monolítica. Para esta fase,
isso reduz custo cognitivo, deploys e falhas distribuídas. A API contém módulos
implícitos de identidade, usuários, FACEIT, ranking, times, inventário,
notificações e servidores, mas ainda há acoplamento entre serviços e stores.

### 4.1 Responsabilidade dos dados

| Store | Conteúdo atual | Parecer |
|---|---|---|
| PostgreSQL | usuários, FACEIT, stats, times, convites, inventários JSONB, visitas, servidores e snapshots | Deve ser a fonte transacional única |
| Redis | refresh tokens, famílias de sessão, rate limit, caches e roster live | Correto para dados efêmeros; precisa HA e autenticação |
| MongoDB | notificações | Custo operacional desnecessário no estágio atual; migrar para Postgres |
| R2 | avatars e logos | Adequado: conteúdo validado/reencodado, chaves imutáveis e substituição segura; falta reconciliação periódica de órfãos raros |

Não existem entidades comerciais de `Subscription`, `Price`, `PaymentEvent`,
`Entitlement`, `ServerLease`, `UsageLedger`, `Match`, `MatchParticipant` ou
`AuditLog`. `subscriptionTier` é apenas um atributo estático do usuário.

## 5. Fluxos ponta a ponta

### 5.1 Login Steam e sessão

1. O frontend inicia `GET /auth/steam`.
2. A API redireciona ao Steam OpenID.
3. O callback valida a resposta junto ao Steam, consulta o perfil e cria ou
   recupera o usuário.
4. Um refresh token vinculado ao dispositivo é armazenado no Redis e enviado em
   cookie HttpOnly/Secure/SameSite=Lax.
5. O frontend chama `POST /auth/refresh`, recebe access token JWT de 15 minutos e o
   mantém em memória.
6. `apiFetch` repete uma vez após 401 e o backend rotaciona a família de refresh.

Atualização validada em 27/08/2026: o state é one-time, ligado ao navegador e à
URL de retorno; a rotação Redis é atômica, tokens ficam hashados e a família tem
vida absoluta de 30 dias; o callback possui timeouts e não registra assinatura ou
parâmetros. Cookies são host-only por padrão e refresh/logout validam `Origin`.
Atualização validada em 29/08/2026: requisições autenticadas consultam no banco o
papel e o estado atuais da conta; uma suspensão revoga as famílias de refresh e
passa a bloquear imediatamente access tokens existentes. Ainda faltam API/painel
administrativo e audit log durável para operar essas mudanças.

### 5.2 Perfil, FACEIT, busca e ranking

Perfis e configurações funcionam, o FACEIT é sincronizado e há ranking/leitura de
snapshots. O header possui busca, mas não há página `/search`. O ranking limita a
primeira janela e filtra no cliente. O backend inicializa o ELO em 200, porém não
há ingestão de partida nem operação que atualize estatísticas competitivas.

Na linha de base, o frontend mascarava ausência com `#1`, ELO `2000`, rating
`1.0` e pontos de gráfico fabricados. Isso foi corrigido em 29/08: dados ausentes
aparecem como indisponíveis ou “em calibração”, gráficos usam somente snapshots
persistidos e contas com zero partidas são excluídas das consultas de ranking.

### 5.3 Times

O backend implementa criação, membros, convites, solicitações, links expiráveis,
papéis e transferência. A UI de gestão não existe e os links atuais apontam para
`/team/[tag]`, rota ausente. Concorrência pode ultrapassar usos máximos de link e
violar invariantes de ownership. Notificação Mongo síncrona dentro do fluxo JPA
cria inconsistência em falha parcial.

### 5.4 Inventário virtual

O site cria, importa, equipa e persiste um inventário virtual JSONB. Há proxies
para dados públicos de inventário/equipados. Caixas e crafting são simulações
client-side gratuitas. O produto definido manterá esse módulo **sem valor
monetário, compra aleatória, cash-out ou promessa de prêmio**.

O provider usa uma chave LocalStorage global. Se A sair e B entrar no mesmo
navegador com inventário remoto vazio, itens de A podem permanecer e ser gravados
em B. Erros de sincronização são silenciosos. O plugin C# apenas baixa e guarda o
JSON; não altera arma, skin, `CEconItemView` ou loadout dentro do CS2.

### 5.5 Servidores

`Kurage.Core` envia mapa e jogadores para `POST /servers/{id}/heartbeat`. A API
enriquece o roster, guarda estado live no Redis e marca offline após 90 segundos.
`/mar` consulta o browser a cada oito segundos.

Hoje existe apenas telemetria de demonstração. Não há proprietário/tenant,
provider ID, região, ciclo de vida, GSLT/RCON, provisionamento, start/stop,
configuração, cobrança por uso, quotas, console, backups, capacidade ou reconciliação.
Desde 29/08, cada servidor possui hash de credencial próprio no PostgreSQL e o
heartbeat falha fechado; a identidade de modo é fixa por processo e não pode ser
alterada por comandos em jogo.

### 5.6 Assinatura

O catálogo foi consolidado em um plano global, **Maré**, além do acesso gratuito.
O enum, os entitlements, a expiração efetiva e a identidade visual coral já estão
implementados. Ainda não há preço publicado, checkout, webhook, invoice, grace
period, cancelamento, reembolso, portal ou conciliação. `isVerifiedPro` permanece
uma verificação editorial independente e nunca é vendido pelo plano.

## 6. Matriz de maturidade

| Domínio | Estado | Para ficar pronto |
|---|---|---|
| Identidade | Beta técnico | painel/API de suspensão, auditoria e operação de segredos |
| Perfil/FACEIT | Beta técnico | timeouts, dados honestos, privacidade e tolerância a falhas |
| Times | Backend beta/UI ausente | páginas, invariantes concorrentes e autorização E2E |
| Ranking | Leitura protótipo | domínio de partidas, ELO versionado e paginação correta |
| Inventário | Simulador beta | isolamento por usuário, contrato/limites e aplicação real opcional |
| Servidores | Telemetria autenticada | control plane, tenant, provider, rotação e usage ledger |
| Billing | Não implementado | Mercado Pago, inbox idempotente, reconciliação e entitlements |
| Operação | Desenvolvimento | CI/CD, secrets, observabilidade, backup, restore e runbooks |
| Legal/compliance | Preparação | termos, privacidade, AUP, retenção, direitos de ativos e registro |

## 7. Pontos fortes

- linguagem visual distinta e consistente, útil para portfólio;
- TypeScript strict e build de produção válido;
- token de acesso em memória e refresh HttpOnly, melhor que JWT persistente no
  browser;
- cobertura Java relevante: controllers, services e casos de autorização;
- Flyway e separação razoável dos domínios;
- times possuem um conjunto rico de operações;
- Redis já é usado para sessão e live state;
- headers/CSP no Next e validação relativa do retorno Steam formam boas bases;
- plugins demonstram integração real entre jogo e plataforma;
- documentação bilíngue existente fornece material para ser corrigido e evoluído.

## 8. Bloqueadores P0 — antes de publicar ou cobrar

| ID | Achado e evidência | Implementação obrigatória |
|---|---|---|
| P0-01 | **Resolvido em 29/08:** havia fallback de JWT e secrets fracos | Compose exige valores e o boot valida presença/entropia; valores que já saíram da máquina ainda devem ser rotacionados pelo operador |
| P0-02 | **Resolvido em 29/08 para o artefato:** bancos estavam publicados | Compose de produção mantém PostgreSQL/Redis privados, Redis autenticado e Mongo removido; firewall real ainda integra o gate externo |
| P0-03 | **Resolvido em 29/08:** heartbeat usava chave global e validação no controller | Hash SHA-256 individual no PostgreSQL, comparação constante e fail-closed implementados |
| P0-04 | Nenhum motor de partidas/ELO | Criar Match/participants/result event idempotente, ELO versionado, audit log e disputa |
| P0-05 | **Resolvido para a alfa em 29/08:** Maré tinha apresentação sem cobrança | UI informa explicitamente “checkout e valor em preparação”, sem CTA de venda; billing E2E continua obrigatório para produção paga |
| P0-06 | **Resolvido em 29/08:** inventário podia atravessar contas | Backend virou fonte de verdade por usuário, estado é limpo na troca e falhas são visíveis |
| P0-07 | **Resolvido em 27/08:** login Steam possuía callback sem state ligado ao navegador | State one-time Redis + cookie, expiração, `GETDEL` e bloqueio de replay implementados |
| P0-08 | **Resolvido em 27/08:** rotação refresh não era atômica e expunha tokens em chaves Redis | Compare-and-set Lua, hash, grace concorrente e duração absoluta implementados |
| P0-09 | **Resolvido em 29/08:** upload público aceitava conteúdo arbitrário e sobrescrevia uma chave estável | Limite de 5 MB/dimensões/pixels, detecção real PNG/JPEG, decode/reencode 512×512, MIME fixo, chave imutável, limpeza pós-commit e rate limit implementados; reconciliação periódica de órfãos fica como melhoria operacional |
| P0-10 | **Resolvido em 29/08:** IP era enviado por HTTP a geolocalização externa | Cadastro aceita somente país validado do edge; sem fallback de país e sem transmissão de IP bruto |
| P0-11 | **Resolvido em 29/08:** perfil fabricava `#1`, 2000, rating 1.0 e histórico | Estados honestos, histórico persistido e exclusão de contas sem partidas implementados e validados no PostgreSQL |
| P0-12 | **Resolvido para a alfa em 29/08:** havia referências a rotas inexistentes | Links e sitemap não publicam essas rotas; experiência completa de times segue como P1 |
| P0-13 | **Resolvido em 29/08:** lint falhava com 85 erros e 86 warnings | Lint zero, testes e build de produção executados no workflow dedicado `frontend-quality.yml` |
| P0-14 | **Parcial em 29/08:** termos, privacidade e AUP reais substituíram `#` | Minutas ainda exigem dados do controlador/canais e revisão jurídica antes de usuários reais; política comercial virá com billing |
| P0-15 | **Parcial em 29/08:** ignore defensivo e CI Gitleaks/Dependabot configurados | Primeiro run remoto, revisão do único commit existente, rotação preventiva e tags assinadas ainda são ações do proprietário |
| P0-16 | **Resolvido estruturalmente em 29/08:** licença uniforme era incompatível | Núcleo proprietário, `server/plugins` MIT e avisos de terceiros separados; revisão jurídica final permanece recomendada |

## 9. Riscos P1 — MVP comercial

1. **Paginação incorreta:** ao reduzir tamanho da última página, o backend muda o
   offset (`RankingService.java:65-81,153-169`).
2. **Concorrência de time:** invite links e transferência de owner não usam update
   condicional/lock (`TeamService.java:448-530,680-705`).
3. **Postgres + Mongo:** não há atomicidade/outbox. Migrar notificações para
   Postgres e publicar eventos após commit.
4. **Integrações bloqueantes:** Steam agora possui timeouts; FACEIT ainda precisa
   de timeout/circuit breaker e não deve executar dentro de transação.
5. **Rate limit:** **resolvido em 27/08** para a fronteira atual: Caddy normaliza
   Cloudflare/IP, a aplicação usa `remoteAddr`, Lua aplica TTL atômico e rotas
   sensíveis falham fechado. Falta HA/alerta do Redis.
6. **Contrato do plugin:** `/users`, `/servers` e `/inventory` não são versionados;
   rank/clan tag/fallbacks divergem.
7. **Lifecycle C#:** tarefas fire-and-forget, unload concorrente e `!sync` sem
   cooldown podem causar amplificação e estado obsoleto.
8. **Ausência de tenancy:** todo recurso pago precisa de `ownerUserId` e políticas
   de compartilhamento por time, aplicadas no banco e na API.
9. **Control plane:** sem lease, estado desejado/observado, idempotência, custos ou
   compensação de falhas do provedor.
10. **Billing:** sem inbox de webhook, reconciliação, ledger, invoices e transição
    de entitlement.
11. **Backup/DR:** volumes locais, Redis não persistente, sem restore test ou
    RPO/RTO.
12. **Observabilidade:** sem correlation ID, tracing, SLOs, alertas ou métricas de
    negócio.
13. **APIs públicas do frontend:** o mascaramento de upstream como conteúdo vazio
    foi corrigido em 29/08; ainda faltam timeout explícito, rate limit de borda e
    política uniforme de cache para todas as rotas públicas.
14. **Autorização:** feature gating deve vir de entitlements autoritativos, nunca
    da string `tier` exibida no cliente.
15. **Privacidade:** definir acesso/exportação/exclusão, retenção e visibilidade de
    inventário/telemetria antes de coletar dados reais.

## 10. Qualidade, desempenho e experiência — P2

- 53 de 77 arquivos TSX são Client Components (68,8%); mover home, ranking, mar e
  perfil para Server Components e limitar providers às rotas que usam inventário.
- Deduplicar/transformar 760 MB de assets; remover `unoptimized` e aplicar budgets.
- Centralizar polling em React Query ou SSE; distinguir offline, stale e erro.
- Corrigir contraste, combobox, teclado de cards, focus trap/ARIA de modais e
  `prefers-reduced-motion` para WCAG 2.2 AA.
- Corrigir canonical por rota, título duplicado, OG image, sitemap e estados 404/503.
- Eliminar `any`, código morto, dependências sem uso e arquivos de 40–58 KB.
- **Resolvido em 27/08:** `apiFetch` restringe URL absoluta à origem configurada
  da API; bearer/cookies não são anexados a host arbitrário.
- Criar validação runtime dos DTOs e um contrato de erro consistente.
- Remover defaults hard-coded de tickrate/placar e fornecer telemetria factual.
- Otimizar busca/ranking com paginação server-side, índices `pg_trgm` e projeções.

## 11. Validações executadas

| Verificação | Resultado |
|---|---|
| Backend Maven `verify -Pintegration` | 171 testes unitários + 23 integrações, 0 falhas, 0 erros, 0 ignorados |
| Backend package/startup | Sucesso; aplicação iniciou contra PostgreSQL 16 e Redis 7 do Testcontainers |
| Compose dev/prod `config --quiet` | Sucesso |
| Frontend `npm run build` | Sucesso; 12 páginas estáticas geradas e rotas dinâmicas compiladas |
| Frontend `npm test` | 29/29 aprovados |
| Frontend `npm run lint` | Sucesso; 0 erros e 0 warnings |
| Smoke HTTP de falhas do frontend | Perfil inválido 404; SteamID inválido 400; upstream de inventário indisponível 503 |
| Plugins C# | Revisão estática; sem SDK .NET para build |
| QA visual browser | Runtime integrado indisponível |
| Produção pública | domínio principal respondeu 404; API/www/play não resolveram DNS na data-base |

Na linha de base desta auditoria, os testes Java usavam H2 e Mongo mockado. Esse
ponto foi corrigido em 27/08/2026: H2/Mongo foram removidos e, em 29/08, 23
integrações executam Flyway V1–V10 sobre PostgreSQL 16 e Redis 7 reais via Testcontainers.
Ainda faltam concorrência, contracts, E2E, carga, CS2 dedicado, billing e testes
de restore/chaos.

## 12. Arquitetura-alvo aprovada

```mermaid
flowchart TB
    W[Web público e dashboard Next.js] --> E[Edge / WAF]
    E --> A[API Spring Boot<br/>monólito modular]
    MP[Mercado Pago] -->|webhook assinado| A
    CS[Plugin em servidor Kurage] -->|API plugin/v1 assinada| A
    A --> DB[(PostgreSQL gerenciado<br/>fonte de verdade + outbox)]
    A --> RD[(Redis gerenciado<br/>sessão, locks e live state)]
    A --> R2[Object storage/CDN]
    A --> DH[Adapter DatHost]
    O[Worker no mesmo deploy inicial] --> DB
    O --> DH
```

Módulos internos:

- `identity`: Steam, sessão, usuário, consentimento e account status;
- `competitive`: partida, participantes, ELO, temporada, ranking e disputa;
- `teams`: membros, papéis, time primário e compartilhamento;
- `inventory`: simulador virtual e preferências, isolados por usuário;
- `controlplane`: server template, lease, desired/observed state e usage;
- `billing`: catálogo, customer, subscription, payment inbox e reconciliation;
- `entitlements`: projeção derivada do billing e regras autoritativas;
- `notifications`: tabela Postgres + outbox;
- `audit`: ações administrativas, mudanças financeiras e resultados.

Não extrair microserviços agora. O worker pode ser um processo do mesmo artefato e
usar outbox/locks. Só separar um módulo quando escala, disponibilidade, equipe ou
compliance produzirem uma fronteira mensurável.

### 12.1 Control plane definido

- região inicial: São Paulo;
- infraestrutura: DatHost por API;
- recurso comercial: `ServerLease` temporário, de propriedade do assinante e
  opcionalmente compartilhado com seu time;
- horas: créditos pré-pagos e medidos, sem promessa “ilimitada”;
- estados: `REQUESTED → PROVISIONING → RUNNING → STOPPING → STOPPED → FAILED → TERMINATED`;
- comandos idempotentes com chave, desired/observed state e reconciliação;
- GSLT/RCON criptografados, nunca enviados ao browser; chave distinta por servidor;
- auto-stop por inatividade e registro imutável de minutos/custo;
- o plugin só conversa com `/plugin/v1` usando credencial vinculada ao lease.

### 12.2 Resultado/ELO definido

O servidor operado pela Kurage é a autoridade do resultado. Ao encerrar:

1. plugin envia `matchId`, roster, rounds, placar e nonce assinados;
2. API grava o evento em inbox com idempotency key;
3. valida lease, roster e sequência;
4. persiste resultado e versão do algoritmo em uma transação;
5. atualiza ELO/ranking e publica outbox;
6. preserva evento bruto e audit log para disputa/reprocessamento.

ELO começa em 200 e usa uma única escala 0–1000/níveis 1–10. Fórmula, placements,
decay e anti-smurf devem virar ADR versionado antes da implementação.

## 13. Plano de implementação com critérios de aceite

### Etapa 0 — 0 a 30 dias: confiança e verdade

- concluir P0-01 a P0-16;
- lint, teste e build como CI obrigatório;
- Testcontainers para Postgres/Redis e migration do Mongo — concluído em 27/08/2026;
- privacy notice, termos, AUP e cancelamento revisados;
- páginas não implementadas deixam de ser indexadas;
- nenhuma UI exibe dado inventado;
- backup automático e restore test documentado;
- secrets em manager, secret scan e SBOM por release.

**Saída:** demo privada confiável, sem pagamentos.

### Etapa 1 — 31 a 90 dias: loop competitivo

- UI completa de time e escolha de time primário;
- domínio Match + ingestão assinada + ELO transacional;
- `/plugin/v1` e plugin Core seguro;
- adapter DatHost, lease, start/stop/status e painel mínimo;
- telemetria factual com estado error/stale/offline;
- E2E Steam → time → servidor → partida → ELO.

**Saída:** cinco times design partners concluem partidas instrumentadas toda semana.

### Etapa 2 — 91 a 180 dias: receita

- catálogo único e entitlements backend;
- Mercado Pago customer/subscription/webhook inbox/reconciliation;
- `/settings/billing`, checkout e portal/cancelamento;
- créditos de servidor, ledger, alertas e auto-stop;
- invoices/recibos, falha de cobrança, grace period e suporte;
- métricas de conversão, margem por hora e churn.

**Saída:** primeira assinatura real somente após checklist de produção aprovado.

### Etapa 3 — 181 a 365 dias: maturidade

- temporadas, histórico avançado, disputas e controles de fraude;
- torneios/comunidades após retenção comprovada;
- multi-região apenas com demanda;
- SLO, tracing, capacity planning, DR e testes de carga;
- API/export para MAX com scopes e quotas.

## 14. Decisões de negócio e arquitetura registradas

Para evitar documentação com caminhos concorrentes, estas são as decisões únicas:

| Tema | Decisão |
|---|---|
| Público inicial | jogadores/capitães 18+ de times amadores e semiprofissionais no Brasil |
| Proposta | identidade + operação do time + servidor sob demanda + resultado verificável |
| Backend | monólito modular Spring Boot |
| Fonte transacional | PostgreSQL; MongoDB será removido |
| Pagamento | Mercado Pago, BRL |
| Servidor | DatHost API, São Paulo primeiro, horas pré-pagas |
| Autoridade de partida | servidor Kurage + evento final assinado/idempotente |
| Inventário | simulador virtual gratuito, privado por padrão, sem valor/cash-out |
| Verificação PRO | editorial/manual, jamais comprável |
| Telemetria pública | resultado ranked público; live/raw minimizado e com retenção definida |
| Repositório | canônico privado; case público sanitizado e acesso temporário a recrutadores |
| Licença | núcleo proprietário; plugins MIT por exigência de compatibilidade |

## 15. Gate de produção

O primeiro pagamento só pode ser aceito quando todos os itens abaixo estiverem
verdes:

- zero P0 aberto e lint/test/build/scan aprovados em commit assinado;
- secrets únicos, rotação testada e nenhum banco público;
- restore de backup demonstrado com RPO/RTO definidos;
- E2E de pagamento/webhook/entitlement/cancelamento/reembolso;
- E2E de provisionamento/uso/stop/medição e reconciliação de custo;
- autorização de tenant testada negativamente;
- termos, privacidade, AUP, suporte e incident response publicados;
- inventário e estatísticas sem dados artificiais;
- monitoramento de disponibilidade, erro, latência, fila, margem e fraude;
- asset/trademark review concluído;
- rollback de app e migration praticado.

## 16. Conclusão

O projeto demonstra amplitude full-stack, integração externa, segurança de sessão,
modelagem e cuidado visual — excelente material de portfólio quando apresentado
com honestidade. O principal ganho agora não virá de adicionar mais páginas, mas
de fechar um único ciclo confiável: **time cria sessão, servidor executa partida,
backend valida resultado, ELO muda e o assinante enxerga o valor**.

Esta auditoria passa a ser a referência factual do estado em 20/08/2026. Os docs
01–07 descrevem componentes e intenção, mas devem ser lidos à luz deste documento
até serem atualizados junto com cada implementação.
