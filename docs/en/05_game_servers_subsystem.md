# CS2 Game Servers Subsystem

> **Status on 25 August 2026:** one local `RETAKE/FIXED` server is the operational
> profile. Fixed DM and on-demand 5v5 Mix are designed but not provisioned.

[← Return to index](./00_index.md)

## Selected topology

| Service | Identity | Lifecycle | Current state |
|---|---|---|---|
| Retake | `RETAKE/FIXED` | 24/7 | active local profile |
| Deathmatch | `DEATHMATCH/FIXED` | 24/7 | future |
| 5v5 Mix | `COMPETITIVE_5V5/EPHEMERAL` | one match | future |

Every CS2 process owns one `ServerId` and one plugin profile. A Retake process
does not switch to DM or Mix. Kurage.Core exposes no `!mode`/`css_mode` command:
the fixed identity is shown when the player joins.

## Identity and heartbeat contract

PostgreSQL is authoritative for `gameMode` and `serverKind`. The plugin repeats
both values in heartbeats only to detect a misconfigured process. A mismatch
returns `409 Conflict`; a heartbeat can never reclassify the database record.
Each `ServerId` owns a distinct credential. The plugin sends its secret in
`X-Server-Api-Key`; the API hashes it with SHA-256 and performs a constant-time
comparison against that row. Another server's key returns `401`; a missing hash
fails closed with `503`. Plaintext credentials are never persisted.
For local development, Retake #1's stable ID receives only the credential hash
even when full endpoint reconciliation is disabled.

```json
{
  "currentMap": "de_mirage",
  "currentPlayers": 7,
  "maxPlayers": 10,
  "ctScore": 4,
  "trScore": 3,
  "gameMode": "RETAKE",
  "serverKind": "FIXED",
  "players": []
}
```

Map, players, capacity, online status, and `lastHeartbeat` are observed state.
The enriched live roster remains ephemeral in Redis.

## Persistence

`game_servers` stores identity and telemetry:

```sql
game_servers (
  id UUID PRIMARY KEY,
  name VARCHAR(100) UNIQUE NOT NULL,
  hostname VARCHAR(255) NOT NULL,
  port INT NOT NULL,
  game_mode VARCHAR(20) NOT NULL,
  server_kind VARCHAR(20) NOT NULL,
  current_map VARCHAR(50),
  current_players INT NOT NULL,
  max_players INT NOT NULL,
  ct_score INT NOT NULL,
  tr_score INT NOT NULL,
  is_online BOOLEAN NOT NULL,
  last_heartbeat TIMESTAMPTZ,
  api_key_hash VARCHAR(64),
  UNIQUE (hostname, port)
)
```

A heartbeat remains valid for 90 seconds. After that window, the API, Redis
cache, and frontend treat the instance as offline and discard volatile roster,
occupancy, and score data. Persistence is scanned every 30 seconds; the client
enforces the same expiry even while the API is temporarily unavailable.

## Web experience

The home page and `/mar` query the real server collection and group only `FIXED`
instances into Retake and Deathmatch. Each group supports multiple servers. A
missing mode is shown as operational unavailability without inventing an ID,
address, map, players, or score. Server details open at
`/mar?server=<uuid>` and reuse the existing telemetry views.
Steam players who have not linked a Kurage account remain visible under the
name reported by the game, but receive no artificial Kurage ID, level, ELO,
profile link, or hovercard.

## Future Mix provisioning

The web API must not manipulate containers directly. A control plane should:

1. create an idempotent allocation containing both lobbies and the map;
2. reserve CPU, memory, and a port through a VPS node agent;
3. create a `COMPETITIVE_5V5/EPHEMERAL` row and instance credential;
4. start a container with MatchZy, Inventory Simulator, and Kurage.Core, injecting
   `KURAGE_SERVER_ID`, `KURAGE_GAME_MODE`, and `KURAGE_SERVER_KIND`;
5. wait for readiness and heartbeat before returning the address;
6. drain and terminate the instance after completion or lease expiry, releasing
   resources even after failures.

Capacity must be based on reserved resources rather than container count. The
design requires OS headroom, transactional allocation locks, timeouts,
reconciliation, and orphan cleanup. The per-instance credential boundary is now
ready; the future provisioner must generate, inject, and rotate an independent
secret for every lease.

## Current Retake profile

The executable profile and local checklist live at
[`server/profiles/retake`](../../server/profiles/retake). RetakesPlugin remains
upstream and owns rounds, teams, spawns, and bomb flow. `Kurage.RetakeWeapons`, a
mandatory `Kurage.Core` extension, preserves the spawn primary, opens native B
buying for five seconds, limits purchases to pistols/rifles/AWP, persists the
pistol preference, and controls a per-team AWP queue ranked by previous-round
performance. There is no RetakesPlugin fork or competing generic allocator.

Core 2.4 publishes the `kurage:core` contract through one shared assembly. The
extension inherits identity, mode, server name, and the fixed tag; API secrets are
not part of that contract. New global extension values can be published through
`ExtensionSettings` without duplicating JSON between plugins.

The native menu only filters broad weapon categories. Because AWP, Scout, and
auto-snipers share the sniper category, Scout and auto-snipers may still appear
client-side, but the extension rejects and refunds those purchases. Hiding them
individually would require a client-side Panorama modification.
