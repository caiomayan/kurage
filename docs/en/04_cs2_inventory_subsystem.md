# CS2 Inventory Subsystem

> **Status note (20 August 2026):** the current inventory is a virtual simulator;
> the plugin only downloads/caches JSON and does not apply skins in CS2. See the
> [factual audit](./08_current_state_audit.md).

[← Return to Master Node](./00_index.md)

---

## 🎒 Overview

The CS2 inventory subsystem enables rich, high-performance display of knives, gloves, weapon skins, and stickers belonging to registered players.

---

## 🔄 Current Data Flow

```mermaid
sequenceDiagram
    autonumber
    actor Player as Player
    participant Web as Next.js Frontend
    participant SpringAPI as Spring Backend (/inventory/:steamId64)
    participant Postgres as PostgreSQL (user_inventories JSONB)
    participant Equipped as Next.js (/api/equipped/v5/:steamId64)
    participant Plugin as Inventory Simulator

    Player->>Web: Opens inventory or profile
    Web->>SpringAPI: GET /inventory/:steamId64
    SpringAPI->>Postgres: SELECT items
    Postgres-->>SpringAPI: Persisted inventory
    SpringAPI-->>Web: Real JSON or HTTP error
    Web-->>Player: Items, confirmed empty state, or failure state
    Plugin->>Equipped: Requests equipped loadout
    Equipped->>SpringAPI: GET /inventory/:steamId64
    SpringAPI-->>Equipped: Persisted inventory
    Equipped-->>Plugin: Converted loadout; failures retain non-2xx status
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

An upstream failure is never converted into an empty inventory with HTTP 200.
This prevents temporary unavailability from being interpreted as a legitimate
loadout removal.
