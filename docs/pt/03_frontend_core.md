# Core do Frontend (Next.js App Router)

> **Nota de estado (20/08/2026):** rotas e componentes planejados neste documento
> não equivalem a funcionalidades disponíveis. Consulte a
> [auditoria factual](./08_auditoria_estado_atual.md) e a árvore de rotas validada.

[← Retornar ao Master Node](./00_index.md)

---

## 💻 Arquitetura do Frontend

O frontend da Kurage foi construído utilizando **Next.js 16 (App Router)** com foco em altíssima densidade informacional, acabamento profissional (estilo Apple-modern) e navegação instantânea.

### 🛠️ Stack Tecnológica & Bibliotecas Modernas
- **Framework Core:** Next.js 16 + React 19 + TypeScript (Strict Mode)
- **Estilização & Tokens:** Tailwind CSS v4 + Design System Kurage com cores HSL/Hex refinadas
- **Primitivas de UI & Acessibilidade:** Radix UI / Shadcn UI base + CMDk (Command Palette)
- **Gerenciamento de Estado Server-Side:** TanStack React Query v5 (cache, revalidação e polling)
- **Formulários & Schemas:** React Hook Form + Zod (validação type-safe)
- **Feedback & Notificações:** Sonner (toasts minimalistas e de alta performance)
- **Fontes:** Inter (corpo) + Manrope (títulos/display) + JetBrains Mono (dados e IDs)

```
frontend/src
├── app/
│   ├── layout.tsx                     # Shell global (Header 56px, Footer, Fonts, Providers)
│   ├── page.tsx                       # Home page (3 colunas HLTV, Ticker, Highlights)
│   ├── auth/
│   │   └── callback/page.tsx          # Rota de captura de JWT Steam e redirecionamento dinâmico
│   ├── ranking/
│   │   ├── page.tsx                   # Ranking de Jogadores (Top 200)
│   │   └── teams/page.tsx             # Ranking de Times (Top 50)
│   ├── servers/
│   │   └── page.tsx                   # Server Browser (Filtros DM, Retake, 5v5)
│   ├── search/
│   │   └── page.tsx                   # Página dedicada de resultados de busca
│   ├── player/[kurageId]/[slug]/
│   │   └── page.tsx                   # Perfil do jogador (Overview, Inventário, Stats)
│   ├── team/[tag]/
│   │   └── page.tsx                   # Perfil do time (Lineup, Staff, Gestão)
│   └── invite/[token]/
│       └── page.tsx                   # Aceite de convite tokenizado de time
├── components/
│   ├── shell/                         # Header, Footer, Navigation, UserDropdown
│   ├── search/                        # CommandPalette (cmdk), SearchResultsView
│   ├── ui/                            # Brand, Hovercard, Avatar, StatTile, ServerCard, Badges
│   └── player/                        # PlayerRow, FunctionsBadge, FaceitModule
├── providers/
│   └── QueryProvider.tsx              # Provedor TanStack Query Client
├── types/
│   └── user.ts                        # Interfaces TypeScript de Domínio e Autenticação
└── lib/
    ├── api.ts                         # Client HTTP centralizado com interceptor JWT e refresh
    ├── auth.tsx                       # Context de autenticação, rotação de refresh token e login Steam
    └── utils.ts                       # Helpers de formatação e utilitário cn (clsx + tailwind-merge)
```

---

## 🔐 Fluxo de Autenticação Steam (Desacoplado & Cookie-Only)

1. O usuário clica em **"Entrar com Steam"** no cabeçalho ou nas ações da plataforma.
2. O `lib/auth.tsx` armazena no `sessionStorage` a rota atual de onde o usuário partiu (`kurage_auth_redirect_to`).
3. O navegador é redirecionado para o backend (`/auth/steam`), que processa o handshake OpenID seguro com a Valve.
4. Após o login bem-sucedido, o backend emite os cookies `refresh_token` e `device_id` protegidos como **`HttpOnly`**, **`Secure`** e **`SameSite=Lax`**, e redireciona o usuário para `/auth/callback`.
5. A página `app/auth/callback/page.tsx` invoca `refreshToken()` via `POST /auth/refresh` (que envia os cookies HttpOnly automaticamente), obtendo o JWT de acesso em **memória volátil** (`inMemoryToken`), sem nunca persistir em `localStorage` (blindagem contra XSS).
6. O perfil é obtido em `/users/me` e o usuário é redirecionado de volta com segurança para a página de onde partiu (`kurage_auth_redirect_to`).
7. **Headers de Segurança:** Configurados no `next.config.ts` com Content-Security-Policy restritiva, X-Frame-Options (DENY), X-Content-Type-Options (nosniff) e Referrer-Policy.

---

## 🏛️ Layout 3 Colunas (HLTV-Inspired)

A tela inicial e páginas principais no desktop (largura ≥ 1280px) adotam a distribuição de três colunas:

| Coluna | Largura | Conteúdo Principal |
|---|---|---|
| **Esquerda (Left)** | ~210px fixo | Preview dos Top 5 Rankings, Destaque da Semana, Estatísticas Rápidas |
| **Centro (Center)** | Fluido (~650px) | Banner editorial de destaque, News/Artigos, Server Browser resumido |
| **Direita (Right)** | ~260px fixo | Partidas do dia, Ranking de Times, Rising Players |

- **Responsividade:**
  - Em telas de tablet (768px a 1279px), a coluna da direita colapsa graciosamente.
  - Em dispositivos móveis (< 768px), o layout passa a 1 coluna linear com drawer lateral.

---

## 🔍 Busca Global & Hovercards
- **Command Palette (`⌘K` ou `/`):** Aciona o modal `SearchPanel.tsx` construído com `cmdk` e `@tanstack/react-query` (com debounce de 400ms), exibindo o Top Result com destaque editorial, listas agrupadas de jogadores e times, e navegação via setas.
- **Search Results Page (`/search?q={query}`):** Página completa com abas (*Todos*, *Jogadores*, *Times*), paginação integrada ao backend, cards de resultado e filtros persistidos na URL.
- **Hovercards Universais (`Hovercard.tsx`):** Construído sobre `@radix-ui/react-hover-card`, dispara uma consulta ao endpoint `/users/{kurageId}/hovercard` com delay de 300ms e cache inteligente de 10 minutos no React Query para mitigar rate limits.
- **Avatar Reutilizável (`Avatar.tsx`):** Suporta 6 tamanhos (`xs`, `sm`, `md`, `lg`, `xl`, `2xl`), badges de nível Kurage (`LevelBadge.tsx`), selo de verificação profissional (`VerifiedProBadge.tsx`) e acoplamento automático com Hovercard.

---

## 🎮 Páginas Core da Plataforma (Etapa 10)

### 1. Home Page (`app/page.tsx`)
- **Live Pulse Ticker (`LivePulseTicker.tsx`):** Barra superior de métricas agregadas em tempo real com indicador de pulso verde, contadores de jogadores online, servidores ativos e partidas simultâneas, além de atalhos rápidos para conexão.
- **Estrutura HLTV 3-Colunas:**
  - **Coluna Esquerda:** Widget de *Jogador da Semana*, ranking Top 5 com seletor ELO vs K/D (`TopPlayersWidget.tsx`), e métricas agregadas do *Pulso da Comunidade* (`CommunityPulseWidget.tsx`).
  - **Coluna Central:** Banner editorial de destaque com carrossel numérico (`EditorialSection.tsx`), destaques de K/D e ascensão semanal, e a lista de servidores rápidos da Kurage (`HomeServerList.tsx`).
  - **Coluna Direita:** Agenda de partidas do dia/semana (`MatchesScheduleWidget.tsx`) e ranking Top 5 de organizações/times (`TopTeamsWidget.tsx`).
- **Discovery Grid:** 4 cartões no rodapé direcionando para as verticais da plataforma (Rankings, Jogadores, Times, Servidores).

### 2. Ranking de Jogadores (`app/ranking/page.tsx`)
- **Pódio Top 3 Expandido (`RankingPodium.tsx`):** Cartões customizados em Ouro (#1), Prata (#2) e Bronze (#3), destacando ELO, K/D, taxa de vitória, insígnia de nível e selo profissional verificado.
- **Tabela Completa de Classificação:**
  - Posição absoluta com indicador de delta de variação recente (`↑`, `↓`, `—`).
  - Identidade do jogador com Avatar, Hovercard, nome e organização.
  - Insígnias de Nível Kurage (1–10).
  - Métricas competitivas: ELO, K/D, Win Rate %, Vitórias/Partidas e Função Tática primária.
- **Paginação Persistente:** Suporte a query params na URL (`?page=`, `?size=20`) encapsulados com `<Suspense>`.

### 3. Ranking de Times & Organizações (`app/ranking/teams/page.tsx`)
- Pódio dos Top 3 times com logo/tag, contagem de integrantes e ELO médio da equipe.
- Tabela paginada com classificação das 50 principais organizações da temporada.
- Navegação direta entre abas de Jogadores e Times.

### 4. Navegador de Servidores (`app/servers/page.tsx`)
- **Filtros e Busca em Tempo Real:** Filtros por modo de jogo (*Todos*, *Deathmatch*, *Retake*, *5v5*) e barra de busca client-side por mapa, nome ou IP.
- **Polling em Tempo Real:** Configuração de `refetchInterval: 15000` (15 segundos) no TanStack Query, garantindo lotação e status atualizados sem intervenção manual.
- **Modal de Conexão Direta (`ServerConnectModal.tsx`):**
  - Exibe dados detalhados (mapa, jogadores, status online).
  - Comando pronto para o console do CS2 (`connect ip:port`) com cópia em 1 clique.
  - Link de protocolo direto para abrir o CS2 (`steam://connect/...`).
