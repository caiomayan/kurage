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
- **Delivery:** Cloudflare CDN with automated timestamp cache-busting (`?v={timestamp}`).
- **Protocol:** Standard S3 compatible (`AWS SDK v2`).
