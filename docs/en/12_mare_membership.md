# Maré membership

[Versão em português](../pt/12_plano_mare.md)

**Status:** product contract and entitlements implemented; billing planned.  
**Last validated:** 31 August 2026.

## Proposition

Maré is Kurage's only monthly membership. It belongs to the player's passport
and spans every current or future mode, server, and platform feature. It is not a
Retake-only plan and provides no competitive advantage.

## Visual identity

- commercial name: **Maré**;
- color: **Living Coral `#FF4D6D`**;
- the frontend replaces the default Sea Glass accent with Living Coral while the
  authenticated player has an active Maré membership;
- green remains semantic success and semantic red remains error/danger, keeping
  the interface understandable;
- the Maré badge appears on profiles, hovercards, and the account menu;
- `isVerifiedPro` and the golden professional badge are independent and cannot
  be purchased.

## Defined benefits

1. Maré identity: Living Coral theme and exclusive badge;
2. expanded insight: profile visitors, history, advanced statistics, and filters
   as their respective experiences become available;
3. global priority: priority in official server queues without removing active
   players;
4. early access to new modes and experiences.

Visit tracking already exists in PostgreSQL, and the current API lets a
Maré/Admin/Owner account read up to 20 visitors to its **own** profile. The visual
panel and authorized reads for another profile remain planned in the
[evolution plan](../pt/19_plano_evolucao_identidade_rating_perfil.md); callers
without the entitlement must never receive identities or timestamps from the list.

Maré never changes damage, economy, equipment, skill matchmaking, or match
outcomes. Future benefits must preserve this rule.

## Current technical contract

The backend accepts only `FREE` and `MARE`. Maré permissions are `MARE_BADGE`,
`PROFILE_VISITORS`, `ADVANCED_STATS`, `RANKING_FILTERS`, `SERVER_PRIORITY`,
`PROFILE_HIGHLIGHT`, and `EARLY_ACCESS`. An expired membership is exposed as
`FREE`, even before reconciliation persists the change.

Migration `V8__single_mare_subscription_tier.sql` converts legacy `PLUS`, `PRO`,
and `MAX` records to `MARE` and constrains new PostgreSQL values.

## Billing boundary

Price, checkout, idempotent webhooks, renewal, cancellation, refunds,
reconciliation, and a subscriber portal do not exist yet. No button may simulate
a completed purchase. The gateway will be integrated separately, and only the
backend may activate or expire membership.
