# Kurage

Proprietary SaaS for competitive identity, team operations, on-demand private
servers and verifiable results in Counter-Strike 2. Spring Boot 4 / Java 21
modular monolith, Next.js 16 frontend, CounterStrikeSharp plugins, PostgreSQL 16
and Redis 7.

**The project is a technical alpha.** A web-only alpha is deployed; there is no
public CS2 server, no match/ELO engine and no billing. Never describe it as a
launched or paid product.

## Source of truth

`docs/pt` is canonical; `docs/en` is a translation kept in sync. Two documents
outrank the rest and outrank the code when they disagree about readiness:

- `docs/pt/08_auditoria_estado_atual.md` — what is actually implemented,
  prototype, or planned.
- `docs/pt/19_plano_evolucao_identidade_rating_perfil.md` — the plan currently
  being executed, including a continuity register that must be updated when a
  delivery ends.

Documents 01–07 describe components and intent, not guaranteed behavior. Every
document states implemented / prototype / planned plus a validation date.

## Invariants — do not break these

1. **No fabricated data.** Absence, unavailability and calibration must never
   become `0`, `#1`, ELO 2000, rating 1.00 or an empty inventory. The states
   `live`, `stale`, `offline`, `unavailable` and `not collected` stay distinct.
2. **Calibration gate.** Ranking requires five valid processed matches.
   Accounts under screening are not classified and never receive Level S.
3. **No mocks in the production path.** Mocks belong only to unit tests that
   isolate pure rules.
4. **PostgreSQL is the single transactional source.** Redis is cache, ephemeral
   presence, debounce and session — never domain truth. Cache invalidation and
   heartbeat publication happen only after commit.
5. **Fail-open reads, fail-closed mutations.** Public reads stay available when
   Redis is down; authentication, inventory mutations, invites, join requests
   and uploads must fail closed.
6. **Authorization is server-side and re-read per request.** The JWT carries
   identity, not privileges; role and `account_status` are re-read from
   PostgreSQL. A denial is `403`, never `5xx` — the frontend refreshes only on
   `401`, and a 5xx turns an entitlement boundary into a fake outage.
7. **Concurrency never returns false success.** Conflicts answer `409`, expired
   state answers `410`.
8. **Role and subscription are independent.** `USER/ADMIN/OWNER` versus
   `FREE/MARE`. `isVerifiedPro` is editorial and never sold. Mare never changes
   damage, economy, equipment or match outcome.
9. **No checkout exists.** No button may simulate a completed purchase.

## Testing

- `cd backend && ./mvnw test` — unit tests (173 at last run).
- `cd backend && ./mvnw verify -Pintegration` — requires a running Docker
  Engine; runs against real PostgreSQL 16 and Redis 7 via Testcontainers (71 at
  last run). H2, in-memory Redis and simulated services are forbidden. Every new
  migration needs an integration assertion.
- `cd frontend && npm run lint && npm test && npm run build` (48 tests at last
  run). Lint must end with zero errors **and** zero warnings.

Report what actually ran. If Docker is unavailable, say the integration suite did
not run rather than substituting mocks.

## Workflow

Work branches off `dev`, goes to `dev` by pull request (squash), and only
reaches `main` by merge commit. Only `main` publishes. Required checks: `quality`,
`test`, `gitleaks`. Documentation affected by a change is updated in the same
pull request. See `docs/pt/18_branches_prs_ci.md`.

Do not add hooks, services or dependencies on a tool's recommendation alone
(`docs/pt/19` §9).

## Design

Sea Glass accent `#A9C8C0`; Mare coral `#FF4D6D`; Owner amber `#E9B95F`; Admin
turquoise `#29D3B0`. Forbidden: decorative gradients, gradient text, glowing
borders, any purple or violet in dark theme, and bento boxes of empty icons.
Numeric tables require `font-variant-numeric: tabular-nums`. Details in
`docs/pt/07_frontend_design_system.md`.

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships. It also carries the documented invariants above as concept nodes linked to the code they govern, so a design question usually surfaces the governing rule before the implementation.

Rules:
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, rebuild with `python tools/graphify/rebuild.py`, then `graphify export html` and `graphify export wiki`. Do **not** run `graphify update .`: it rescans the whole repository, pulls `docs/en` back in as a duplicate of every `docs/pt` concept, and drops the curated labels and the invariants layer.
- The invariants above exist in the graph as concept nodes defined in `tools/graphify/rules.py`, linked to the code they govern. If you rename or move a symbol they point at, the rebuild fails loudly — update `rules.py` in the same pull request.
- The graph shows what the code *does*, never what is *ready*. Readiness comes from `docs/pt/08` and `docs/pt/19` — a well-connected ranking neighborhood does not mean the competitive loop exists.
- `graphify-out/` is gitignored. Rebuilding is cheap and needs no API key.
