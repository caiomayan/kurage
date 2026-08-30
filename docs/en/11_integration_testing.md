# Testing strategy with real services

> **Status: validated on 27 August 2026.** H2 was removed from the backend.
> The integration suite uses real PostgreSQL 16 and Redis 7 through Testcontainers.

[← Index](./00_index.md)

## Layers

- `./mvnw test`: fast unit tests. Mocks remain only in this layer to isolate pure
  rules and failure scenarios; production code contains no runtime mocks.
- `./mvnw --batch-mode --no-transfer-progress verify -Pintegration`: also runs
  `*IT` tests against real Docker containers. On Windows PowerShell, use
  `.\mvnw.cmd` instead of `./mvnw`. CI requires this execution.

Integration tests validate Flyway V1–V10, PostgreSQL/JSONB, notifications,
private contacts, server identity/heartbeat, inventory, stickers, keychains,
the music-kit slot, rate limiting with atomic TTL, one-time Steam state, and
concurrent refresh rotation with hash-only storage. They cannot
use H2, in-memory Redis, or simulated services.

PostgreSQL and Redis are singletons for each Failsafe process, keeping mapped
ports stable while Spring reuses its application context. Every test runs in a
rolled-back PostgreSQL transaction, and authenticated Redis is flushed after
each case. Scheduled jobs are disabled only in this suite to prevent concurrent
data mutation.

## Local prerequisite

Start Docker Desktop/Engine and ensure it is accessible before running
`verify -Pintegration`. The suite fails explicitly without Docker, uses isolated
ephemeral databases, and never connects to development Compose or its volumes.

In GitHub Actions, the workflow checks the Docker engine before Maven, enforces
a 20-minute timeout, and uploads Surefire/Failsafe reports on failure.

## Required evolution

Every new migration must add a PostgreSQL integration assertion. Flows changing
PostgreSQL and Redis need at least one real service end-to-end test. External
providers (Steam, FACEIT, R2, payments, and DatHost) need their own sandbox or
contract environments; mocks must not be presented as their coverage.
