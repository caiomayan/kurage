# Transactional consistency and observability

**Status:** implemented in the backend on 27 August 2026. Alerting, dashboards,
and distributed tracing remain planned.

## Source of truth and concurrency

PostgreSQL is the transactional source of truth. Migration `V9`:

- normalizes legacy inventories to the `{items, version}` envelope and enforces
  it with a database `CHECK`;
- adds optimistic versioning to inventory, preventing two transactions from
  silently writing over the same version;
- permits only one pending direct invitation and one pending join request per
  user/team, including across multiple API instances;
- validates invite-link counters and repairs legacy rows before enabling the
  constraints.

Invitations, requests, capacity limits, links, and administrative changes use
row locks. Consuming the final link use no longer relies on an unprotected
`read → increment → save` sequence. Inventory concurrency and integrity conflicts
return `409 Conflict` instead of false success.

Expired states use a dedicated exception that allows `EXPIRED` or link
deactivation to commit before returning `410 Gone`. All other failures keep the
normal full-transaction rollback behavior.

## PostgreSQL and Redis

Redis remains a cache, ephemeral-presence, debounce, and session store—not the
source of truth for persistent domains. Profile/team invalidation and heartbeat
player publication run only after commit. A rolled-back profile visit releases
its Redis debounce key. Team reads made inside a mutation bypass cache so they
cannot consume or publish pre-commit state.

## Available telemetry

- Every response receives `X-Request-ID`. An inbound ID is preserved only when
  it matches a bounded safe format; MDC is always cleared after the request.
- Requests slower than `SLOW_REQUEST_THRESHOLD_MS` (1,000 ms by default) emit a
  structured warning. Per-request `INFO` logging was removed.
- Unexpected exceptions are logged with stack trace and request ID through the
  application logger, without `printStackTrace` or internal response leakage.
- Spring Actuator exposes `health`, `info`, `metrics`, and `prometheus`. Only
  health is public; the other endpoints remain restricted to `ADMIN`/`OWNER`.
- Every metric carries `application=kurage-api`.

## Next operational layer

Public production still requires deployed Prometheus/Grafana, SLO alerts,
central log retention, tested backup/restore, and runbooks. This document claims
available instrumentation, not an already staffed 24/7 operation.
