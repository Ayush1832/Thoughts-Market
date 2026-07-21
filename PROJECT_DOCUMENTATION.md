# Thoughts Market — Project Documentation

**Prepared for:** Project Manager & Client
**Document type:** Technical & Functional Overview
**Last updated:** 8 July 2026

---

## 1. Executive Summary

**Thoughts Market** is a decentralized **prediction-market platform** — a web application where users trade on the outcomes of real-world events (politics, sports, crypto, finance, geopolitics, and more). Users connect a crypto wallet, fund a balance, and buy "Yes/No" positions on markets; prices reflect the crowd's probability estimate and settle on-chain.

The platform is delivered as a modern, responsive web app with:

- A **public trading experience** (markets, live events, portfolio, leaderboard, peer-to-peer rooms).
- A **full administrative back-office** for managing the platform (markets, users, finance, content, roles).
- **Custodial multi-chain deposits and withdrawals** across 12 networks (see §7), with a single unified balance regardless of which coin or chain a user deposits with.
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
| Wallet / Web3 (EVM) | **Wagmi + Viem + Reown AppKit** | — | Wallet connection & on-chain transactions |
| Tron | **TronWeb** | 6.x | Tron address derivation, transfers, TronGrid queries |
| Solana | **@solana/web3.js + @solana/spl-token** | 1.x / 0.4 | Solana keypairs, native SOL and SPL token transfers |
| Bitcoin | **bitcoinjs-lib + ecpair + @scure/bip32** | 7.x | Native-segwit address derivation, PSBT transaction signing |
| Cross-chain bridging | **LI.FI SDK** | 3.16 | Swap/bridge routing for withdrawals and treasury payouts |
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
        │  PostgreSQL     │    │  Supabase Storage │    │  12 Blockchains   │
        │  (Supabase)     │    │  (images/assets)  │    │  + LI.FI bridging │
        │  via Drizzle    │    │                   │    │  (deposits,       │
        │                 │    │                   │    │   withdrawals)    │
        └─────────────────┘    └───────────────────┘    └───────────────────┘
```

- **Frontend & backend share one Next.js codebase** (App Router). Server-rendered pages handle SEO and initial load; API routes handle data and on-chain orchestration.
- **Authentication** is wallet-based (Sign-In With Ethereum / SIWE) with optional two-factor authentication. A separate username/password path exists for administrators.
- **Funds are custodial.** Each user gets a unique deposit address per coin/network; whatever they deposit is converted to a single internal USD balance. Withdrawals draw from that same balance regardless of which coin was originally deposited.

---

## 4. Core Features (User-Facing)

### 4.1 Markets & Trading
- Browse markets by category: **Trending, New, Politics, Sports, Crypto, Esports, Finance, Geopolitics, Tech, Culture, World, Economy, Weather, Elections**.
- Market types: **Daily, Daily-Close, Recurring, Up-or-Down, Crypto Prices**, and more.
- Live price/probability display with **Predict Yes / Predict No** at cent-denominated odds.
- Market detail pages with charts, volume, trader counts, and resolution timing.

### 4.2 Wallet, Deposits & Withdrawals

The platform is **custodial** (similar to a centralized exchange): the platform generates and controls deposit addresses, credits users an internal balance, and pays out withdrawals from a hot wallet — users never sign a blockchain transaction themselves for deposits or trading.

- **Deposit:** each user gets a unique address per coin and network. Sending any supported coin credits their account balance in USD terms at the live market price — no manual conversion needed.
- **Withdraw:** a user can withdraw to **any supported coin on any supported network**, regardless of what they originally deposited. If the platform doesn't already hold that exact asset on that chain, it is automatically swapped/bridged (via LI.FI) before payout. A transparent fee (flat network cost + a small percentage) is deducted from the payout amount and shown before the user confirms. **User withdrawals require no admin approval** — the request is validated and debited immediately, and a background job sends the payout automatically. The admin Finance dashboard's Approve/Reject controls apply only to separately-created manual admin ledger entries, not to real user withdrawals.
- **Supported today:** Ethereum, Polygon, BNB Smart Chain, Avalanche, Arbitrum, Base, Optimism, Ronin, Hyperliquid (all EVM chains), plus **Tron, Solana, and Bitcoin**, each with its own dedicated integration (not EVM-compatible, so each required separate address derivation, deposit detection, and transfer logic).
- **On-ramp support** (buy crypto with card/Apple Pay/etc. via integrated provider) remains available as an alternative funding method.

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
| **Finance** | Financial operations, treasury visibility, and **client payout** (see §7.3) |
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
- Server-side validation of all financial operations and recipient addresses (address-format validation is chain-specific — EVM, Tron, Solana, and Bitcoin each use their own).
- Error monitoring via Sentry.

---

## 7. Funds & Custodial Settlement

### 7.1 The model

Every deposit, in any supported coin on any supported network, is priced and converted into a single internal balance denominated in USD (backed by USDC on Polygon). This is why a user who deposits ETH on Arbitrum can later withdraw as USDT on Tron, or BTC, or any other supported asset — their balance is just one number, not a per-coin wallet.

### 7.2 Supported networks (12 live)

| Network | Native coin | Also supports |
|---|---|---|
| Ethereum | ETH | USDC, USDT, LINK, UNI, SAND, IMX, RLB |
| Polygon | POL | USDC, USDT |
| BNB Smart Chain | BNB | USDC, USDT |
| Avalanche | AVAX | USDC, USDT |
| Arbitrum | ETH | USDC, USDT |
| Base | ETH | USDC |
| Optimism | ETH | USDC, USDT |
| Ronin | RON | — |
| Hyperliquid | HYPE | — |
| Tron | TRX | USDT (TRC-20) |
| Solana | SOL | USDC, USDT (SPL) |
| Bitcoin | BTC | — |

Deposits are detected automatically (per-chain monitoring, no manual confirmation needed), swept into a treasury address, and credited to the user's balance at the live market price. Withdrawals are paid out directly if the treasury already holds the requested asset on that chain, or automatically swapped/bridged if not.

Remaining client-requested coins/networks not yet built (currently on hold, pending prioritization): XRP, Cardano, Polkadot, Monero, Zcash, Stellar, Litecoin, Bitcoin Cash. Litecoin and Bitcoin Cash specifically have no supported bridge route through the platform's cross-chain provider (LI.FI) and would need a different bridging partner if required.

### 7.3 Client treasury payout

The platform owner's revenue (fees plus the operating surplus) accumulates in the treasury across the networks above. From the admin **Finance → Treasury** tab, an authorized admin can trigger a payout of any treasury balance directly to the client's **Tron wallet as TRC-20 USDT** — the most liquid, low-fee stablecoin rail. This is always a manual, human-triggered action (never automatic), and every payout is recorded with its network, coin, amount, transaction hash, and outcome for audit purposes.

### 7.4 Withdrawal fees

Users pay a transparent fee on withdrawal — a flat per-network cost (covering typical network/bridge gas) plus a small percentage of the amount, shown to the user before they confirm. Ethereum is intentionally the most expensive rail (mainnet gas costs); Polygon, the L2s, Tron, Solana, and Bitcoin are all considerably cheaper, nudging users toward efficient rails without forcing the choice.

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
| Custodial deposits (EVM) | `DEPOSIT_HD_MNEMONIC`, `DEPOSIT_TREASURY_ADDRESS`, `DEPOSIT_GAS_PRIVATE_KEY`, per-chain `DEPOSIT_RPC_*`, `WITHDRAWAL_HOT_WALLET_PRIVATE_KEY` |
| Tron | `TRON_RPC_URL`, `TRONGRID_API_KEY`, `TRON_TREASURY_ADDRESS`, `TRON_GAS_PRIVATE_KEY`, `TRON_HOT_WALLET_PRIVATE_KEY` |
| Solana | `SOLANA_RPC_URL`, `SOLANA_TREASURY_ADDRESS`, `SOLANA_GAS_PRIVATE_KEY`, `SOLANA_HOT_WALLET_PRIVATE_KEY` |
| Bitcoin | `BITCOIN_API_BASE` (optional), `BITCOIN_TREASURY_ADDRESS`, `BITCOIN_HOT_WALLET_PRIVATE_KEY` |
| Client payout | `TREASURY_PRIVATE_KEY`, `CLIENT_TRON_ADDRESS` |
| Pricing | `PRICE_API_KEY` (optional — CoinGecko) |
| Operations | `CRON_SECRET`, `SENTRY_DSN` / `SENTRY_ORG` / `SENTRY_PROJECT` |

**Available scripts:** `dev` (local development), `build` (production build), `start` (run production), `lint`, `test` / `test:unit` / `test:e2e` (automated tests), `db:push` (apply database schema and register scheduled jobs).

Each network above stays **inactive** until its environment variables are supplied — nothing runs or shows to users until configured, and hot wallets must be funded with both payout liquidity and native gas on each chain they operate on before real withdrawals will succeed.

---

## 10. Quality & Testing

- **Type safety** enforced project-wide with TypeScript.
- **Linting** for code consistency.
- **Unit and end-to-end (E2E) test** suites are configured.
- **Error monitoring** in production through Sentry.
- Every deposit/withdrawal/treasury code path has been typechecked, linted, and exercised against a running instance of the app and a real database connection. Live blockchain behavior (actual transfers, actual bridge execution) still requires a funded dry-run per network before production use — see §11.

---

## 11. Current Status

The platform is **functional and feature-complete** across the areas described above:

- ✅ Public trading experience, markets, portfolio, leaderboard, watchlist.
- ✅ Wallet connection and **custodial deposits/withdrawals across 12 networks** (see §7.2).
- ✅ Single unified balance — deposit any supported coin, withdraw as any other.
- ✅ **Client treasury payout** to Tron (TRC-20 USDT), admin-triggered.
- ✅ **Peer-to-Peer** private rooms.
- ✅ **Atlas** interactive 3D globe (photorealistic, with category hotspots and arcs).
- ✅ Full **admin back-office** with all sections.
- ✅ **Role-Based Access Control** — staff restricted to their assigned sections; only super-admins assign roles.
- ✅ Internationalization and theming.

---

## 12. Recommended Next Steps / Notes for Stakeholders

1. **Funded dry-run required before production use.** Every new network (Tron, Solana, Bitcoin, and the cross-chain bridge paths) has been built, typechecked, and exercised against the running app and database, but has not been exercised against live blockchain infrastructure or real funds — none of that is available outside a funded environment. Test each network with a small real deposit and withdrawal before onboarding real users to it.
2. **Remaining coins/networks on hold:** XRP, Cardano, Polkadot, Monero, Zcash, Stellar, Litecoin, Bitcoin Cash. Prioritize and schedule if/when needed.
3. **Unverified token addresses intentionally omitted:** USDC on Ronin and Hyperliquid, and USDT on Base, were left out because no verified contract address was available — adding a wrong token address risks losing user funds. Supply a verified address to enable these.
4. **Admin section guards:** Continue applying the section-level URL guard across all remaining admin sections for defense-in-depth (sidebar filtering is already in place).
5. **Treasury consolidation:** the client payout currently bridges directly from whichever chain a treasury balance sits on. Automatic conversion of miscellaneous leftover balances (e.g., small amounts of a coin not commonly used) into the payout asset before bridging is not yet built — can be added if needed.

---

*This document is a functional and technical overview intended for project and client review. For implementation-level detail (database schema, API contracts, deployment runbook), a separate engineering appendix can be provided on request.*
