# Core do Backend (Spring Boot 4 / Java 21)

> **Nota de estado (20/08/2026):** confirme capacidades e riscos na
> [auditoria factual](./08_auditoria_estado_atual.md). Match/ELO, billing,
> entitlements e provisionamento ainda não estão implementados.

[← Retornar ao Master Node](./00_index.md)

---

## 🏗️ Padrões Arquiteturais

A API Kurage é estruturada sob os princípios de **Clean Architecture**, **SOLID** e **Domain-Driven Design (DDD)** simplificado.

```
com.kurage.api
├── config/         # Configurações de CORS, Rate Limit, S3, Segurança e Web
├── controller/     # Endpoints REST (Auth, User, Search, Leaderboard, Team, Server, Inventory)
├── domain/         # Entidades JPA (User, PlayerStats, Team, TeamMember, GameServer, etc.)
│   └── enums/      # Enums de domínio (NotificationType, etc.)
├── dto/            # Data Transfer Objects (Request e Response records)
│   ├── request/    # DTOs de entrada validados com Jakarta Validation
│   ├── response/   # DTOs imutáveis de resposta da API
│   └── redis/      # DTOs serializáveis para cache
├── exception/      # GlobalExceptionHandler e exceptions customizadas
├── repository/     # Spring Data JPA Repositories com queries otimizadas
├── security/       # JWT Authentication Filter, JwtService e utilitários
├── service/        # Regras de negócio e orquestração de serviços
└── util/           # Utilitários de Hash, Cookies e paginação
```

---

## 📦 Entidades de Domínio & Modelagem Relacional

| Entidade | Tabela | Descrição & Responsabilidade |
|---|---|---|
| `User` | `users` | Identidade do jogador (`kurage_id`, `steam_id64`, `username`, `role`, funções in-game, tier de assinatura e verificação pro). |
| `PlayerStats` | `player_stats` | Estatísticas competitivas de CS2 e pontuação de ELO Kurage (`kurage_elo`, K/D, vitórias, headshots, dano total). |
| `RankingSnapshot` | `ranking_snapshots` | Histórico diário de posições do ranking de jogadores para cálculo de deltas (subidas/descidas). |
| `Team` | `teams` | Organizações/times competitivos (`name`, `tag`, `logo_url`, `team_elo`, `owner_id`). |
| `TeamMember` | `team_members` | Relação N:N de membros com o time (`team_role`, `team_function`, `management_role`). |
| `TeamRankingSnapshot` | `team_ranking_snapshots` | Histórico diário de posições do ranking de times. |
| `TeamInvitation` | `team_invitations` | Convites diretos enviados de um time para um jogador (`target_role`, `status`). |
| `TeamJoinRequest` | `team_join_requests` | Pedidos de entrada submetidos por jogadores para um time (`desired_role`, `status`, `reviewed_by`). |
| `TeamInviteLink` | `team_invite_links` | Links tokenizados compartilháveis de convite com validade e limite de usos. |
| `GameServer` | `game_servers` | Servidores oficiais de CS2 da plataforma Kurage (Retakes, DM, 5v5 Scrim). |
| `ProfileVisit` | `profile_visits` | Registro de visualizações de perfil (recurso exclusivo do plano PLUS+). |
| `UserFaceit` | `users_faceit` | Snapshot e integração de dados e partidas do perfil Faceit. |
| `UserInventory` | `user_inventories` | Cache de inventário e skins de CS2 do jogador (JSONB). |
| `Notification` | `notifications` (MongoDB) | Notificações assíncronas do usuário (convites, join requests, avisos de sistema). |

---

## 🏷️ Enums de Domínio

| Enum | Localização | Valores | Finalidade |
|---|---|---|---|
| `SubscriptionTier` | `domain` | `FREE`, `PLUS`, `PRO`, `MAX` | Tiers de assinatura e controle de permissões em código (`has(feature)`). |
| `ManagementRole` | `domain` | `OWNER`, `ADMIN`, `MEMBER` | Níveis de permissão administrativa dentro de um time. |
| `TeamRole` | `domain` | `PLAYER`, `SUBSTITUTE`, `COACH`, `ASSISTANT_COACH` | Funções de alocação de lineup dentro de um time. |
| `UserRole` | `domain` | `USER`, `ADMIN`, `OWNER` | Níveis de autoridade global na plataforma Kurage. |
| `PlayerFunction` | `domain` | `AWPER`, `OPENER`, `ENTRY_FRAGGER`, `CORINGA`, `SUPORTE`, `LURKER`, `ANCORA`, `CAPITAO`, `COACH` | Funções táticas declaradas no perfil do jogador. |
| `InGameFunction` | `domain` | `AWPER`, `OPENER`, `ENTRY_FRAGGER`, `CORINGA`, `SUPORTE`, `LURKER`, `ANCORA`, `CAPITAO` | Função tática ativa dentro de uma lineup de time. |
| `GameMode` | `domain` | `RETAKE`, `DEATHMATCH`, `COMPETITIVE_5V5`, `DM`, `FIVE_V_FIVE` | Modos de jogo dos servidores de CS2 da Kurage. |
| `JoinRequestStatus` | `domain` | `PENDING`, `ACCEPTED`, `REJECTED` | Status de solicitações de entrada em times. |
| `InvitationStatus` | `domain` | `PENDING`, `ACCEPTED`, `REJECTED` | Status de convites diretos enviados a jogadores. |
| `NotificationType` | `domain.enums` | `SYSTEM`, `TEAM_INVITE`, `TEAM_ROLE_UPDATE`, `TEAM_CREATED`, `TEAM_JOIN_REQUEST`, `TEAM_JOIN_APPROVED`, `TEAM_JOIN_REJECTED`, `TEAM_INVITE_LINK_USED` | Tipos de eventos disparados na central de notificações. |

---

## 🎯 Modelo de ELO e Níveis Kurage

### 1. Jogadores
- **Range de ELO:** `0` a `1000`
- **Levels:** `Level 1` a `Level 10` (sem nomes descritivos de tiers; apenas número + ELO)
- **Cálculo de Level:** `(elo / 100) + 1` (limitado ao máx de 10)
- **ELO Inicial:** `200` (Level 3)

| Level | Range de ELO |
|---|---|
| Level 1 | 0 – 99 |
| Level 2 | 100 – 199 |
| **Level 3 (Inicial)** | **200 – 299** |
| Level 4 | 300 – 399 |
| Level 5 | 400 – 499 |
| Level 6 | 500 – 599 |
| Level 7 | 600 – 699 |
| Level 8 | 700 – 799 |
| Level 9 | 800 – 899 |
| Level 10 | 900 – 1000 |

### 2. Times
- **Range de ELO:** `0` a `1000`
- **ELO Inicial:** `200`
- **Sem conceito de level**, apenas pontuação de ELO competitiva direta.

---

## 💎 Assinaturas e Status de Jogador Profissional

Para evitar ambiguidade entre jogadores que pagam assinatura e jogadores profissionais verificados, o Kurage desacopla esses conceitos em duas dimensões independentes:

1. **`subscriptionTier` (Enum):** `FREE`, `PLUS`, `PRO`, `MAX`
   - *FREE:* Recursos padrão da plataforma.
   - *PLUS:* Histórico de visitantes do perfil, badge PLUS no perfil.
   - *PRO:* Estatísticas avançadas, filtros avançados de ranking, badge PRO em texto sutil (Sea Glass).
   - *MAX:* Destaque de perfil na home, prioridade em servidores CS2, badge MAX.

2. **`isVerifiedPro` (Boolean):**
   - Atribuído manualmente pela Kurage a atletas profissionais de CS2 verificados.
   - Concede visualmente a badge escudo dourado **`✓ PRO`** (distinta da badge textual dos assinantes).

---

## 🛡️ Gestão de Times & Convites (GamersClub-Style)

### Funções In-Game (`TeamRole`)
- `PLAYER` (máx. 5 ativos)
- `SUBSTITUTE` (máx. 2 reservas)
- `COACH` (máx. 1)
- `ASSISTANT_COACH` (máx. 1)

### Papéis de Gestão (`ManagementRole`)
- **`OWNER`**: Dono do time. Pode convidar, aprovar/recusar pedidos, alterar cargos, transferir posse e excluir o time.
- **`ADMIN`**: Administrador. Pode convidar jogadores, criar links de convite e revisar join requests.
- **`MEMBER`**: Membro jogador. Pode apenas visualizar dados internos e sair do time.

### Fluxos de Entrada
1. **Convite Direto:** Admin/Owner convida jogador informando a função alvo.
2. **Pedido de Entrada (Join Request):** Jogador solicita vaga no time informando sua função de preferência; Admin/Owner aprova ou rejeita.
3. **Link de Convite (Tokenizado):** Link compartilhável com limite de usos e validade (máximo 3 links ativos simultâneos por time).

---

## 🔍 Sistema de Busca Unificado (`/search`)

O sistema de busca da Kurage fornece resolução instantânea com ranqueamento por relevância, cache resiliente e suporte a pesquisas multi-entidade (Jogadores e Times).

### 1. Quick Search (`GET /search?q={query}&limit=8`)
- **Finalidade:** Alimentar a Command Palette global (`⌘K` / `/`) e dropdowns rápidos de busca.
- **Top Result Inteligente:**
  1. *Match exato por Kurage ID* (numérico): Prioridade máxima absoluta.
  2. *Match exato por Tag de Time* (ex: `FUR`): Prioridade imediata de organização.
  3. *Match exato por Username* de Jogador.
  4. *Match exato por Nome* de Time.
  5. *Match por Prefixo* (`starts_with`).
  6. *Fallback por Maior Relevância / ELO*.
- **Highlight Stat Dinâmico:** Cada card de jogador destaca automaticamente a métrica mais expressiva (K/D se > 0 ou ELO / Nível).
- **Cache:** Redis com TTL de 60 segundos (`cache:search:quick:{query}:{limit}`) e resiliência *Fail-Open* (fallback para PostgreSQL se Redis estiver indisponível).

### 2. Full Search (`GET /search/full?q={query}&type=ALL|PLAYERS|TEAMS&page=0&size=20`)
- **Finalidade:** Alimentar a página dedicada de resultados `/search?q={query}` com abas e paginação completa.
- **Filtros:** `ALL` (ambos paginados simultaneamente), `PLAYERS` ou `TEAMS`.
- **Relevância SQL:** Utiliza ordenação ponderada no banco (`ORDER BY CASE WHEN exact THEN 0 WHEN starts_with THEN 1 ELSE 2 END, ...`).
- **Cache:** Redis com TTL de 30 segundos (`cache:search:full:{query}:{type}:{page}:{size}`).

### 3. Busca de Jogadores para Convites (`GET /search/players?q={query}&limit=10`)
- **Finalidade:** Modal de convite de membros para times e elencos.
- **Retorno:** Lista leve de `SearchPlayerResult`.

---

## ⚙️ Serviços Core & Regras de Negócio (Etapa 3 e 4)

### 1. `UserService` & `UserController`
- **Geração de Kurage ID:** `generateKurageId()` gera IDs numéricos únicos crescentes com gaps variáveis entre 7 e 19.
- **Cadastro Automático:** Ao logar via Steam (`getOrCreateUser`), o usuário recebe um Kurage ID único, status `role = USER`, `subscriptionTier = FREE`, `isVerifiedPro = false` e suas estatísticas de CS2 são inicializadas com ELO 200 (Level 3).
- **Cache de Perfis:** Cache Redis de 5 minutos por SteamId64 e KurageId (`cache:profile:steam:{id}`, `cache:profile:kurage:{id}`).
- **Endpoints:**
  - `GET /users/me`: Perfil completo do usuário autenticado.
  - `GET /users/kurage/{kurageId}`: Perfil público por Kurage ID (registra visita se autenticado).
  - `GET /users/{steamId64}`: Perfil público por Steam ID 64 (registra visita se autenticado).
  - `GET /users/{kurageId}/hovercard`: Dados leves de hovercard (K/D, Level, ELO, time, tier) com cache de 5 minutos.
  - `GET /users/me/visitors`: Lista de visitantes recentes do perfil (exclusivo para assinantes `PLUS` ou superior).
  - `GET /users/search?q={query}`: Busca rápida por username, SteamId ou Kurage ID.
  - `POST /users/me/avatar`: Upload de avatar para o Cloudflare R2 (S3).
  - `PUT /users/me/username`: Atualização de apelido.
  - `PUT /users/me/country`: Atualização de país.
  - `PUT /users/me/steam-sync`: Sincronização direta de dados com a API da Steam.
  - `PUT /users/me/functions`: Atualização de funções in-game primária e secundária.
  - `GET /users/me/teams`: Lista de times em que o usuário joga.
  - `GET /users/me/invites`: Lista de convites de time pendentes.

### 2. `SubscriptionService` & `PermissionService`
- Controle desacoplado de tiers (`FREE`, `PLUS`, `PRO`, `MAX`).
- Verificação automática de expiração (`subscriptionExpiresAt`).
- `PermissionService` concede acesso irrestrito para `ADMIN` e `OWNER` e valida features para usuários comuns via `SubscriptionService.hasFeature(user, feature)`.

### 3. `ProfileVisitService`
- `recordVisit(visitedUser, visitorUser)`: Gravação assíncrona de visitas a perfis com rate-limiting temporal no Redis (máximo 1 registro por par a cada 1 hora). Auto-visitas são ignoradas.
- `getRecentVisitors(user, limit)`: Retorna os últimos visitantes com level, ELO, avatar e data da visita.

### 4. `PlayerStatsService`
- Inicialização de métricas competitivas com ELO 200.
- Cálculo de nível Kurage (`calculateLevel(elo)`): ELO 0-99 (Lvl 1), 100-199 (Lvl 2), 200-299 (Lvl 3), ..., 900-1000 (Lvl 10).

### 5. `RateLimitingService` & `RateLimitInterceptor`
- **Global por IP:** 60 req/min.
- **Rotas de Autenticação (`/auth`):** 10 req/min.
- **Busca (`/search`, `/users/search`):** 30 req/min.
- **Hovercards (`/*/hovercard`):** 60 req/min.
- **Geração de Links de Convite:** 5 req/min.
- **Solicitações de Entrada (Join Requests):** 10 req/min.

### 6. `SearchService` & `SearchController` (Etapa 4)
- **Quick Search (`GET /search`):** Executa buscas simultâneas e ordenadas por relevância no PostgreSQL com resolução do Top Result inteligente e highlight stat (K/D / ELO). Cache Redis 60s resiliente a falhas.
- **Full Search (`GET /search/full`):** Suporta busca paginada por entidades unificadas (`ALL`, `PLAYERS`, `TEAMS`) para a página de resultados `/search`. Cache Redis 30s.
- **Player Invite Search (`GET /search/players`):** Endpoint de alta performance para busca e convite de jogadores para times.

### 7. `RankingService` & `LeaderboardController` (Etapa 5)
- **Player Ranking (`GET /leaderboard/players?page=0&size=20`):** Retorna o ranking global de jogadores ordenado por Kurage ELO com cálculo de nível, K/D, win rate, tag do time e delta de posição diário (`positionDelta = ontem - hoje`). Limitado a 200 posições máximas com cache Redis de 1 hora (`cache:ranking:players:page:{page}:size:{size}`).
- **Player Ranking Context (`GET /leaderboard/players/{kurageId}/context`):** Retorna o contexto competitivo do jogador com posição atual, deltas de 24h e 7 dias, lista de ~5 jogadores adjacentes e identificação de quem é o próximo jogador a ser ultrapassado (`nextPlayerToPass`). Cache Redis de 5 minutos.
- **Team Ranking (`GET /leaderboard/teams?page=0&size=10`):** Retorna o ranking global de organizações e times ordenado por Team ELO com contagem de membros e delta diário de posições. Limitado a 50 posições máximas com cache Redis de 1 hora (`cache:ranking:teams:page:{page}:size:{size}`).
- **Snapshots Diários Automáticos (`@Scheduled(cron = "0 0 4 * * *")`):** Rotina diária que persiste os snapshots históricos em `ranking_snapshots` e `team_ranking_snapshots`, garantindo histórico fiel de desempenho temporal e alimentando os deltas sem degradação do banco.

### 8. `TeamService` & `TeamController` (Etapa 6 & 6.5)
- **Gestão de Cargos e Permissões (`ManagementRole`):**
  - `OWNER`: Dono do time. Pode convidar, aprovar/recusar solicitações, promover a ADMIN, rebaixar a MEMBER, transferir posse (`transferOwnership`), alterar funções/cargos in-game, alterar avatar e excluir o time.
  - `ADMIN`: Administrador. Pode convidar jogadores, criar e revogar links de convite, aprovar/rejeitar pedidos de entrada (`join-requests`), alterar funções e cargos in-game de membros comuns, e expulsar membros comuns (`MEMBER`).
  - `MEMBER`: Membro regular. Pode apenas visualizar dados internos, alterar sua própria função tática in-game e sair do time.
- **Validação de Limites de Lineup:**
  - `PLAYER`: Máximo de 5 titulares ativos.
  - `SUBSTITUTE`: Máximo de 2 reservas.
  - `COACH`: Máximo de 1 treinador.
  - `ASSISTANT_COACH`: Máximo de 1 assistente técnico.
- **Resolução Automática de Função In-Game (`teamFunction`):**
  - Ao ingressar como `PLAYER` ou `SUBSTITUTE`, clona automaticamente a `primaryFunction` do perfil do jogador (convertendo `COACH` para `CORINGA` se necessário). Cargos de comissão técnica recebem `teamFunction = null`.
- **Fluxos de Entrada GamersClub-Style & Validade Estrita:**
  1. *Convite Direto (`POST /teams/{id}/invites`):* Validade estrita de **24 horas (1 dia)**. Se expirado, retorna `410 GONE` e permite o reenvio de novo convite pelo time.
  2. *Pedidos de Entrada (`POST /teams/{id}/join-requests`):* Jogadores solicitam vaga informando a função desejada. Gestores listam (`GET /teams/{id}/join-requests`), aprovam (`POST /teams/join-requests/{id}/approve`) ou recusam (`POST /teams/join-requests/{id}/reject`). Jogadores consultam suas solicitações pendentes em `GET /teams/join-requests/me`.
  3. *Links de Convite Tokenizados (`POST /teams/{id}/invite-links`):* Links com validade customizável (até 30 dias), limite de usos e restrição rígida de **máximo 3 links ativos simultâneos por time**. Suporta validação pública (`GET /teams/invite-links/{token}`), entrada instantânea (`POST /teams/invite-links/{token}/accept`) e revogação (`DELETE /teams/invite-links/{linkId}`).
- **Housekeeping & Limpeza Periódica de Histórico (Etapa 6.5):**
  - Job agendado diário (`@Scheduled(cron = "${team.cleanup.cron:0 0 3 * * *}")` às 03:00 AM) que:
    - Marca convites pendentes com mais de 24h como `EXPIRED`.
    - Purga do banco de dados registros terminados (`ACCEPTED`, `REJECTED`, `EXPIRED`) com mais de 30 dias em `TeamInvitation` e `TeamJoinRequest`.
    - Purga links de convite inativos ou expirados há mais de 30 dias (`TeamInviteLink`).
- **Atomicidade em Remoções & Integridade Referencial:**
  - A remoção de membros valida papéis hierárquicos.
  - Se o último membro sair do time, a exclusão do time é executada com efeito cascata atômico (`ON DELETE CASCADE` garantido no banco), blindando a base de dados contra registros órfãos ou inconsistências em módulos futuros.
- **Eventos & Notificações MongoDB Integradas:**
  - Disparo automático de notificações para `TEAM_CREATED`, `TEAM_INVITE`, `TEAM_ROLE_UPDATE`, `TEAM_JOIN_REQUEST`, `TEAM_JOIN_APPROVED`, `TEAM_JOIN_REJECTED` e `TEAM_INVITE_LINK_USED`.
- **Cache Redis & Concorrência:**
### 9. `GameServerService` & `GameServerController` (Etapa 7)
- **Browser Público de Servidores (`GET /servers`):**
  - Lista todos os servidores oficiais Kurage (Retakes, DM, 5v5 Scrim) ordenados por status online, contagem de jogadores e nome.
  - Suporta filtro dinâmico por modo de jogo (`GET /servers?mode=RETAKE|DEATHMATCH|COMPETITIVE_5V5`).
  - Cache Redis resiliente com TTL de 30s (`cache:servers:all` e `cache:servers:mode:{mode}`).
- **Detalhes de Servidor (`GET /servers/{id}`):**
  - Retorna dados detalhados do servidor (IP, porta, mapa atual, players online/máximo) com cache Redis de 30s (`cache:servers:id:{id}`).
- **Heartbeat de Servidores CS2 (`POST /servers/{id}/heartbeat`):**
  - Endpoint de sincronização em tempo real consumido por plugins CS2 dedicados nos servidores de jogo.
  - Autenticação e proteção rigorosa via cabeçalho HTTP `X-Server-Api-Key` (validado contra a chave segura configurada).
  - Atualiza atomicamente `currentMap`, `currentPlayers`, `maxPlayers`, marca `isOnline = true` e atualiza `lastHeartbeat = NOW()`.
  - Invalida automaticamente os caches de servidores no Redis.
- **Detecção de Servidores Offline (`@Scheduled(fixedRate = 120000)`):**
  - Rotina agendada executada a cada 2 minutos (`markOfflineServers`) que detecta e marca como `isOnline = false` qualquer servidor que não enviar heartbeat há mais de 2 minutos, invalidando os caches de forma proativa.

### 10. `InventoryService` & `InventoryController` (Etapa 7)
- **Consulta de Inventário (`GET /inventory/{steamId64}`):**
  - Retorna o JSONB de itens e cosméticos de CS2 do jogador de forma pública e otimizada.
- **Atualização de Inventário (`PUT /inventory/me`):**
  - Endpoint autenticado permitindo a persistência e sincronização de skins e inventário do usuário logado.

---

## 🛡️ Resiliência & Escala Horizontal (Etapa 3.5)

### 1. Geração ACID Distribuída de `Kurage ID`
- Tabela de controle transacional `kurage_id_generator` e function PostgreSQL `generate_next_kurage_id()`.
- O incremento com gap randômico (7 a 19) ocorre com *row-level locking* no banco de dados, eliminando lock local na JVM (`synchronized`) e permitindo que múltiplos pods da API gerem IDs concorrentemente sem risco de colisão.
- Lógica de *retry* com `saveAndFlush` e captura de `DataIntegrityViolationException` no cadastro de novos jogadores.

### 2. Estratégia de Tolerância a Falhas do Redis (Fail-Open)
- **Rate Limiting:** Em caso de indisponibilidade ou timeout do Redis, o `RateLimitingService` aplica a estratégia **Fail-Open** (retorna `true`), registrando aviso em log e garantindo que a API permaneça acessível para usuários legítimos.
- **Cache de Perfis e Hovercards:** Se o Redis falhar durante a leitura ou escrita, os serviços engolem o erro e consultam diretamente o PostgreSQL (fallback transparente).
- **Invalidação de Cache:** Protegida por `try-catch`, impedindo que falhas transitórias no Redis quebrem mutações de dados no banco relacional.
- **Stateless Auth:** O sistema baseia-se em tokens JWT auto-contidos e assinados; quedas no Redis não provocam logouts em massa.

