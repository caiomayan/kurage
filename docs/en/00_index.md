# Kurage ecosystem — documentation index

[Índice em português](../pt/00_index.md)

## Status and maintenance rule

Kurage is a **technical alpha**. No public production or validated billing existed
on the 20 August 2026 baseline. The
[current-state audit](./08_current_state_audit.md) is the factual reference for
implemented, incomplete, and planned behavior. Documents 01–07 describe components
and intent; discrepancies must be corrected in the same pull request as code.

Every new document must explicitly identify:

- **implemented:** exists in code and was validated;
- **prototype:** partially exists but cannot support a commercial promise;
- **planned:** does not exist yet;
- date/commit of the last validation.

## System overview

Kurage is a proprietary SaaS in development for competitive identity, team
operations, on-demand private servers, and verifiable Counter-Strike 2 results.
The current backend is a Spring Boot modular monolith used by a Next.js frontend
and CounterStrikeSharp plugins.

```mermaid
flowchart TD
    A[00 — Index] --> B[08 — Factual audit]
    A --> C[09 — Product and market]
    A --> K[10 — PostgreSQL notifications]
    A --> L[11 — Integration testing]
    A --> M[12 — Maré membership]
    A --> N[13 — Authentication and security]
    A --> O[14 — Consistency and observability]
    A --> P[15 — Operations and release]
    A --> Q[16 — Legal readiness]
    A --> R[17 — OCI and Vercel deployment]
    A --> D[01 — Architecture]
    A --> E[02 — Backend]
    A --> F[03 — Frontend]
    A --> G[04 — Inventory]
    A --> H[05 — Servers]
    A --> I[06 — Integrations]
    A --> J[07 — Design system]
```

## Documents

1. [Architecture and infrastructure](./01_architecture_infrastructure.md)
2. [Backend core](./02_backend_core.md)
3. [Frontend core](./03_frontend_core.md)
4. [CS2 inventory subsystem](./04_cs2_inventory_subsystem.md)
5. [CS2 game-server subsystem](./05_game_servers_subsystem.md)
6. [External integrations](./06_external_integrations.md)
7. [Design system](./07_frontend_design_system.md)
8. [Complete current-state audit](./08_current_state_audit.md)
9. [Product, market, monetization, and portfolio](./09_product_market.md)
10. [PostgreSQL notifications](./10_postgres_notifications.md)
11. [Testing strategy with real services](./11_integration_testing.md)
12. [Maré membership](./12_mare_membership.md)
13. [Authentication, sessions, and trust boundary](./13_authentication_security.md)
14. [Transactional consistency and observability](./14_transactional_consistency_observability.md)
15. [Operations, recovery, and release gate](./15_operations_and_release.md)
16. [Legal and privacy readiness](./16_legal_readiness.md)
17. [OCI and Vercel alpha deployment](./17_oci_vercel_alpha_deployment.md)
18. [Branches, pull requests, and CI/CD](./18_branches_prs_ci.md)

## Repository policies

- [Main README](../../README.en.md)
- [Proprietary license](../../LICENSE)
- [Plugin MIT license](../../server/plugins/LICENSE)
- [Third-party notices](../../THIRD_PARTY_NOTICES.md)
- [Security policy](../../SECURITY.md)
- [Contribution policy](../../CONTRIBUTING.md)

The `kurage.caiomayan.com` and `api.caiomayan.com` domains are the prepared alpha
contract, but only become operational production after the first deployment and
the gates documented in section 17.
