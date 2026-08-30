# Authentication, sessions, and trust boundary

> **Status: implemented and validated on 29 August 2026.** Validation covered
> 157 unit tests and 21 integrations with real PostgreSQL/Redis, in addition to
> the previous frontend production build and official Caddy validation.

[← Index](./00_index.md)

## Steam login

1. `GET /auth/steam` sanitizes the internal return path.
2. The API creates 256 random bits, stores `state → returnUrl` for ten minutes in
   Redis, and sends the same state in an HttpOnly/Secure/SameSite=Lax cookie.
3. Steam's signed `return_to` contains only that state.
4. The callback requires a constant-time query/cookie match and consumes Redis
   with `GETDEL`; expiry, replay, and a different browser all fail.
5. Namespace, provider endpoint, mode, `return_to`, identity/claimed ID,
   signature, and OpenID nonce are checked before contacting Steam.
6. `check_authentication` has explicit timeouts and accepts only the exact
   `is_valid:true` line. Parameters and signatures are never logged.

The API no longer creates a fake profile when `STEAM_API_KEY` or Steam Web API is
unavailable. Login fails visibly without persisting artificial identity data.

## Session

- Access JWT: HMAC, `kurage-api` issuer, 15-minute lifetime, browser memory only.
- Refresh token: 256 bits, HttpOnly/Secure/SameSite=Lax cookie, device-bound.
- Redis stores only SHA-256 token hashes in keys and family sets. The successor
  token exists in plaintext only as a grace value for at most ten seconds, which
  lets simultaneous refreshes from separate tabs converge.
- Rotation is a Lua compare-and-set. Concurrent callers receive exactly the
  winner's token during a ten-second grace period.
- A family has an absolute 30-day lifetime; rotation does not extend it.
- Reuse after grace or a device mismatch revokes the family.
- The frontend refreshes only after `401`. A `403` is an authorization denial and
  never mutates a healthy session.
- `apiFetch` accepts relative paths or an absolute URL on the configured API
  origin; this client never sends bearer credentials or cookies elsewhere.
- JWTs identify an account but are not authoritative for privileges. Every
  request verifies UUID + Steam ID and reloads role and `account_status` from
  PostgreSQL. A stale or forged role claim grants no access.
- `SUSPENDED` accounts stop authenticating immediately, cannot rotate refresh
  tokens, and cannot open a new Steam session. A refresh family presented by a
  suspended account is revoked and its cookie is expired.

**Deployment impact:** previously issued tokens used readable Redis keys and are
not compatible with hash-only lookup. The first deployment ends existing
sessions once and users must sign in through Steam again.

## Cookies, CORS, and CSRF

Keep `COOKIE_DOMAIN` empty in production. This creates host-only cookies on the
API domain and prevents sibling subdomains from overwriting authentication
state. CORS accepts only `FRONTEND_URL` and explicit additional origins. Because
`/auth/refresh` and `/auth/logout` rely on cookies, POST requests to them must
also carry an `Origin` from that allowlist.

Other mutations use bearer JWTs and remain protected by backend authentication
and authorization. Rendering an authenticated page never replaces these checks.

## Real client IP and rate limiting

Caddy is the trust boundary. It removes `Forwarded` and `X-Real-IP`, accepts
`CF-Connecting-IP` only from official Cloudflare networks, and sends Spring one
normalized `X-Forwarded-For`. Controllers and interceptors use only Spring's
processed `request.getRemoteAddr()`.

The Redis counter runs `INCR` plus `EXPIRE` atomically in Lua. Public reads remain
fail-open for availability. Authentication, inventory mutation, invitations,
and join requests fail closed when Redis cannot enforce their limit.

Periodically compare the Cloudflare ranges in `Caddyfile` with
`https://www.cloudflare.com/ips-v4` and `https://www.cloudflare.com/ips-v6`.
The origin must remain unreachable directly from the Internet; only Caddy
publishes ports in the production Compose file.

## Remaining limitations

- an operational API/UI for suspension and reactivation (persistent status and
  immediate revocation are already implemented);
- durable audit logs for login, sessions, and privileged actions;
- zero-downtime operational secret rotation;
- a real Steam sandbox/contract check in the release pipeline;
- Redis high availability and fail-closed alerts.
