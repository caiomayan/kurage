# Frontend Core (Next.js App Router)

> **Status note (20 August 2026):** routes and components planned here are not
> necessarily available features. See the
> [factual audit](./08_current_state_audit.md) and its validated route inventory.

[← Return to Master Node](./00_index.md)

---

## 💻 Frontend Architecture

Kurage's frontend is built with **Next.js 16 (App Router)** designed for maximum information density, Apple-modern polish, and instant navigation.

### 🛠️ Technology Stack & Modern Tooling
- **Core Framework:** Next.js 16 + React 19 + TypeScript (Strict Mode)
- **Styling & Design System:** Tailwind CSS v4 with bespoke Kurage tokens (depth canvas, surfaces, Sea Glass brand accents)
- **UI Primitives & Accessibility:** Radix UI / Shadcn UI base + CMDk (Command Palette)
- **Server-State Management:** TanStack React Query v5 (caching, revalidation, and live polling)
- **Forms & Schemas:** React Hook Form + Zod (type-safe schema validations)
- **Visual Feedback:** Sonner (lightweight high-performance toast notifications)
- **Typography:** Inter (Body) + Manrope (Display/Headers) + JetBrains Mono (Data/IDs)

### Data and failure states

- empty lists render only after a valid backend response;
- ranking, search, and inventory failures have dedicated retryable states;
- profiles return 404 only when the API confirms that the player does not exist;
- temporary API failure reaches the error boundary and never becomes a false 404;
- telemetry preserves the last known snapshot, reports unavailability, and
  expires stale live data.

```
frontend/src
├── app/
│   ├── layout.tsx                     # Global shell (56px Header, Footer, Providers, Fonts)
│   ├── page.tsx                       # Home page (3-column HLTV layout, Live Ticker, Spotlight)
│   ├── auth/
│   │   └── callback/page.tsx          # Steam JWT capture and return-to redirect handler
│   ├── ranking/
│   │   ├── page.tsx                   # Player Leaderboard (Top 200)
│   │   └── teams/page.tsx             # Team Leaderboard (Top 50)
│   ├── servers/
│   │   └── page.tsx                   # CS2 Server Browser (DM, Retake, 5v5 Scrims)
│   ├── search/
│   │   └── page.tsx                   # Dedicated full-page search results
│   ├── player/[kurageId]/[slug]/
│   │   └── page.tsx                   # Player Profile (Overview, Inventory, Match Stats)
│   ├── team/[tag]/
│   │   └── page.tsx                   # Team Page (Active Lineup, Staff, Management)
│   └── invite/[token]/
│       └── page.tsx                   # Team tokenized invite landing page
├── components/
│   ├── shell/                         # Header, Footer, Navigation, UserDropdown
│   ├── search/                        # CommandPalette (cmdk), SearchResultsView
│   ├── ui/                            # Brand, Hovercard, Avatar, StatTile, ServerCard, Badges
│   └── player/                        # PlayerRow, FunctionsBadge, FaceitModule
├── providers/
│   └── QueryProvider.tsx              # TanStack Query Client Provider
├── types/
│   └── user.ts                        # Domain & Auth TypeScript Interfaces
└── lib/
    ├── api.ts                         # Centralized HTTP client with JWT interceptor and refresh
    ├── auth.tsx                       # AuthContext, refresh token rotation, and Steam login
    └── utils.ts                       # Helpers and cn utility (clsx + tailwind-merge)
```

---

## 🔐 Steam OpenID Authentication Flow (Decoupled & Cookie-Only)

1. User clicks **"Entrar com Steam"** in the header or platform actions.
2. `lib/auth.tsx` records the current path in `sessionStorage` (`kurage_auth_redirect_to`).
3. Browser navigates to backend (`/auth/steam`), initiating the secure OpenID handshake with Valve.
4. The backend validates and consumes one-time Steam state, sets `refresh_token`
   and `device_id` as **HttpOnly**, **Secure**, **SameSite=Lax**, and returns to the
   sanitized internal path.
5. On mount, `AuthProvider` calls `POST /auth/refresh` with cookies and stores the
   JWT **in volatile memory only** (`inMemoryToken`), never in `localStorage`.
   Only `401` triggers refresh; `403` preserves the session and means access was
   denied.
6. Profile data is fetched from `/users/me` and the user is securely redirected back to their previous page (`kurage_auth_redirect_to`).
7. **Security Headers:** Configured in `next.config.ts` including strict Content-Security-Policy, X-Frame-Options (DENY), X-Content-Type-Options (nosniff), and Referrer-Policy.

---

## 🏛️ 3-Column Layout (HLTV-Inspired)

On desktop (width ≥ 1280px), pages utilize a functional 3-column split:

| Column | Width | Content |
|---|---|---|
| **Left** | ~210px fixed | Leaderboard previews, Player of the Week, Quick Stats |
| **Center** | Fluid (~650px) | Editorial Hero, Featured Articles, CS2 Server Browser preview |
| **Right** | ~260px fixed | Matches of the day, Team Rankings, Rising Players |

---

## 🔍 Global Search & Universal Hovercards
- **Command Palette (`⌘K` / `/`):** Powered by `SearchPanel.tsx` using `cmdk` and TanStack Query (with 400ms debounce), spotlighting the top result with full stats, grouped categories, and keyboard navigation.
- **Search Results Page (`/search?q={query}`):** Full tabbed view (*All*, *Players*, *Teams*) with backend-backed pagination, responsive result cards, and URL query persistence.
- **Universal Hovercards (`Hovercard.tsx`):** Built with `@radix-ui/react-hover-card`, fetches `/users/{kurageId}/hovercard` with a 300ms hover delay and aggressive 10-minute caching to eliminate rate limit concerns.
- **Reusable Avatar (`Avatar.tsx`):** Supports 6 sizes (`xs`, `sm`, `md`, `lg`, `xl`, `2xl`), Kurage level badges (`LevelBadge.tsx`), verified pro badges (`VerifiedProBadge.tsx`), and automated Hovercard integration.

---

## 🎮 Platform Core Pages (Step 10)

### 1. Home Page (`app/page.tsx`)
- **Live Pulse Ticker (`LivePulseTicker.tsx`):** Real-time aggregate metric top bar with online player counts, active servers, concurrent matches, and quick connect links.
- **3-Column HLTV Architecture:**
  - **Left Column:** *Player of the Week* card, Top 5 leaderboard with ELO vs K/D switch (`TopPlayersWidget.tsx`), and aggregate *Community Pulse* metrics (`CommunityPulseWidget.tsx`).
  - **Center Column:** Editorial Hero banner with article selector (`EditorialSection.tsx`), K/D highlights, and the Kurage quick server table (`HomeServerList.tsx`).
  - **Right Column:** Match schedule widget (`MatchesScheduleWidget.tsx`) and Top 5 Team leaderboard (`TopTeamsWidget.tsx`).
- **Discovery Grid:** 4 footer callouts directing users to platform verticals (Rankings, Players, Teams, Servers).

### 2. Player Leaderboard (`app/ranking/page.tsx`)
- **Page data integrity:** the leaderboard does not manufacture position, ELO, rating, or chart points. Ranking requires five matches; calibrating accounts are absent and history is drawn only from persisted snapshots. Hovercards, search, and summaries expose missing/calibrating states instead of substituting ELO, level, rating, or unlabeled FACEIT metrics.
- **Top 3 Podium (`RankingPodium.tsx`):** Expanded cards in Gold (#1), Silver (#2), and Bronze (#3), showcasing ELO, K/D, win rate, level badge, and verified pro status.
- **Complete Leaderboard Table:**
  - Absolute position with recent position delta indicators (`↑`, `↓`, `—`).
  - Player identity with Avatar, Hovercard, username, and team tag.
  - Kurage Level Badges (1–10).
  - Competitive metrics: ELO, K/D, Win Rate %, Wins/Matches, and tactical role tag.
- **Persistent Pagination:** URL search parameters (`?page=`, `?size=20`) wrapped in `<Suspense>`.

### Player profile — visitors
- When another account's profile opens, the authenticated client sends `POST /users/kurage/{kurageId}/visit`; public profile reads do not write implicitly.
- Maré/Admin/Owner can view the target profile's latest 20 visitors through `GET /users/kurage/{kurageId}/visitors`; callers without the entitlement receive neither the panel nor its data.
- The panel renders real avatar and timestamp data with loading, empty, failure, and retry states. The full visual refactor and new background remain in step 3 of the [evolution plan](../pt/19_plano_evolucao_identidade_rating_perfil.md).

### 3. Team & Organization Leaderboard (`app/ranking/teams/page.tsx`)
- Top 3 teams podium with logo/tag, member count, and team average ELO.
- Paginated table ranking the top 50 organizations of the active season.
- Tab switcher between Players and Teams.

### 4. Game Server Browser (`app/servers/page.tsx`)
- **Real-time Filters & Search:** Mode filter pills (*All*, *Deathmatch*, *Retake*, *5v5*) and client-side map/name search.
- **Live Polling:** Configured with `refetchInterval: 15000` (15s) in TanStack Query for up-to-the-second player count and server status.
- **Direct Connect Modal (`ServerConnectModal.tsx`):**
  - Displays map, player occupancy, and ping.
  - CS2 console command (`connect ip:port`) with 1-click clipboard copy.
  - Steam protocol launch link (`steam://connect/...`).
