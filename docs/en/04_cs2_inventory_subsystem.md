# CS2 Inventory Subsystem

> **Status note (20 August 2026):** the current inventory is a virtual simulator;
> the plugin only downloads/caches JSON and does not apply skins in CS2. See the
> [factual audit](./08_current_state_audit.md).

[← Return to Master Node](./00_index.md)

---

## 🎒 Overview

The CS2 inventory subsystem enables rich, high-performance display of knives, gloves, weapon skins, and stickers belonging to registered players.

---

## 🔄 Data Flow with cstrike.app

```mermaid
sequenceDiagram
    autonumber
    actor Player as Player
    participant NextRoute as Next.js API Proxy (/api/cstrike/inventory/:steamId64)
    participant CStrikeAPI as cstrike.app API
    participant SpringAPI as Spring Backend (/inventory/:steamId64)
    participant Postgres as PostgreSQL (user_inventories JSONB)

    Player->>NextRoute: Accesses Profile Inventory Tab
    NextRoute->>CStrikeAPI: Requests inventory for SteamID64
    alt cstrike.app responds 200 OK
        CStrikeAPI-->>NextRoute: Returns item list with metadata
        NextRoute->>SpringAPI: PUT /inventory/:steamId64 (Persists cache)
        SpringAPI->>Postgres: UPSERT in user_inventories
        NextRoute-->>Player: Renders skins grid with float, rarity, stickers
    else cstrike.app unavailable / rate-limited
        NextRoute->>SpringAPI: GET /inventory/:steamId64
        SpringAPI->>Postgres: SELECT items FROM user_inventories
        Postgres-->>SpringAPI: Returns cached items
        SpringAPI-->>NextRoute: Returns last stored snapshot
        NextRoute-->>Player: Renders fallback cache with indicator
    end
```

---

## 🗄️ Storage Schema (`user_inventories`)

```sql
CREATE TABLE user_inventories (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    items JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```
