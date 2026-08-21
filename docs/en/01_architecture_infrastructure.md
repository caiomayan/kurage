# Architecture & Infrastructure

> **Status note (20 August 2026):** this document mixes implementation and intent.
> Use the [factual audit](./08_current_state_audit.md) as the current reference;
> the backend is a modular monolith and public production is not validated.

[← Return to Master Node](./00_index.md)

---

## 🏛️ Topology Overview

The **Kurage** ecosystem employs a decoupled, cloud-native architecture distributed across Vercel, Linux VPS (Oracle Cloud/AWS), and Cloudflare.

```mermaid
flowchart TB
    Client((Player / Browser))
    CS2Server[CS2 Servers (DM / Retake / 5v5)]
    
    subgraph Vercel [Vercel Edge]
        NextJS[Next.js 16 App Router]
        Proxy[cstrike.app Inventory Proxy]
    end
    
    subgraph CloudHost [Host Cloud / VPS Linux]
        direction TB
        Caddy[Caddy Reverse Proxy (HTTPS)]
        Spring[Spring Boot 4 / Java 21 API]
        Postgres[(PostgreSQL 16 + Flyway)]
        Redis[(Redis 7 - Cache & Sessions)]
        Mongo[(MongoDB 6 - Notifications)]
        
        Caddy --> Spring
        Spring <--> Postgres
        Spring <--> Redis
        Spring <--> Mongo
    end
    
    subgraph Cloudflare [Cloudflare R2]
        R2[(Bucket kurage-bucket)]
    end
    
    Client <-->|HTTPS kurage.caiomayan.com| NextJS
    NextJS <-->|HTTPS apikurage.caiomayan.com| Caddy
    CS2Server -->|POST /servers/:id/heartbeat| Caddy
    Spring <-->|S3 SDK| R2
    Proxy -.->|Proxy cstrike.app| Client
```

---

## 🚀 Hosting Environments

### 1. Frontend (Vercel)
- **Domain:** `kurage.caiomayan.com`
- **Stack:** Next.js 16 (App Router), TypeScript Strict, Tailwind CSS / CSS custom properties.
- **Role:** Server-Side Rendering (SSR) for SEO and OpenGraph metadata, Server Components for lightning-fast initial load, and interactive Client Components (Command Palette `⌘K`, Hovercards, Server Browser).

### 2. Backend API (Linux VPS / Docker Compose)
- **Domain:** `apikurage.caiomayan.com`
- **Stack:** Java 21 (Virtual Threads enabled), Spring Boot 4.1.
- **Caddy:** Automatic Let's Encrypt TLS termination and reverse proxy to port `8080`.
- **PostgreSQL 16:** Relational database managed with Flyway migrations (`V1__kurage_init.sql`).
- **Redis 7:** High-throughput cache (leaderboards, hovercards, quick search, server heartbeats) and rotating refresh token sessions.
- **MongoDB 6:** Document store for user notifications (team invites, join requests, system notices).

### 3. Cloudflare R2 (Object Storage)
- **Bucket:** `kurage-bucket`
- **Protocol:** S3-compatible API (AWS SDK v2 for Java).
- **Role:** CDN delivery for custom player avatars and team crests.
