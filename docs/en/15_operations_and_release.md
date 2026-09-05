# Operations, recovery, and release gate

**Status:** private-alpha web infrastructure is operational; public-release
procedures still require execution. **Last validated:** 31 Aug 2026.

## Launch decision

The first release is a **closed, free technical alpha** with one fixed Retake
server. It is not commercial production: Maré remains unpriced and has no
checkout. Charging starts only after billing, support, and reviewed legal
documents work end to end.

## Initial topology

- managed Next.js frontend;
- Caddy as the API's only public entry point (`80/443`);
- API, PostgreSQL, and Redis on the private Compose network;
- PostgreSQL as source of truth;
- Redis for ephemeral sessions, rate limits, and presence;
- R2 for media; separate CS2 server with an individual credential;
- secrets injected by the environment and never committed.

The production Compose requires essential secrets, exposes no PostgreSQL or
Redis host ports, authenticates Redis, and defines healthchecks. The VPS firewall
must allow only restricted administrative SSH, HTTP/HTTPS, and strictly required
CS2 ports.

## Backup and recovery

Initial alpha targets are **24-hour RPO** and **4-hour RTO**.

1. run a daily `pg_dump --format=custom` inside the `db` container;
2. encrypt and copy it outside the VPS;
3. record SHA-256, date, application version, and highest Flyway version;
4. retain 7 daily, 4 weekly, and 6 monthly backups;
5. enable versioning/lifecycle for the media bucket;
6. do not treat Redis as a backup; sessions may be invalidated after a disaster;
7. monthly, restore into an isolated database and validate migrations, technical
   login, row counts, and inventory reads using the matching application image;
8. never test `pg_restore --clean` against production.

A backup is valid only after a successful restore. Dumps and credentials never
enter Git. Store test results, duration, and checksum in a private operations log.

## Deploy, rollback, and monitoring

Before deploy: use an immutable image tied to a tag/commit; require lint, tests,
build, PostgreSQL/Redis integration, and secret scan; review forward-only
migrations; verify a recent backup; check domains, CORS, cookies, R2, and server
credentials; smoke-test Steam login, profile, inventory, and heartbeat in staging.

After deploy, validate `/actuator/health`, errors, latency, login, honest empty
and failure states, upload, and heartbeat. Roll back to the previous image. A
destructive migration requires its own compatibility plan; reverting a binary
does not revert the schema.

Minimum alerts: API down for 2 minutes; 5xx above 2% for 5 minutes; p95 above one
second for 10 minutes; no valid database backup for 26 hours; disk above 80%;
fixed server heartbeat stale; abnormal 401/403/429 or refresh failures.

Severity is **SEV-1** for data exposure/loss or total outage, **SEV-2** for broken
authentication, inventory, or primary server, and **SEV-3** for secondary
features. Contain first, preserve evidence, recover, notify when required, then
record cause and corrective action.

## Closed-alpha gate

- [x] owner configured domains, DNS/TLS, and web infrastructure accounts (31 Aug 2026);
- [ ] unique secrets are generated and old values rotated;
- [ ] an isolated restore completes within RPO/RTO;
- [ ] controller identity and privacy channel are filled and drafts reviewed;
- [ ] desktop/mobile visual smoke and one real Retake match pass;
- [ ] alerts and incident contact are tested;
- [ ] public flows contain no links to missing functionality;
- [ ] ELO, dynamic 5v5, DM, and billing are explicitly accepted as unavailable.

Paid production additionally requires Mercado Pago sandbox/production,
idempotent webhooks, reconciliation, entitlements, cancellation, refunds,
receipts, support, consumer protections, and end-to-end tests. Maré's visual
presentation does not satisfy this gate.
