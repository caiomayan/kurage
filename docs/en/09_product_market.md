# Kurage — professional product and market documentation

**Version:** 1.0  
**Date:** 20 August 2026  
**Initial market:** Brazil, pt-BR, BRL, users aged 18 or over  
**Status:** approved validation strategy; product in technical alpha

## 1. Business summary

Kurage will be the competitive operating system for amateur and semi-professional
Counter-Strike 2 teams. Instead of offering only a statistics page or a hosting
panel, it connects the entire session:

> **Steam → team → private server → instrumented match → ELO and a shareable
> competitive passport.**

The initial buyer is a captain who currently coordinates roster, server, result,
and history across separate tools. The user is also the player who wants a trusted
identity and visible progression. Value appears when a real match becomes a
verifiable record without manual work.

### Positioning statement

For captains and players on Brazilian competitive CS2 teams, Kurage is a
competitive identity and operations platform that starts private servers on
demand, records matches, and builds an auditable history/ELO. Unlike a generic
host or imported-statistics site, Kurage controls the session workflow and ties
every result to its team and players.

### Short promise

**Play with your team. Record the result. Build your competitive history.**

## 2. Problem and opportunity

An emerging team often combines login/identity, chat, roster spreadsheets, a game
host, score screenshots, and external platforms. This causes four problems:

1. **fragmentation:** player identity is disconnected from team operations;
2. **friction:** preparing a server and session requires knowledge and manual work;
3. **low trust:** results and rankings without provenance lose value;
4. **short memory:** team progress is scattered or disappears.

The opportunity is not to replace mature competitive networks. It is to provide a
first-party workflow for practices, scrims, and small communities, with excellent
Portuguese UX, local servers, and a passport that grows with every Kurage match.

## 3. Target customer

### Primary ICP

A captain or manager, aged 18–34, on a Brazilian amateur/semi-professional team
with five to ten members, playing weekly, organizing scrims/practice, and willing
to pay to reduce setup work and preserve progression.

Jobs to be done:

- “put my team on a reliable server without administering Linux”;
- “record lineup, score, and history automatically”;
- “show how my team and players are improving”;
- “share a professional competitive profile.”

### Secondary user

A competitive player joins through an invitation, signs in with Steam, builds a
passport, follows history, and later brings Kurage to another team.

### Out of initial scope

- users under 18;
- mass public matchmaking;
- proprietary anti-cheat;
- betting, paid cases, cash-out, or real-value assets;
- esports news/editorial;
- generic VPS rental or a panel for third-party operators;
- worldwide operation and multiple currencies.

## 4. Initial product

### 4.1 Activation loop

1. Steam login.
2. Automatic minimum passport.
3. User creates or joins a team.
4. Captain buys credits and starts a São Paulo server.
5. Team connects through a link/Steam connect.
6. Plugin sends signed roster and final result.
7. Kurage records the match, updates ELO, and creates a shareable report.
8. Team returns to compare progress and start another session.

**Activation event:** first valid match result within 24 hours of team creation.

### 4.2 MVP surfaces

- marketing: home, product, pricing, trust, status, legal documents;
- public: player, team, ranking, match, search;
- dashboard: overview, team, server, matches, credits, billing, settings;
- server: provision, start, stop, password, map, players, summarized logs, usage;
- support: FAQ, contact, incidents, data export/deletion.

### 4.3 Truth rule

Every surface distinguishes:

- `live`: recently received from the server;
- `stale`: last known data outside its expected window;
- `offline`: confirmed termination or timeout;
- `unavailable`: dependency failure;
- `not collected`: no data has ever existed.

None may silently become zero, `#1`, ELO 2000, or an empty inventory.

## 5. One commercial model

There is one platform-wide monthly membership tied to the player's passport.
The backend returns concrete entitlements; the frontend never grants access from
visual decoration alone.

| Plan | Monthly price | Launch entitlements |
|---|---:|---|
| Free | R$0 | passport, ranking, teams, public servers, and virtual inventory |
| Maré | To be set before checkout | global coral theme, Maré badge, profile visitors, extended history and analytics, ranking filters, priority in official queues, and early access |

Commercial rules:

- Mercado Pago billing in BRL;
- the permanent free tier replaces a trial;
- no annual billing at launch;
- priority never removes an active player or changes rules, damage, economy, or match outcomes;
- benefits cover the whole platform and are not tied only to Retake;
- only an idempotent webhook confirms payment, never the browser redirect;
- downgrade preserves data but reduces access/action to new plan limits;
- grace and cancellation follow clear terms and provider state;
- `isVerifiedPro` is manual/editorial and independent of Maré membership;
- the inventory simulator is free and has no economic value.

Price, taxes, gateway fees, and support cost must be validated before checkout is
enabled. A catalog entry in code does not authorize billing.

## 6. Unit economics and goals

For every lease, the ledger records customer-billed minutes, provider cost,
payment fee, promotional credit, and margin. No credit is deducted client-side.

```text
MRR = sum of active recurring subscriptions
Usage revenue = credits consumed during the period
SaaS margin = (MRR - fees - variable support) / MRR
Server margin = (usage revenue - provider - fees - losses) / usage revenue
Simplified LTV = monthly ARPA × gross margin / monthly churn
CAC payback = CAC / monthly contribution per account
```

Initial targets, not current results:

| Metric | Validation target |
|---|---:|
| Teams reaching activation | ≥ 60% of design-partner-created teams |
| Week-4 retention of activated teams | ≥ 40% |
| Active-team-to-paid conversion | ≥ 10% |
| Subscription gross margin | ≥ 80% |
| Credit gross margin | ≥ 50% |
| Provisioning failure | < 2% of requests |
| Match processed without intervention | ≥ 99% |
| CAC payback | < 3 months once a repeatable channel exists |

**North star:** weekly active teams completing at least one instrumented match.

Guardrails: incidents per 100 sessions, result disputes, hourly cost, payment
failure, chargeback, auto-stop rate, and LGPD requests.

## 7. Market and competition

Existing products validate demand in four categories:

| Category | Examples | What they validate | Kurage response |
|---|---|---|---|
| Competitive network/matchmaking | FACEIT, Gamers Club | identity, ranking, anti-cheat and community matter | do not compete in matchmaking/anti-cheat; serve team sessions |
| Data/editorial | HLTV | public profiles and history create recurring attention | publish Kurage-originated data with explicit provenance |
| Analytics | Leetify, SCOPE.GG | players seek diagnosis and progress | connect simple analysis to first-party sessions |
| Hosting | DatHost and CS2 hosts | users pay for simple game servers | use DatHost invisibly and sell the workflow |

Product references: [FACEIT](https://www.faceit.com/),
[Gamers Club](https://gamersclub.com.br/), [Leetify](https://leetify.com/),
[SCOPE.GG](https://scope.gg/), [HLTV](https://www.hltv.org/), and
[DatHost for Platforms](https://dathost.com/for-platforms).

### Defensible differentiation

Visual design is not a moat. Defensibility grows through:

1. first-party instrumented match history;
2. a player/team/session/progression graph;
3. a captain workflow that reduces time to server;
4. result reliability, audit, and disputes;
5. integrations and the switching cost of team history;
6. local community and shareable reports.

Kurage must not copy competitors' visual identities, layouts, content, or
proprietary metrics. Functional inspiration must become original design and code.

## 8. Go-to-market

### Design-partner stage

- recruit five teams and about twenty captains/managers through CS2 communities,
  university circuits, and scrim groups;
- observe onboarding live;
- offer controlled credits in exchange for weekly sessions and interviews;
- measure time to first match, failure points, and work still done outside Kurage;
- publish only authorized testimonials and aggregate metrics.

### Acquisition after product-market signal

1. **Invitation loop:** a captain invites four players; every profile exposes
   Kurage and can carry the product to other teams.
2. **Shareable report:** indexable match/team/player pages with contextual CTAs.
3. **Technical content:** scrim, team-management, and progression guides—not news.
4. **Communities:** small partnerships with university leagues and organizers.
5. **Founder portfolio:** the public case proves engineering and execution without
   turning the proprietary repository into free distribution.

Do not buy traffic before design-partner activation and retention. Lead with the
user outcome, not a technology list.

## 9. Brand narrative

- **Category:** competitive team operations.
- **Tone:** technical, calm, precise, without exaggerated claims.
- **Personality:** ocean depth, clarity, coordinated movement.
- **Proof:** every number points to a match and verifiable source.
- **Avoid:** “ultimate platform,” “unbeatable anti-cheat,” “official ELO,” “128
  tick server,” or “production” without evidence.

Home message:

```text
Your team joins. The match happens. The progress stays.

On-demand private servers, verifiable results, and a competitive passport for
every CS2 player and team.
```

Primary CTA: **Create my team with Steam**.  
Secondary CTA: **View a Kurage match**.

## 10. Metrics and instrumentation

Minimum events, without unnecessary data:

- `steam_login_completed`;
- `team_created`, `team_member_joined`;
- `server_credit_purchased`;
- `server_provision_requested`, `server_running`, `server_stopped`;
- `match_started`, `match_result_accepted`, `match_result_disputed`;
- `report_shared`;
- `subscription_started`, `payment_failed`, `subscription_cancelled`.

Every event has a schema version, server-side timestamp, pseudonymizable
user/team/lease IDs, and correlation ID. Product analytics must not repurpose
operational logs as an analytics database. Consent and retention belong in the
LGPD data inventory.

## 11. Trust, security, and compliance

### LGPD

Before external beta:

- identify controller, processors, and subprocessors;
- document purpose/legal basis for Steam ID, IP, telemetry, and payment data;
- minimize live data and define retention/deletion;
- support access, correction, applicable portability, consent withdrawal, deletion;
- record international transfers and provider agreements;
- maintain a data-subject channel and incident process;
- separate analytics, operations, and marketing;
- stay 18+ until child-protection requirements are implemented.

Sources: [LGPD statutory text](https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709compilado.htm)
and [ANPD data-subject rights](https://www.gov.br/anpd/pt-br/assuntos/titular-de-dados-1/direito-dos-titulares).

### Required commercial documents

- Terms of Service;
- Privacy Policy;
- cancellation/refund policy;
- server Acceptable Use Policy;
- support policy and status/SLA only when promised;
- processor agreements and incident response.

These require Brazilian legal review and must match checkout behavior. This product
document is not legal advice.

## 12. Intellectual property, INPI, and Git

### One publication strategy

1. keep the canonical monorepo public as Kurage's technical portfolio;
2. create attributable tags, releases, and immutable archives;
3. use only original screenshots and synthetic data in public demos;
4. keep the core under the repository's proprietary license and make it explicit
   that visibility is not an open-source license;
5. never publish `.env`, dumps, provider IDs, credentials, sensitive anti-fraud
   logic, or assets without a clear chain of title.

The reason is practical: public code enables direct portfolio review, but it can
also be viewed and forked through GitHub functionality. The license defines
permitted uses; secret hygiene, asset provenance, and attributable history protect
operations and strengthen authorship evidence. See [GitHub's licensing guidance](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/licensing-a-repository)
and [GitHub Terms](https://docs.github.com/en/site-policy/github-terms/github-terms-of-service).

### Applied licensing

- root, backend, frontend, documentation, and original design: Kurage proprietary
  license, all rights reserved, with limited evaluation permission;
- `server/plugins`: MIT, because CounterStrikeSharp's official exception permits
  derivative plugins under MIT;
- dependencies and assets: their own terms, recorded in notices/SBOM.

Source: [official CounterStrikeSharp license](https://github.com/roflmuffin/CounterStrikeSharp/blob/main/LICENSE).

### Software registration

For the first filing:

1. remove secrets/artifacts and complete the asset-rights audit;
2. freeze `1.0.0-registration` with attributable commit and signed tag;
3. create a deterministic archive of proprietary source, excluding dependencies,
   `.env`, data, binaries, and separately handled MIT plugins;
4. generate SHA-256 and preserve the exact archive, hash, algorithm, manifest,
   SBOM, date, owner, and authorship chain in at least two locations;
5. complete e-Software/GRU/Truth Declaration with an accepted digital certificate
   and preserve the package for the protection period;
6. repeat for materially new versions according to the IP strategy;
7. search and file the “Kurage” trademark separately—software registration does
   not grant exclusivity over the name.

INPI explains that software registration uses a digital hash and that the owner
retains the technical documentation. See the [software registration guide](https://www.gov.br/inpi/pt-br/servicos/programas-de-computador/guia-basico)
and [trademark guide](https://www.gov.br/inpi/pt-br/servicos/marcas/guia-basico/guia-basico).

## 13. Market roadmap

| Period | Business outcome | Product delivery |
|---|---|---|
| Days 0–30 | trust for a demo | P0, legal, CI, honest data, restore |
| Days 31–90 | five active teams | team + DatHost + match + ELO E2E |
| Days 91–180 | first revenue | Mercado Pago + entitlement + credits + billing UI |
| Days 181–365 | retention and repeatable channel | seasons, fraud, community, MAX API, usage-led scale |

A stage ends on its audit exit criterion, not merely on a date.

## 14. Business risks and mitigation

| Risk | Chosen mitigation |
|---|---|
| Server cost exceeds revenue | prepaid credits, auto-stop, ledger, ≥50% target margin |
| Too few recurring teams | design partners before paid media; match-based north star |
| Contested result | signed event, audit log, dispute, versioned reprocessing |
| Valve/FACEIT/host dependency | adapters, cache, explicit degradation, reviewed terms |
| Abuse/smurf/fraud | 18+, server authority, limits, review, audit trail |
| Third-party brand/assets | INPI search and asset register before publication |
| Accidental exposure in the public repository | proprietary license, secret review, and assets with provenance |
| Premature complexity | modular monolith, one country, one currency, one provider per domain |

## 15. Portfolio presentation

The public case study should tell a verifiable story:

1. the captain's real problem;
2. research and niche decision;
3. as-built and target architecture;
4. hard decisions around sessions, idempotent ELO, control plane, and billing;
5. original screenshots, a synthetic-data demo, and diagrams;
6. exact test, lint, build, and scan results for the demonstrated commit, without
   reusing historical counts;
7. discovered incidents/risks and prioritization;
8. design-partner results when available;
9. links to the bilingual documentation and public repository.

For hiring, honesty increases technical value: “private web alpha operating with
domains and CI/CD, but still without a public CS2 server, billing, or a validated
restore” is more professional than presenting it as an already-launched SaaS.

## 16. Success criterion

Kurage leaves the prototype stage when a new captain can, without founder help:

1. sign in with Steam;
2. create a team;
3. pay through Mercado Pago;
4. purchase and consume credit;
5. start and stop a server;
6. complete a match;
7. see correct ELO/history;
8. cancel/delete/export according to policy;
9. receive support and status during failure.

Until this passes E2E, the correct external label is **technical alpha / private
beta**, never production SaaS.
