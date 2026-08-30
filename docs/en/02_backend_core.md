# Backend Core (Spring Boot 4 / Java 21)

> **Status note (20 August 2026):** verify capabilities and risks in the
> [factual audit](./08_current_state_audit.md). Match/ELO, billing, entitlements,
> and server provisioning are not implemented.

[← Return to Master Node](./00_index.md)

---

## 🏗️ Architectural Patterns

The Kurage API is built adhering to **Clean Architecture**, **SOLID** principles, and streamlined **Domain-Driven Design (DDD)**.

```
com.kurage.api
├── config/         # Configurations for CORS, Rate Limiting, S3, Security, and Web
├── controller/     # REST Endpoints (Auth, User, Search, Leaderboard, Team, Server, Inventory)
├── domain/         # JPA Entities (User, PlayerStats, Team, TeamMember, GameServer, etc.)
│   └── enums/      # Domain Enums (NotificationType, etc.)
├── dto/            # Data Transfer Objects (Request and Response records)
│   ├── request/    # Input DTOs validated with Jakarta Validation
│   ├── response/   # Immutable API response DTO records
│   └── redis/      # Serializable cache DTOs
├── exception/      # GlobalExceptionHandler and custom exceptions
├── repository/     # Spring Data JPA Repositories with optimized queries
├── security/       # JWT Authentication Filter, JwtService, and security helpers
├── service/        # Business logic and service orchestration
└── util/           # Hash, Cookie, and pagination helpers
```

---

## 📦 Domain Entities & Relational Modeling

| Entity | Table | Description & Responsibilities |
|---|---|---|
| `User` | `users` | Player digital identity (`kurage_id`, `steam_id64`, `username`, `role`, tactical roles, subscription tier, and verified pro status). |
| `PlayerStats` | `player_stats` | CS2 competitive stats and Kurage ELO rating (`kurage_elo`, K/D, win rate, headshots, total damage). |
| `RankingSnapshot` | `ranking_snapshots` | Daily snapshots of player leaderboard positions to track rating deltas. |
| `Team` | `teams` | Competitive organizations and rosters (`name`, `tag`, `logo_url`, `team_elo`, `owner_id`). |
| `TeamMember` | `team_members` | Roster membership (`team_role`, `team_function`, `management_role`). |
| `TeamRankingSnapshot` | `team_ranking_snapshots` | Daily snapshots of team leaderboard positions. |
| `TeamInvitation` | `team_invitations` | Direct roster invitations sent to players (`target_role`, `status`). |
| `TeamJoinRequest` | `team_join_requests` | Player applications to join a team (`desired_role`, `status`, `reviewed_by`). |
| `TeamInviteLink` | `team_invite_links` | Tokenized shareable invite links with expiry and usage limits. |
| `GameServer` | `game_servers` | Official Kurage CS2 game servers (Retakes, DM, 5v5 Scrim). |
| `ProfileVisit` | `profile_visits` | Profile visitor tracker (exclusive Maré subscriber feature). |
| `UserFaceit` | `users_faceit` | Faceit profile integration and match history snapshots. |
| `UserInventory` | `user_inventories` | CS2 skin inventory cached as JSONB. |
| `User` (private contact) | `users.email`, `users.phone_e164` | Optional channels available exclusively to the account owner; prepared for future verification and delivery. |
| `Notification` | `notifications` | Immutable, generic notification content in PostgreSQL. |
| `NotificationDelivery` | `notification_deliveries` | Per-recipient delivery with individual read state and inbox indexes. |

---

## 🏷️ Domain Enums

| Enum | Package | Values | Purpose |
|---|---|---|---|
| `SubscriptionTier` | `domain` | `FREE`, `MARE` | Single membership and in-code feature gates (`has(feature)`). |
| `ManagementRole` | `domain` | `OWNER`, `ADMIN`, `MEMBER` | Team administrative hierarchy. |
| `TeamRole` | `domain` | `PLAYER`, `SUBSTITUTE`, `COACH`, `ASSISTANT_COACH` | Roster lineup positioning. |
| `UserRole` | `domain` | `USER`, `ADMIN`, `OWNER` | Global platform authority levels. |
| `PlayerFunction` | `domain` | `AWPER`, `OPENER`, `ENTRY_FRAGGER`, `CORINGA`, `SUPORTE`, `LURKER`, `ANCORA`, `CAPITAO`, `COACH` | In-game tactical role declared on profile. |
| `InGameFunction` | `domain` | `AWPER`, `OPENER`, `ENTRY_FRAGGER`, `CORINGA`, `SUPORTE`, `LURKER`, `ANCORA`, `CAPITAO` | Active tactical role within a team lineup. |
| `GameMode` | `domain` | `RETAKE`, `DEATHMATCH`, `COMPETITIVE_5V5`, `DM`, `FIVE_V_FIVE` | Game modes for Kurage CS2 game servers. |
| `JoinRequestStatus` | `domain` | `PENDING`, `ACCEPTED`, `REJECTED` | Status of team join requests. |
| `InvitationStatus` | `domain` | `PENDING`, `ACCEPTED`, `REJECTED` | Status of team direct invites. |
| `NotificationType` | `domain.enums` | Team, system, announcement/suggestion, and friendship types; validated custom string types are also accepted. | Initial inbox taxonomy without coupling future campaigns to migrations. |

---

## 🎯 ELO & Kurage Levels

### 1. Players
- **ELO Range:** `0` to `1000`
- **Levels:** `Level 1` to `Level 10` (no arbitrary rank names; simple level numbers + ELO)
- **Level Formula:** `(elo / 100) + 1` (capped at max 10)
- **Initial ELO:** `200` (Level 3)

| Level | ELO Range |
|---|---|
| Level 1 | 0 – 99 |
| Level 2 | 100 – 199 |
| **Level 3 (Initial)** | **200 – 299** |
| Level 4 | 300 – 399 |
| Level 5 | 400 – 499 |
| Level 6 | 500 – 599 |
| Level 7 | 600 – 699 |
| Level 8 | 700 – 799 |
| Level 9 | 800 – 899 |
| Level 10 | 900 – 1000 |

### 2. Teams
- **ELO Range:** `0` to `1000`
- **Initial ELO:** `200`
- **No Level Concept:** Straight competitive rating number.

---

## 💎 Subscriptions vs Verified Pro Status

To avoid confusion between paid subscribers and professional athletes, Kurage cleanly separates these concerns:

1. **`subscriptionTier` (Enum):** `FREE`, `MARE`
   - *FREE:* Standard platform features.
   - *MARE:* coral identity, Maré badge, profile visitors, advanced statistics and filters, queue priority, and early access. Each experience remains subject to its underlying feature being implemented.

2. **`isVerifiedPro` (Boolean):**
   - Manually verified by Kurage staff for genuine professional CS2 players.
   - Grants the golden shield badge **`✓ PRO`** across leaderboards, profile headers, and hovercards.

---

## 🛡️ Team Management & Invite Flows (GamersClub-Style)

### In-Game Lineup (`TeamRole`)
- `PLAYER` (max 5 active starters)
- `SUBSTITUTE` (max 2 reserves)
- `COACH` (max 1)
- `ASSISTANT_COACH` (max 1)

### Management Roles (`ManagementRole`)
- **`OWNER`**: Full team authority. Can invite, review join requests, modify roles, transfer ownership, and delete team.
- **`ADMIN`**: Manager. Can invite players, generate invite links, and review join requests.
- **`MEMBER`**: Player. Can view internal roster and leave team.

### Entry Flows
1. **Direct Invite:** Owner/Admin invites a player with a specified target role.
2. **Join Request:** Player applies to join a roster with preferred role; Owner/Admin reviews and approves/rejects.
3. **Invite Link:** Tokenized link with max uses and expiry date (up to 3 active links per team).

---

## 🔍 Unified Search System (`/search`)

The Kurage search system provides real-time resolution with database relevance weighting, resilient Redis caching, and support for multi-entity lookups (Players and Teams).

### 1. Quick Search (`GET /search?q={query}&limit=8`)
- **Purpose:** Powers the global Command Palette (`⌘K` / `/`) and fast search dropdowns.
- **Intelligent Top Result:**
  1. *Exact Kurage ID match* (numeric): Highest absolute priority.
  2. *Exact Team Tag match* (e.g. `FUR`): Immediate organizational priority.
  3. *Exact Player Username match*.
  4. *Exact Team Name match*.
  5. *Prefix match* (`starts_with`).
  6. *Relevance / ELO fallback*.
- **Dynamic Highlight Stat:** Player result cards automatically showcase the most impressive metric (K/D ratio if > 0 or ELO / Level).
- **Caching:** Redis cache with 60-second TTL (`cache:search:quick:{query}:{limit}`) with *Fail-Open* tolerance (seamless fallback to PostgreSQL upon Redis errors).

### 2. Full Search (`GET /search/full?q={query}&type=ALL|PLAYERS|TEAMS&page=0&size=20`)
- **Purpose:** Powers the dedicated results page at `/search?q={query}` with tab filtering and pagination.
- **Filters:** `ALL` (both entities paginated simultaneously), `PLAYERS`, or `TEAMS`.
- **SQL Relevance:** Leverages database weighted sorting (`ORDER BY CASE WHEN exact THEN 0 WHEN starts_with THEN 1 ELSE 2 END, ...`).
- **Caching:** Redis cache with 30-second TTL (`cache:search:full:{query}:{type}:{page}:{size}`).

### 3. Player Invite Search (`GET /search/players?q={query}&limit=10`)
- **Purpose:** High-performance lookup for roster invite modals.
- **Response:** Lightweight list of `SearchPlayerResult`.

---

## ⚙️ Core Services & Business Rules (Etapa 3 and 4)

### 1. `UserService` & `UserController`
- **Kurage ID Generation:** `generateKurageId()` generates unique sequential numeric IDs with variable gaps between 7 and 19.
- **Automated Registration:** On Steam login (`getOrCreateUser`), the player is assigned a unique Kurage ID, `role = USER`, `subscriptionTier = FREE`, `isVerifiedPro = false`, and initial CS2 stats with ELO 200 (Level 3).
- **Profile Caching:** 5-minute Redis cache keyed by SteamId64 and KurageId (`cache:profile:steam:{id}`, `cache:profile:kurage:{id}`).
- **Endpoints:**
  - `GET /users/me`: Authenticated player's full profile.
  - `GET /users/kurage/{kurageId}`: Public profile by Kurage ID (records visit if authenticated).
  - `GET /users/{steamId64}`: Public profile by Steam ID 64 (records visit if authenticated).
  - `GET /users/{kurageId}/hovercard`: Lightweight hovercard metrics (K/D, Level, ELO, team, tier) with 5-minute cache.
  - `GET /users/me/visitors`: List of recent profile visitors (exclusive to `MARE` subscribers).
  - `GET /users/search?q={query}`: Fast search by username, SteamId, or Kurage ID.
  - `POST /users/me/avatar`: Avatar upload to Cloudflare R2 (S3).
  - `PUT /users/me/username`: Update username.
  - `PUT /users/me/country`: Update country.
  - `PUT /users/me/steam-sync`: Direct sync with Steam Web API profile.
  - `PUT /users/me/functions`: Update primary and secondary tactical in-game functions.
  - `GET /users/me/teams`: List of player's teams.
  - `GET /users/me/invites`: List of pending team invitations.

### 2. `SubscriptionService` & `PermissionService`
- Single-plan management (`FREE`, `MARE`).
- Automatic expiration checks (`subscriptionExpiresAt`).
- `PermissionService` grants unrestricted access to `ADMIN` and `OWNER`, and validates features for regular players via `SubscriptionService.hasFeature(user, feature)`.

### 3. `ProfileVisitService`
- `recordVisit(visitedUser, visitorUser)`: Asynchronous profile visit recording with Redis temporal rate-limiting (max 1 visit per pair per 1 hour). Self-visits are ignored.
- `getRecentVisitors(user, limit)`: Returns recent visitors with level, ELO, avatar, and timestamp.

### 4. `PlayerStatsService`
- Initialization of competitive metrics with ELO 200.
- Kurage level calculation (`calculateLevel(elo)`): ELO 0-99 (Lvl 1), 100-199 (Lvl 2), 200-299 (Lvl 3), ..., 900-1000 (Lvl 10).

### 5. `RateLimitingService` & `RateLimitInterceptor`
- **Global per IP:** 60 req/min.
- **Authentication Routes (`/auth`):** 10 req/min.
- **Search (`/search`, `/users/search`):** 30 req/min.
- **Hovercards (`/*/hovercard`):** 60 req/min.
- **Invite Link Generation:** 5 req/min.
- **Join Requests:** 10 req/min.

### 6. `SearchService` & `SearchController` (Etapa 4)
- **Quick Search (`GET /search`):** Concurrent relevance-ranked search across users and teams in PostgreSQL with intelligent top result matching and highlight stats. Fail-open 60s Redis cache.
- **Full Search (`GET /search/full`):** Paginated multi-entity search supporting `ALL`, `PLAYERS`, and `TEAMS` filters. 30s Redis cache.
- **Player Invite Search (`GET /search/players`):** High-performance player search dedicated for roster invite modals.

### 7. `RankingService` & `LeaderboardController` (Etapa 5)
- **Player Ranking (`GET /leaderboard/players?page=0&size=20`):** Returns only players with at least one official match, sorted by Kurage ELO with level, K/D, win rate, primary team tag, and daily position delta (`positionDelta = yesterday - today`). Capped at 200 max positions with a 1-hour Redis cache (`cache:ranking:players:page:{page}:size:{size}`).
- **Player Ranking Context (`GET /leaderboard/players/{kurageId}/context`):** Returns position, 24h and 7-day deltas, adjacent peers, and the next target. For zero-match accounts, position and deltas are `null`, with no synthetic adjacent players or history. 5-minute Redis cache.
- **Team Ranking (`GET /leaderboard/teams?page=0&size=10`):** Returns the global team & org leaderboard sorted by Team ELO with member counts and daily position deltas. Capped at 50 max positions with a 1-hour Redis cache (`cache:ranking:teams:page:{page}:size:{size}`).
- **Daily Automated Snapshots (`@Scheduled(cron = "0 0 4 * * *")`):** Automated cron job persisting historical ranking entries into `ranking_snapshots` and `team_ranking_snapshots`, powering performance trajectory calculations without burdening relational queries.

### 8. `TeamService` & `TeamController` (Etapa 6 & 6.5)
- **Management Roles & Permissions (`ManagementRole`):**
  - `OWNER`: Team owner. Can invite, review join requests, promote to ADMIN, demote to MEMBER, transfer ownership (`transferOwnership`), update tactical functions / in-game roles, change avatar, and delete the team.
  - `ADMIN`: Administrator. Can invite players, generate & revoke invite links, approve/reject join requests (`join-requests`), update functions/roles of regular members, and remove regular members (`MEMBER`).
  - `MEMBER`: Regular member. Can view internal data, update their own tactical function, and leave the team.
- **Lineup Constraints & Limits:**
  - `PLAYER`: Maximum 5 active starters.
  - `SUBSTITUTE`: Maximum 2 bench substitutes.
  - `COACH`: Maximum 1 head coach.
  - `ASSISTANT_COACH`: Maximum 1 assistant coach.
- **Automatic In-Game Function Resolution (`teamFunction`):**
  - When joining as `PLAYER` or `SUBSTITUTE`, automatically inherits the player's profile `primaryFunction` (converting `COACH` to `CORINGA` if needed). Coaching roles receive `teamFunction = null`.
- **GamersClub-Style Onboarding & Strict Validity:**
  1. *Direct Invitations (`POST /teams/{id}/invites`):* Strict **24-hour (1 day)** expiration. Expired invites return `410 GONE` and allow re-invitation.
  2. *Join Requests (`POST /teams/{id}/join-requests`):* Players submit join applications specifying desired role. Managers list (`GET /teams/{id}/join-requests`), approve (`POST /teams/join-requests/{id}/approve`), or reject (`POST /teams/join-requests/{id}/reject`). Players track their pending requests via `GET /teams/join-requests/me`.
  3. *Tokenized Invite Links (`POST /teams/{id}/invite-links`):* Shareable links with custom expiration (up to 30 days), max uses, and strict **maximum 3 active links per team** constraint. Supports public validation (`GET /teams/invite-links/{token}`), instant join (`POST /teams/invite-links/{token}/accept`), and revocation (`DELETE /teams/invite-links/{linkId}`).
- **Scheduled Housekeeping & Historical Data Cleanup (Etapa 6.5):**
  - Daily cron job (`@Scheduled(cron = "${team.cleanup.cron:0 0 3 * * *}")` at 03:00 AM) that:
    - Marks pending invitations older than 24 hours as `EXPIRED`.
    - Purges completed records (`ACCEPTED`, `REJECTED`, `EXPIRED`) older than 30 days from `team_invitations` and `team_join_requests`.
    - Purges inactive/expired invite links older than 30 days from `team_invite_links`.
- **Atomic Member Removal & Referential Integrity:**
  - Role-based validation prevents illegal kicks.
  - If the last member departs, team deletion cascades atomically across child entities (`ON DELETE CASCADE`), ensuring no dangling/orphaned rows in relational storage.
- **Integrated PostgreSQL Event Notifications:**
  - Emits notifications for `TEAM_CREATED`, `TEAM_INVITE`, `TEAM_ROLE_UPDATE`, `TEAM_JOIN_REQUEST`, `TEAM_JOIN_APPROVED`, `TEAM_JOIN_REJECTED`, and `TEAM_INVITE_LINK_USED`, while retaining the invitation or request as its own transactional entity.
  - See the [notification model](./10_postgres_notifications.md) for retention, campaigns, and friendship evolution.
- **Redis Caching & Concurrency Safeguards:**
### 9. `GameServerService` & `GameServerController` (Step 7)
- **Public Server Browser (`GET /servers`):**
  - Lists all official Kurage servers (Retakes, DM, 5v5 Scrim) ordered by online status, active player count, and name.
  - Supports dynamic filtering by game mode (`GET /servers?mode=RETAKE|DEATHMATCH|COMPETITIVE_5V5`).
  - Resilient Redis cache with 30s TTL (`cache:servers:all` and `cache:servers:mode:{mode}`).
- **Server Details (`GET /servers/{id}`):**
  - Returns detailed server info (IP, port, current map, players count/capacity) with 30s Redis cache (`cache:servers:id:{id}`).
- **CS2 Server Heartbeat (`POST /servers/{id}/heartbeat`):**
  - Real-time synchronization endpoint consumed by dedicated CS2 server plugins.
  - Secured via `X-Server-Api-Key` HTTP header (validated against the server API secret).
  - Atomically updates `currentMap`, `currentPlayers`, `maxPlayers`, marks `isOnline = true`, and updates `lastHeartbeat = NOW()`.
  - Automatically invalidates related Redis server caches.
- **Automated Offline Detection (`game.server.offline-scan-ms`, 30,000 ms by default):**
  - `markOfflineServers` marks a server as `isOnline = false` after more than 90 seconds without a valid heartbeat and proactively flushes its caches.
  - Responses also evaluate effective liveness at read time, preventing the scheduler interval or an old Redis value from exposing ghost telemetry.

### 10. `InventoryService` & `InventoryController` (Step 7)
- **Inventory Retrieval (`GET /inventory/{steamId64}`):**
  - Public cached JSONB retrieval of CS2 skins and weapon cosmetics for any player.
- **Inventory Updates (`PUT /inventory/me`):**
  - Authenticated endpoint that persists the JSONB inventory and returns PostgreSQL's canonical confirmed representation.
  - The frontend does not use `localStorage` as a source of truth: mutations are displayed only after that confirmation.

---

## 🛡️ Resilience & Horizontal Scaling (Etapa 3.5)

### 1. Distributed ACID `Kurage ID` Generation
- Transactional control table `kurage_id_generator` and PostgreSQL function `generate_next_kurage_id()`.
- Increments with random gaps (7 to 19) happen under database *row-level locking*, replacing JVM-bound `synchronized` locks and enabling multiple API pods to generate IDs concurrently without collision risks.
- Retry logic with `saveAndFlush` and `DataIntegrityViolationException` catching on player onboarding.

### 2. Redis Fault-Tolerance Strategy (Fail-Open)
- **Rate Limiting:** counter and TTL are atomic through Lua. Public reads are
  **fail-open**; authentication, inventory mutations, invitations, and join
  requests are **fail-closed** when Redis cannot enforce the limit.
- **Profile & Hovercard Caches:** If Redis read/write operations fail, services log a warning and fallback directly to PostgreSQL.
- **Cache Invalidation:** Safely wrapped in `try-catch` blocks to prevent cache flush exceptions from breaking database mutations.
- **Stateless Auth:** System relies on cryptographically signed, self-contained JWT tokens; Redis outages will not trigger mass session logouts.
