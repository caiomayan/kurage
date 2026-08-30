# External Integrations (APIs & CDN)

> **Status note (20 August 2026):** integrations are external dependencies subject
> to terms, outages, and limits. See current contracts and risks in the
> [factual audit](./08_current_state_audit.md).

[← Return to Master Node](./00_index.md)

---

## 🌐 Overview

The **Kurage** ecosystem integrates exclusively with essential Counter-Strike 2 competitive services.

---

## 1. Steam Web API & OpenID

- **OpenID 2.0:** Primary user authentication and account creation mechanism.
  The callback uses one-time Redis state bound to an HttpOnly cookie, validates
  provider/identity/`return_to`, and confirms the signature with a timeout. See
  [Authentication and security](./13_authentication_security.md).
- **Steam Web API:**
  - `ISteamUser/GetPlayerSummaries/v0002/`: Used in `PUT /users/me/steam-sync` to fetch current Steam nickname, high-resolution avatar, and profile status.
  - Requires no manual external portal changes; uses the configured `STEAM_API_KEY`.

---

## 2. Faceit Data API v4

- **Purpose:** Display verified CS2 stats (Level 1-10, ELO, K/D Ratio, Win Rate, and recent matches).
- **Caching:** Public queries are cached in Redis for 5 minutes.
- **Endpoints:**
  - `/players?nickname={name}`: Retrieves `player_id`.
  - `/players/{player_id}/stats/cs2`: Lifetime stats.
  - `/players/{player_id}/history`: Recent matches.

---

## 3. Cloudflare R2 (S3 Storage)

- **Purpose:** Static media storage for user avatar uploads and team logos.
- **Safe pipeline:** The API accepts up to 5 MB, detects the actual format from
  content, allows PNG/JPEG only, enforces 4096 pixels per side and 16 million
  total pixels, decodes the image, and emits a fresh 512×512 PNG. Client-provided
  names, MIME types, and metadata are never reused in the public object. SVG,
  GIF, and invalid files are rejected. The web picker also accepts WebP, but its
  browser-side crop converts it to PNG before upload.
- **Delivery:** Every change creates an immutable, unpredictable key under
  `avatars/{userId}/{uuid}.png` or `team-logos/{teamId}/{uuid}.png`, with
  `Content-Type: image/png`, `Content-Disposition: inline`, and one-year
  immutable public caching. The previous object is deleted only after its new
  URL is persisted; persistence failures delete the newly uploaded object.
- **Abuse protection:** Authenticated uploads have a dedicated limit of 10
  operations per user/minute in Redis and fail closed when the limiter is
  unavailable.
- **Protocol:** Standard S3 compatible (`AWS SDK v2`).
- **Endpoint:** Use `https://<ACCOUNT_ID>.r2.cloudflarestorage.com`, without the
  bucket name in the URL.
- **Public URL:** In production, attach a dedicated public bucket domain, such as
  `assets.caiomayan.com`. `CLOUDFLARE_R2_PUBLIC_URL` must use that domain,
  never the web application domain. The frontend must receive the same origin in
  `NEXT_PUBLIC_R2_PUBLIC_URL` so its CSP permits the image.
- **Operations:** Do not apply a blanket age-based expiry to these prefixes: it
  would also delete the currently referenced image. A future reconciliation job
  should compare bucket keys with active PostgreSQL URLs to collect rare orphans
  left by commit failures or an unavailable R2 cleanup call.
