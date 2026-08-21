# Arquitetura e Infraestrutura

> **Nota de estado (20/08/2026):** este documento mistura implementação e intenção.
> Use a [auditoria factual](./08_auditoria_estado_atual.md) como referência atual;
> o backend é um monólito modular e os domínios públicos não estão validados como produção.

[← Retornar ao Master Node](./00_index.md)

---

## 🏛️ Visão Geral da Topologia

O ecossistema **Kurage** adota uma arquitetura em nuvem desacoplada, orientada a microserviços e alta performance, dividida entre Vercel, VPS/Oracle Cloud, e Cloudflare.

```mermaid
flowchart TB
    Client((Navegador / Jogador))
    CS2Server[Servidores CS2 (DM / Retake / 5v5)]
    
    subgraph Vercel [Frontend Vercel]
        NextJS[Next.js 16 App Router]
        Proxy[Proxy de Inventário cstrike.app]
    end
    
    subgraph CloudHost [Host Cloud / VPS Linux]
        direction TB
        Caddy[Caddy Reverse Proxy (HTTPS)]
        Spring[API Spring Boot 4 / Java 21]
        Postgres[(PostgreSQL 16 + Flyway)]
        Redis[(Redis 7 - Cache & Sessions)]
        Mongo[(MongoDB 6 - Notificações)]
        
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

## 🚀 Componentes de Hospedagem

### 1. Frontend (Vercel)
- **Domínio:** `kurage.caiomayan.com`
- **Stack:** Next.js 16 (App Router), TypeScript Strict, Tailwind CSS / Vanilla tokens.
- **Funcionalidades:** Server-Side Rendering (SSR) para SEO e metadados OpenGraph, Server Components para carregamento inicial ultra-rápido, e Client Components interativos (Command Palette `⌘K`, Hovercards com delay 300ms, Server Browser).

### 2. Backend API (Linux VPS / Docker Compose)
- **Domínio:** `apikurage.caiomayan.com`
- **Stack:** Java 21 (Virtual Threads habilitadas), Spring Boot 4.1.
- **Caddy:** Gerencia terminação TLS automática com Let's Encrypt e faz o proxy reverso para a porta `8080` da API.
- **PostgreSQL 16:** Banco de dados relacional primário gerenciado via migrations do Flyway (`V1__kurage_init.sql`).
- **Redis 7:** Armazena sessões de refresh token rotativas, blacklist JWT e cache de alto throughput (leaderboards, hovercards, quick search, status de servidores).
- **MongoDB 6:** Armazenamento orientado a documentos para o subsistema de notificações do usuário (convites de time, join requests, avisos do sistema).

### 3. Cloudflare R2 (Armazenamento de Objetos)
- **Bucket:** `kurage-bucket`
- **Compatibilidade:** API S3 (AWS SDK v2 para Java).
- **Uso:** Armazenamento e entrega via CDN de avatares customizados de jogadores e logos de times.

---

## ⚡ Otimizações de Performance do Backend
- **Java 21 Virtual Threads:** `spring.threads.virtual.enabled=true` para processamento concorrente I/O-bound de altíssimo throughput.
- **HikariCP Pool:** Configurado com pool máximo de 25 conexões e timeout de 20s.
- **Tomcat Keep-Alive:** 60.000ms de timeout para reaproveitamento de conexões HTTP.
