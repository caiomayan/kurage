# Subsistema de Inventário CS2

> **Nota de estado (20/08/2026):** o inventário atual é um simulador virtual; o
> plugin apenas baixa/cacheia JSON e não aplica skins no CS2. Consulte a
> [auditoria factual](./08_auditoria_estado_atual.md).

[← Retornar ao Master Node](./00_index.md)

---

## 🎒 Visão Geral

O subsistema de inventário permite a visualização ultra-rápida e rica em detalhes das skins, facas, luvas e adesivos de Counter-Strike 2 pertencentes aos jogadores cadastrados.

---

## 🔄 Fluxo de Dados Atual

```mermaid
sequenceDiagram
    autonumber
    actor Player as Jogador
    participant Web as Frontend Next.js
    participant SpringAPI as Backend Spring (/inventory/:steamId64)
    participant Postgres as PostgreSQL (user_inventories JSONB)
    participant Equipped as Next.js (/api/equipped/v5/:steamId64)
    participant Plugin as Inventory Simulator

    Player->>Web: Acessa inventário ou perfil
    Web->>SpringAPI: GET /inventory/:steamId64
    SpringAPI->>Postgres: SELECT items
    Postgres-->>SpringAPI: Inventário persistido
    SpringAPI-->>Web: JSON real ou erro HTTP
    Web-->>Player: Itens, vazio confirmado ou estado de falha
    Plugin->>Equipped: Solicita loadout equipado
    Equipped->>SpringAPI: GET /inventory/:steamId64
    SpringAPI-->>Equipped: Inventário persistido
    Equipped-->>Plugin: Loadout convertido; falhas mantêm status não-2xx
```

---

## 🗄️ Estrutura de Armazenamento (`user_inventories`)

```sql
CREATE TABLE user_inventories (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    items JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

- Os itens são persistidos como JSONB contendo metadados essenciais (nome do item, skin, desgaste/float, stickers aplicados, raridade e imagem).
- Uma falha de upstream nunca é convertida em inventário vazio com HTTP 200; isso
  evita que indisponibilidade seja interpretada como remoção legítima de itens.
