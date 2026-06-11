# Thoughts Market — Project Documentation

**Prepared for:** Project Manager & Client
**Document type:** Technical & Functional Overview
**Last updated:** 10 June 2026

---

## 1. Executive Summary

**Thoughts Market** is a decentralized **prediction-market platform** — a web application where users trade on the outcomes of real-world events (politics, sports, crypto, finance, geopolitics, and more). Users connect a crypto wallet, fund a balance, and buy "Yes/No" positions on markets; prices reflect the crowd's probability estimate and settle on-chain.

The platform is delivered as a modern, responsive web app with:

- A **public trading experience** (markets, live events, portfolio, leaderboard, peer-to-peer rooms).
- A **full administrative back-office** for managing the platform (markets, users, finance, content, roles).
- **On-chain settlement** and **multi-chain crypto deposits/withdrawals** (via Polygon and cross-chain bridging).
- **Internationalization** (multi-language) and **light/dark theming**.

The product is production-grade, built on a current, well-supported technology stack, and is structured for security, scalability, and maintainability.

---

## 2. Technology Stack

| Layer | Technology | Version | Purpose |
|---|---|---|---|
| Framework | **Next.js** (App Router, Turbopack) | 16.2 | Full-stack React framework (UI + server APIs) |
| UI library | **React** | 19.2 | Component-based user interface |
| Language | **TypeScript** | 5.9 | Type-safe development |
| Styling | **Tailwind CSS** | 4.2 | Utility-first design system ("Prism" theme) |
| Authentication | **Better Auth** | 1.6 | Wallet sign-in (SIWE), 2FA, sessions |
| Database ORM | **Drizzle ORM** | 0.45 | Type-safe database access |
| Database | **PostgreSQL** (Supabase) | — | Primary data store |
| Data fetching | **TanStack Query** | 5.x | Client-side caching & sync |
| State | **Zustand** | 5.x | Lightweight app state |
| Wallet / Web3 | **Wagmi + Viem + Reown AppKit** | — | Wallet connection & on-chain transactions |
| Cross-chain | **LI.FI SDK** | 3.16 | Multi-chain bridging & swaps for withdrawals |
| i18n | **next-intl** | 4.11 | Multi-language support |
| Monitoring | **Sentry** | — | Error tracking & observability |

**Hosting:** Vercel (frontend + serverless API). **Database & storage:** Supabase (PostgreSQL + file storage).

---

## 3. System Architecture

```
                         ┌─────────────────────────────┐
                         │        User's Browser        │
                         │   (Next.js React frontend)   │
                         └──────────────┬──────────────┘
                                        │  HTTPS
                ┌───────────────────────┼───────────────────────┐
                │                       │                        │
        ┌───────▼────────┐    ┌─────────▼─────────┐    ┌─────────▼─────────┐
        │  Next.js Server │    │   Better Auth     │    │   Crypto Wallet   │
        │  (API routes,   │    │  (SIWE wallet     │    │ (MetaMask / Reown │
        │   server pages) │    │   login, 2FA)     │    │   AppKit, etc.)   │
        └───────┬────────┘    └─────────┬─────────┘    └─────────┬─────────┘
                │                       │                        │
        ┌───────▼────────┐    ┌─────────▼─────────┐    ┌─────────▼─────────┐
        │  PostgreSQL     │    │  Supabase Storage │    │  Blockchain       │
        │  (Supabase)     │    │  (images/assets)  │    │  Polygon + LI.FI  │
        │  via Drizzle    │    │                   │    │  (settlement,     │
        │                 │    │                   │    │   bridging)       │
        └─────────────────┘    └───────────────────┘    └───────────────────┘
```

- **Frontend & backend share one Next.js codebase** (App Router). Server-rendered pages handle SEO and initial load; API routes handle data and on-chain orchestration.
- **Authentication** is wallet-based (Sign-In With Ethereum / SIWE) with optional two-factor authentication. A separate username/password path exists for administrators.
- **Funds** live in a per-user **smart deposit wallet** on Polygon. Withdrawals can stay on Polygon or **bridge cross-chain** through LI.FI.

---

## 4. Core Features (User-Facing)

### 4.1 Markets & Trading
- Browse markets by category: **Trending, New, Politics, Sports, Crypto, Esports, Finance, Geopolitics, Tech, Culture, World, Economy, Weather, Elections**.
- Market types: **Daily, Daily-Close, Recurring, Up-or-Down, Crypto Prices**, and more.
- Live price/probability display with **Predict Yes / Predict No** at cent-denominated odds.
- Market detail pages with charts, volume, trader counts, and resolution timing.

### 4.2 Wallet, Deposits & Withdrawals
- Connect any major crypto wallet (via Reown AppKit / WalletConnect).
- **Deposit** funds into a personal on-chain deposit wallet.
- **Withdraw** to any address. Withdrawals support:
  - Same-chain (Polygon USDC) — fast, low-cost direct transfer.
  - **Cross-chain** to Ethereum, Base, Arbitrum, BSC, Optimism, with token choice (USDC, USDT, ETH, DAI, and more) — routed automatically through **LI.FI** bridging.
- On-ramp support (buy crypto with card/Apple Pay/etc. via integrated provider).

### 4.3 Portfolio & Activity
- **Portfolio** view of open positions and balances.
- **Activity** history and **Predictions** tracking.
- **Leaderboard** ranking traders.
- **Watchlist** for saved markets.

### 4.4 Peer-to-Peer (P2P) Rooms
- "Friends Play" — create or join **private prediction rooms** with custom stakes (up to 50 players), settled on-chain.

### 4.5 Atlas — Global Intelligence
- An interactive, photorealistic **3D globe widget** showing platform market categories anchored to world locations, with live hotspots, flight-path arcs, and a global-risk/activity dashboard. Clickable to navigate into each category.

### 4.6 Account & Settings
- Profile management, **two-factor authentication (2FA)**, active-session management, privacy controls, and a danger zone.
- **Multi-language** UI and **light/dark/system** theme switching.
- Affiliate / referral program.

---

## 5. Administrative Back-Office

A dedicated admin panel (`/admin`) provides full platform management, organized into sections:

| Section | Purpose |
|---|---|
| **General** | Company identity, platform configuration, API keys |
| **Theme** | Branding and appearance |
| **Locales** | Languages and translations |
| **Categories** | Market category management |
| **Market Context** | Market data, signals, and context |
| **Trending / Social** | Curate trending markets and social content |
| **Events** | Create and manage prediction events/markets |
| **Finance** | Financial operations and oversight |
| **Affiliate** | Referral program management |
| **Peer to Peer** | View, create, and remove P2P rooms |
| **Support** | User support tools |
| **Users** | User directory and management |
| **Roles** | Role assignment & access control (see §6) |
| **Reels** | Media/short-form content |

---

## 6. Security & Access Control (RBAC)

The platform implements **Role-Based Access Control** so that staff only see and manage the areas relevant to their job.

### 6.1 Admin Roles
| Role | Can access |
|---|---|
| **super_admin** | **Everything** (full platform control, including assigning roles) |
| **finance_admin** | General, Finance, Affiliate |
| **market_manager** | General, Trending, Social, Categories, Market Context |
| **content_manager** | General, Categories, Social, Events, Theme |
| **moderator** | General, Support, Users, Social |
| **risk_analyst** | General, Events, Market Context |
| **support_agent** | General, Support |

### 6.2 How access is enforced
- **Two authentication paths into admin:** (1) a designated **admin wallet**, or (2) a **username/password** super-admin login (separate from public wallet auth).
- The **admin sidebar only shows sections** a user's role permits.
- **Server-side guards** protect each section so restricted areas cannot be reached even by direct URL.
- **Role assignment is restricted to super-admins** — only they can grant or revoke permissions to other users.
- The designated **owner wallet** is configured via environment variables (`ADMIN_WALLETS` / `SUPER_ADMIN_WALLETS`) and is recognized whether it is the user's login wallet or their deposit wallet.

### 6.3 Platform security measures
- Wallet-signature authentication (SIWE) — no passwords stored for end users.
- Optional **two-factor authentication** for accounts.
- Signed, HMAC-protected admin session cookies.
- Server-side validation of all financial operations and recipient addresses.
- Error monitoring via Sentry.

---

## 7. Funds & On-Chain Settlement

- Each user has a **smart deposit wallet** on **Polygon**; the platform's collateral token is **USDC**.
- Trades and P2P rooms settle **on-chain**.
- **Withdrawals** are executed as signed batch transactions from the deposit wallet:
  - Polygon-USDC withdrawals are direct ERC-20 transfers.
  - Other chains/tokens are bridged via **LI.FI** with an automatic quote (amount, route, and fees) before confirmation.
- **Note on Solana:** Solana/SOL withdrawals are intentionally **disabled**. The deposit wallet is EVM-based, and Solana uses an incompatible address format — enabling it without a dedicated Solana integration would risk loss of funds. This is a deliberate safety measure.

---

## 8. Internationalization & Theming

- Full **multi-language** support through next-intl; languages and translations are manageable from the admin **Locales** section.
- **Light / Dark / System** themes with a cohesive "Prism" design system (violet / cyan / pink accent palette), applied consistently across the public app and admin panel.

---

## 9. Environments & Configuration

The application is configured entirely through environment variables (no secrets in code). Key groups:

| Group | Variables (names only) |
|---|---|
| Auth | `BETTER_AUTH_SECRET`, `ADMIN_WALLETS`, `SUPER_ADMIN_WALLETS` |
| Database | `POSTGRES_URL`, `POSTGRES_URL_NON_POOLING`, `POSTGRES_HOST`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DATABASE` |
| Supabase | `SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_JWT_SECRET`, anon/publishable keys |
| Web3 / Markets | `REOWN_APPKIT_PROJECT_ID`, on-chain API credentials, `EVENT_CREATION_SIGNER_PRIVATE_KEYS` |
| Operations | `CRON_SECRET`, `SENTRY_DSN` / `SENTRY_ORG` / `SENTRY_PROJECT` |

**Available scripts:** `dev` (local development), `build` (production build), `start` (run production), `lint`, `test` / `test:unit` / `test:e2e` (automated tests), `db:push` (apply database schema).

---

## 10. Quality & Testing

- **Type safety** enforced project-wide with TypeScript.
- **Linting** for code consistency.
- **Unit and end-to-end (E2E) test** suites are configured.
- **Error monitoring** in production through Sentry.

---

## 11. Current Status

The platform is **functional and feature-complete** across the areas described above:

- ✅ Public trading experience, markets, portfolio, leaderboard, watchlist.
- ✅ Wallet connection, deposits, and **multi-chain withdrawals** (EVM chains live; Solana disabled by design).
- ✅ **Peer-to-Peer** private rooms.
- ✅ **Atlas** interactive 3D globe (photorealistic, with category hotspots and arcs).
- ✅ Full **admin back-office** with all sections.
- ✅ **Role-Based Access Control** — staff restricted to their assigned sections; only super-admins assign roles.
- ✅ Internationalization and theming.

---

## 12. Recommended Next Steps / Notes for Stakeholders

1. **Funds testing:** Cross-chain withdrawals move real assets. Before production use, conduct **small test withdrawals per chain/token** to validate bridge routes, fees, and minimums.
2. **Withdrawal preview:** Optionally surface the live LI.FI "you will receive" estimate (output amount + fees) in the confirmation step for full transparency to users.
3. **Admin section guards:** Continue applying the section-level URL guard across all remaining admin sections for defense-in-depth (sidebar filtering is already in place).
4. **Solana support:** If Solana withdrawals are required, scope a dedicated Solana integration (separate signing + address validation).

---

*This document is a functional and technical overview intended for project and client review. For implementation-level detail (database schema, API contracts, deployment runbook), a separate engineering appendix can be provided on request.*
