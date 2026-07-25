# Custodial Deposits, Withdrawals & Treasury Payout — Architecture

Status: design locked, phased build in progress.

## 1. Model in one paragraph

Every deposit, in any supported coin on any supported network, is converted to a
single internal settlement asset ("Token A"). A user's balance is therefore one
number denominated in Token A. Trading uses Token A directly. When a user
withdraws, they may request **any** supported coin on **any** supported network;
the system swaps/bridges Token A into the requested asset and pays it out, minus
a withdrawal fee charged to the user. Separately, the platform operator ("the
client") sweeps all deposits into a treasury and pays himself out as **TRC-20
USDT** on Tron, converting/bridging from Token A automatically.

## 2. Decisions (locked)

### Token A (internal settlement asset)
**USDC on Polygon.**
Reasons: it is already the trading collateral (the omnibus CLOB settles in
USDC on Polygon), Polygon gas is cheap, and USDC has the deepest swap/bridge
liquidity. Keeping Token A = trading collateral means the ledger, trading, and
custody all reconcile in one currency.

Consequence: the previous per-coin balances (POL, ETH, LINK, …) collapse into a
single USDC balance. A deposit of, e.g., ETH on Arbitrum credits the user's USDC
balance at the ETH/USD rate at deposit time. This is why "deposited ETH on
Arbitrum → can withdraw any supported token" works: the balance is just USDC.

### Networks
Currently live (EVM): Ethereum, Polygon, BNB Chain, Avalanche, Arbitrum, Base,
Optimism.

Adding now:
- **Ronin** (EVM) — native RON
- **Hyperliquid / HyperEVM** (EVM) — native HYPE
- **TRON** (non-EVM) — TRX + TRC-20 USDT/USDC; also the client payout rail
- **Solana** (non-EVM) — SOL + SPL USDC/USDT
- **Bitcoin** (non-EVM, UTXO)

**Correction (verified against the live LI.FI API, see §7a):** Litecoin and
Bitcoin Cash are **not supported by LI.FI**. Per the rule "no bridge support,
no reason to carry the token," they are **dropped** from the plan — only
Bitcoin is built in the UTXO phase. If LTC/BCH are wanted later, they need a
separate bridge vendor, not LI.FI.

Deferred (hardest / lowest priority): XRP, Stellar, Cardano, Polkadot, and the
privacy chains Monero and Zcash.

## 3. Deposit flow (convert to Token A)

1. Detect the incoming deposit (existing EVM log/native scanners; new
   per-chain scanners for Tron/Solana/UTXO chains).
2. Price the deposited coin in USD via the price service. Stablecoins are 1:1.
3. Credit the user's ledger balance in USDC (Token A) at that price.
4. Sweep the on-chain asset into the treasury (existing EVM sweepers; new
   per-chain sweepers). Treasury holdings are later converted to USDC on
   Polygon (the hub) so the treasury is mostly Token A.

## 4. Withdrawal flow (Token A → requested asset, user pays fees)

**No admin approval step.** A user's withdrawal request is fully automated end
to end — `custodial-withdrawal.ts` validates and debits the ledger
immediately, and the `/api/sync/withdrawals` cron (`withdrawal-processor.ts`)
picks it up and sends the payout on its own, with no human in the loop. The
admin Finance dashboard's "Approve/Reject" controls only act on the separate
`finance_transactions` display/audit rows (manual admin-created entries) —
they are **not** wired to the real `withdrawals` table and do not gate,
delay, or otherwise touch actual user withdrawal payouts.

1. User picks a coin + network from the full supported list and an amount.
2. Quote the fee (section 6). Show "You send X, you receive X − fee".
3. Debit the user's USDC balance for the full amount.
4. Fulfilment (automatic, cron-driven, no admin action required):
   - If the payout asset/network already has treasury liquidity, send directly.
   - Otherwise swap/bridge Token A (USDC on Polygon) → requested asset on the
     requested network, then send.
5. On a confirmed failure, refund the user's balance. If a payout's outcome is
   uncertain (e.g. the send succeeded but confirmation couldn't be verified),
   it is left `processing` and flagged for manual admin reconciliation instead
   of being auto-refunded — see `withdrawal-processor.ts`'s
   `UncertainPayoutError` handling.

The fee is deducted from the payout: withdraw $100 with a $5 combined fee →
user receives $95 of the requested asset.

## 5. Client treasury payout (Option 2 — automated, admin-triggered)

1. Enumerate treasury balances across all chains.
2. Swap any non-USDC/USDT to USDC on each chain (LI.FI).
3. Consolidate to USDC on the hub chain (Polygon).
4. Bridge USDC → **TRC-20 USDT** on Tron to the client's Tron address.
5. Record the payout; retry/alert on bridge failure.

Triggered from the admin panel (a human presses "Pay out"), never silent.

**Correction:** originally planned via a separate bridge vendor (Symbiosis or
Allbridge) because Tron was assumed unsupported by LI.FI. Verified against the
live LI.FI API (§7a) that **Tron is directly supported**, so this reuses the
same LI.FI bridge path built in Phase 3 — no new bridge vendor needed.

## 6. User withdrawal fee schedule (proposed)

Fee = **flat network fee + 0.3% of amount**. The flat part covers destination
gas + bridge; the 0.3% covers swap/bridge percentage and slippage on larger
amounts. Values in USD, tunable in config.

| Destination network | Flat fee | + % | Min withdrawal |
|---|---|---|---|
| Ethereum | $12.00 | 0.3% | $40 |
| Polygon | $1.00 | 0.3% | $5 |
| BNB Chain | $1.00 | 0.3% | $5 |
| Avalanche | $1.00 | 0.3% | $5 |
| Arbitrum | $1.00 | 0.3% | $5 |
| Base | $1.00 | 0.3% | $5 |
| Optimism | $1.00 | 0.3% | $5 |
| TRON (TRC-20) | $2.00 | 0.3% | $10 |
| Solana | $1.00 | 0.3% | $5 |
| Ronin | $3.50 | 0.3% | $15 |
| Hyperliquid | $3.50 | 0.3% | $15 |
| Bitcoin | $3.00 | 0.3% | $15 |

Notes: Ethereum is deliberately the most expensive (gas). Users are nudged
toward cheap rails (Tron, L2s, Solana). Minimums stop the fee from exceeding a
tiny withdrawal.

## 7. External dependencies required (per phase)

- Price service: CoinGecko (spot USD prices). Env: `PRICE_API_KEY`.
- On-chain swaps + all bridging (EVM↔EVM, EVM↔Tron, EVM↔Solana, EVM↔Bitcoin):
  **LI.FI**, already integrated. No second bridge vendor needed (see §7a).
- Tron: TronGrid node + `TRON_HOT_WALLET_PRIVATE_KEY` (payouts + TRX for energy).
- Solana: RPC (Helius/QuickNode) + HD keypair derivation.
- Bitcoin: full node or a block-explorer API (mempool.space/BlockCypher) + xpub
  derivation.
- Treasury becomes a server-controlled hot wallet: `TREASURY_PRIVATE_KEY`.

## 7a. LI.FI coverage — verified against the live API

An earlier draft of this document assumed LI.FI did not support Ronin,
HyperEVM, or Tron, and planned a second bridge vendor for the Tron leg. That
assumption was wrong and was corrected by querying LI.FI's `getChains()`
directly (all chain types: EVM, SVM, TVM, UTXO, MVM). Confirmed live-supported:
Ethereum, Polygon, BSC, Avalanche, Arbitrum, Base, Optimism, **Ronin**,
**HyperEVM**, **Tron**, **Solana**, **Bitcoin**. Confirmed **not** supported:
Litecoin, Bitcoin Cash (dropped from the plan, §2).

## 8. Build phases

1. **Ledger → single USDC balance** + price service + fee module. **[DONE]**
   - `src/lib/pricing.ts` — USD prices (stablecoins 1:1, CoinGecko for the rest,
     60s cache, fail-safe).
   - `src/lib/withdrawal-fees.ts` — per-network flat fee + 0.3%, minimums.
   - Deposits now credit **USDC value** (price × amount); the original coin is
     kept in the deposit record + ledger metadata.
   - Withdrawals take a **USD amount**, apply the fee, debit USDC, and record the
     payout coin amount; refunds are in USDC. Migration
     `2026_07_03_001_withdrawal_usd_amount.sql` adds `usd_amount`/`fee_usd`.
2. **Add Ronin + Hyperliquid** deposits/withdrawals (EVM config). **[DONE]**
   - Native RON and HYPE only (no verified stablecoin contract yet on either
     chain — added the moment a vetted address is provided).
3. **Withdrawal swap/bridge fulfilment** on EVM networks (LI.FI). **[DONE]**
   - `withdrawal-processor.ts` now checks the hot wallet's live balance of the
     requested coin on the destination chain. If sufficient, it sends directly
     (cheap, fast — unchanged from before). If not, it bridges from the hot
     wallet's **USDC on Polygon (Token A)** via LI.FI straight to the user's
     address on the destination chain.
   - Requires the withdrawal hot wallet to hold **USDC + POL gas on Polygon**
     in addition to funds on each destination chain, so the bridge leg always
     has a source to draw from.
   - Known limitation: the payout is marked `completed` once the source
     (Polygon) transaction confirms; bridge delivery to the destination chain
     happens asynchronously afterward (typically minutes). (Correction: Ronin
     and HyperEVM bridge support was later verified live via LI.FI's own API —
     see §7a — both are supported, contrary to what this section originally
     assumed.)
4. **Tron**: payout rail + TRC-20 USDT deposits/withdrawals. **[DONE]**
   - `src/lib/tron.ts` — Tron account derivation from the same
     `DEPOSIT_HD_MNEMONIC` via Tron's own BIP44 path (`m/44'/195'/0'/0/{index}`,
     coin type 195, cryptographically independent from the EVM path at the
     same index). Native TRX + TRC-20 USDT only (canonical USDT contract
     `TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t`); USDC on Tron intentionally not
     added — no verified contract address yet.
   - `tron-detection.ts` — per-address polling against TronGrid's REST API
     (native TRX + TRC-20 transfer history), since Tron has no EVM-style
     multi-address log filter.
   - `tron-sweeper.ts` — sweeps TRC-20 USDT (topping up a little TRX first if
     needed for the transfer's energy/bandwidth fee) and native TRX to the
     Tron treasury address.
   - `tron-withdrawal.ts` + `withdrawal-processor.ts` — direct send from the
     Tron hot wallet if it holds enough; otherwise bridges from Polygon USDC
     via the same LI.FI path (Tron chain ID `728126428`, verified live).
   - New env: `TRON_RPC_URL`, `TRONGRID_API_KEY`, `TRON_TREASURY_ADDRESS`,
     `TRON_GAS_PRIVATE_KEY`, `TRON_HOT_WALLET_PRIVATE_KEY`. New crons
     `sync-tron-deposits` (1 min), `sync-tron-sweeps` (5 min).
5. **Solana** deposits/withdrawals + bridge. **[DONE]**
   - `src/lib/solana.ts` — ed25519 keypair derivation via SLIP-0010
     (`m/44'/501'/{index}'/0'`) from the shared mnemonic. Native SOL + SPL
     USDC/USDT (canonical mints, same confidence tier as Tron's USDT).
   - `solana-detection.ts` — per-address signature polling
     (`getSignaturesForAddress` + `getParsedTransaction`), diffing
     pre/post balances (native lamports or SPL token account balances) to
     detect deposits; bounded backward pagination per run.
   - `solana-sweeper.ts` — sweeps native SOL (reserving rent-exemption) and
     SPL tokens (gas wallet pays the transfer fee and creates the treasury's
     associated token account if needed, so deposit accounts never need a SOL
     top-up for token sweeps).
   - `solana-withdrawal.ts` + `withdrawal-processor.ts` — direct send if the
     hot wallet holds enough; otherwise bridges from Polygon USDC via LI.FI
     (Solana chain ID `1151111081099710`; native-SOL placeholder address
     `11111111111111111111111111111111`, taken directly from LI.FI's own SDK
     source, not guessed).
   - New env: `SOLANA_RPC_URL`, `SOLANA_TREASURY_ADDRESS`,
     `SOLANA_GAS_PRIVATE_KEY` (base58 secret key),
     `SOLANA_HOT_WALLET_PRIVATE_KEY` (base58 secret key, independently funded —
     not derived from the shared mnemonic). New crons `sync-solana-deposits`
     (1 min), `sync-solana-sweeps` (5 min).
6. **Bitcoin** (UTXO) deposits/withdrawals. **[DONE]** (Litecoin/Bitcoin Cash
   dropped — not supported by LI.FI, §2.)
   - `src/lib/bitcoin.ts` — native segwit (bech32) address derivation via BIP84
     (`m/84'/0'/0'/0/{index}`) from the shared mnemonic, using
     `@scure/bip32` + `ecpair` + `@bitcoinerlab/secp256k1`. No Bitcoin node
     required — uses the public mempool.space Esplora-compatible API
     (configurable via `BITCOIN_API_BASE`).
   - `bitcoin-detection.ts` — per-address transaction history polling,
     requiring `BITCOIN_MIN_CONFIRMATIONS` (2) before crediting, bounded
     backward pagination per run.
   - `bitcoin-tx.ts` / `bitcoin-sweeper.ts` — builds and signs PSBTs (native
     segwit inputs/outputs), estimates fees from mempool.space's recommended
     fee-rate endpoint, sweeps confirmed UTXOs to the treasury.
   - `bitcoin-withdrawal.ts` + `withdrawal-processor.ts` — direct send from a
     **separate, independently funded** WIF-format hot wallet key if it holds
     enough; otherwise bridges from Polygon USDC via LI.FI (Bitcoin chain ID
     `20000000000001`). Important: the withdrawal hot wallet is intentionally
     **not** derived from the shared `DEPOSIT_HD_MNEMONIC` — an earlier draft
     of this code did that by mistake, which would have collided with a real
     customer's deposit address at the same index; caught and fixed before
     shipping.
   - New env: `BITCOIN_API_BASE` (optional), `BITCOIN_TREASURY_ADDRESS`,
     `BITCOIN_HOT_WALLET_PRIVATE_KEY` (WIF format). New crons
     `sync-bitcoin-deposits` (2 min), `sync-bitcoin-sweeps` (10 min).
7. **Admin treasury payout** UI + orchestration. **[DONE]**
   - `src/lib/treasury-payout.ts` — reads the treasury's native + token
     balances across every enabled EVM chain, and bridges a chosen
     (network, coin, amount) directly to **TRC-20 USDT** on the client's Tron
     address via the same LI.FI path used elsewhere. Bridges directly from
     whichever chain the balance actually sits on — does not require a
     separate "consolidate to Polygon first" step, since LI.FI can bridge
     EVM → Tron from any of the supported source chains in one hop.
   - New table `treasury_payouts` (migration
     `2026_07_07_001_treasury_payouts.sql`) audits every attempt
     (network/coin/amount/tx hash/status/error/triggered-by).
   - Admin UI: Finance → Treasury tab → "Pay Out to Client" card, gated by the
     existing `finance` admin-section permission (`getAdminAccess()` +
     `canAccessSection`), showing live balances and recent payout history.
     Nothing runs automatically — always a human pressing the button.
   - New env: `TREASURY_PRIVATE_KEY` (turns the existing deposit-treasury
     address into a signing hot wallet), `CLIENT_TRON_ADDRESS`.
   - Scope note: this pass does not build automatic non-USDC/USDT →
     USDC swapping per chain before the bridge (e.g. leftover ETH sitting in
     the treasury). The admin can select any coin the treasury holds and
     bridge it directly; if you want it auto-converted first, that is a
     follow-up, not yet built.

## 9. Verification status and what still needs real infrastructure

Every phase above passes a full-repo TypeScript typecheck and ESLint with
**zero errors** introduced by this work. That confirms the code is internally
consistent and correctly typed — it does **not** confirm it behaves correctly
against live infrastructure, because none of Tron/Solana/Bitcoin/the bridge
paths can be exercised without real RPC endpoints, funded wallets, and a live
LI.FI environment, none of which are available in this environment.

A full manual re-review (every new/changed file read line by line, not just
typechecked) found and fixed **six additional real issues** beyond the two
caught during the initial build:

1. Tron native-deposit detection only inspected the first instruction
   (`raw_data.contract[0]`) of a transaction — a bundled multi-instruction
   transfer targeting our address at any other position would have been
   silently missed entirely. Fixed to iterate all instructions.
2. Tron TRC-20 detection used a single fixed `log_index` sentinel per coin —
   two transfers to the same address in the same transaction would collide on
   the `(tx_hash, log_index)` unique constraint and the second would be
   silently dropped. Fixed to offset by position within the batch. (A narrow
   residual risk remains: two *different* addresses each receiving their
   first-ever transfer in the same shared transaction, at the same position in
   their own address-scoped query, could still collide — not fixable without
   a genuine per-transfer event index from TronGrid, which needs live
   verification.)
3. The Tron sweeper topped up TRX for gas and then immediately attempted the
   TRC-20 transfer without waiting for the top-up to confirm (~3s Tron block
   time) — would have failed most of the time in practice. Fixed with a
   confirmation-polling wait.
4. Native SOL withdrawals compared the hot wallet's raw balance against the
   requested amount without reserving room for the transaction fee (paid on
   top of the transferred amount, not deducted from it) — a withdrawal very
   close to the exact hot wallet balance would attempt a direct send and fail
   at broadcast. Fails safe (auto-refund) but incorrectly rejects a legitimate
   withdrawal. Fixed with a fee reserve in the balance check.
5. The same class of gap existed for Tron native TRX and Bitcoin withdrawals
   (fee-aware logic for Bitcoin existed one level deeper, inside PSBT
   construction, but wasn't used for the outer direct-send-vs-bridge decision).
   Fixed with the same reserve pattern for both.
6. `treasury-payout.ts` assumed `TREASURY_PRIVATE_KEY`'s derived address
   matches `DEPOSIT_TREASURY_ADDRESS` (documented in `.env`, never verified at
   runtime). A misconfigured key would silently read/bridge funds from the
   wrong wallet with no warning. Fixed with a startup check that refuses to
   proceed on a mismatch.

Also removed dead code: `litecoin`/`bitcoin-cash` entries lingering in the fee
schedule and price-ID map from before those two were dropped from the plan —
unreachable, but misleading to leave in.

This density of real findings from static review alone (not live testing) is
a strong signal that **a dry-run on testnet/low-value mainnet transactions is
required before any of Tron, Solana, or Bitcoin go live with real customer
funds** — static review and typechecking catch a lot, but cannot substitute
for exercising the actual RPC/broadcast paths.

## 10. Runtime verification pass (dev server + real database)

Beyond typecheck/lint, this system was actually run:

- **Dependency audit:** `@solana/web3.js`, `bitcoinjs-lib`, `@bitcoinerlab/secp256k1`,
  `@scure/bip32`, `@scure/bip39`, and `bs58` were being imported directly by
  this code but only existed as *transitive* dependencies of `@lifi/sdk` — not
  declared in `package.json`. If LI.FI ever drops or changes one of them, this
  code would have broken with a confusing error unrelated to any intentional
  change. Fixed by installing and pinning all six as direct dependencies at
  their currently-resolved versions.
- **`PRICE_API_KEY`** was referenced in `pricing.ts` but missing from `.env`
  entirely (optional, but undocumented). Added.
- **Migrations had never been applied** to the actual database — only the
  `.sql` files existed. Ran `db:push`; both new migrations applied cleanly
  (`withdrawal_usd_amount`, `treasury_payouts`), and all 14 cron jobs
  (including the 6 new Tron/Solana/Bitcoin ones) were created successfully in
  Supabase's scheduler.
- **Started the dev server and hit every new endpoint for real** (not just
  typechecked): `/api/sync/{tron,solana,bitcoin}-{deposits,sweeps}` all
  returned `200` with the expected "not configured yet" / "0 processed"
  bodies — confirming every new module (tronweb, @solana/web3.js,
  @solana/spl-token, bitcoinjs-lib, ecpair, ed25519-hd-key, etc.) actually
  resolves and imports at runtime, not just at typecheck time. Also confirmed
  `/api/sync/withdrawals` now runs clean post-migration (it previously failed
  with a missing-column error before the migration was applied).
- **Pre-existing issue found (predates this session, Phase 2) and now fixed:**
  the Polygon deposit config's `POLYGON_USDT` address is a single mainnet-only
  constant, while `COLLATERAL_TOKEN_ADDRESS` (USDC) correctly switches between
  testnet/mainnet based on `IS_TEST_MODE`. In test mode (`DEFAULT_NETWORK_KEY =
  'amoy'`, this repo's local dev setting) this caused Polygon USDT
  detection/sweep to fail with a zero-data RPC error — querying a mainnet USDT
  contract against the Amoy testnet RPC. No verified Amoy testnet USDT contract
  address exists to substitute in (same discipline as every other address in
  this system: never guess one), so the fix **omits USDT from Polygon's token
  list in test mode** rather than query a wrong contract — USDC still works in
  test mode as before. USDT returns automatically in production
  (`DEFAULT_NETWORK_KEY = 'polygon'`), where `POLYGON_USDT` is the correct
  mainnet address.

## 11. Bitcoin/Solana treasury payout automation **[DONE]**

Section 7/9 previously left Bitcoin and Solana treasury payouts as a manual
step, on the assumption that automating them required LI.FI's `UTXO`/`Solana`
execution providers, which in turn need `@bigmi/core`/`@solana/wallet-adapter-base`
wallet-extension-style RPC infrastructure — not something to hand-roll blind
for code that moves real custodial funds.

Reading the actual (non-typedef) LI.FI executor source
(`node_modules/@lifi/sdk/src/_esm/core/{UTXO,Solana}/*StepExecutor.js`) showed
the execution model is simpler than the typings suggested, and matches the
pattern `treasury-payout.ts` already uses for EVM chains (call `getQuote`,
manually sign `transactionRequest`, send it — bypassing LI.FI's own
provider/executor abstraction entirely):

- **Bitcoin**: `transactionRequest.data` for a Bitcoin-source quote is a raw
  PSBT hex. Broadcasting goes through LI.FI's own public client in the
  executor, but since we don't use their executor, `signAndBroadcastBitcoinPsbt`
  (`bitcoin-withdrawal.ts`) parses the PSBT with `bitcoinjs-lib`, signs all
  inputs with the treasury key (`psbt.signAllInputs` — the same call already
  used and proven in `bitcoin-tx.ts`'s sweep/withdrawal signing), finalizes,
  and broadcasts via the existing mempool.space `broadcastTx` esplora
  endpoint. No new dependency, no wallet-extension emulation.
- **Solana**: `transactionRequest.data` for a Solana-source quote is a
  base64-encoded `VersionedTransaction`. `signAndSendSolanaTransaction`
  (`solana-withdrawal.ts`) deserializes it, signs with the treasury
  `Keypair` (`@solana/web3.js`, already a direct dependency), and sends +
  confirms via the existing `getSolanaConnection()`. No wallet-adapter
  package needed.
- `runTreasuryPayout('bitcoin' | 'solana', ...)` in `treasury-payout.ts` now
  quotes and executes real bridges to `CLIENT_TRON_ADDRESS` instead of
  throwing. `planTreasuryConsolidation()`'s `isAutomatable` check was widened
  to include both chains, so "Consolidate All" now sweeps BTC/SOL treasury
  balances to the client too — only stray Tron TRX (no swap integration) is
  still flagged for manual handling.
- New env: `BITCOIN_TREASURY_PRIVATE_KEY` (WIF format, must derive
  `BITCOIN_TREASURY_ADDRESS`), `SOLANA_TREASURY_PRIVATE_KEY` (base58 secret
  key, must derive `SOLANA_TREASURY_ADDRESS`) — same "refuse to move funds
  from an unexpected wallet" startup check already used for
  `TREASURY_PRIVATE_KEY`/`TRON_TREASURY_PRIVATE_KEY`.
- **Not verified against live infrastructure**: same caveat as §9 — this
  passed a full typecheck, lint, and the existing unit-test suite (all
  pre-existing, unrelated failures only — none in any file touched here), but
  the actual PSBT-signing and VersionedTransaction-signing paths have not been
  exercised against a real LI.FI quote or broadcast to either network, because
  no funded testnet/mainnet treasury wallet or live LI.FI quote is available in
  this environment. **Do a single small real payout on each of Bitcoin and
  Solana before relying on "Consolidate All" for meaningful amounts.**
  (Update: §12 below closes part of this gap — the same key-loading/address-
  derivation code the payout paths depend on is now confirmed live-working,
  just not a full signed-and-broadcast bridge transaction.)

## 12. Making this environment's config match what was actually claimed

A client status update said Bitcoin/Solana/Tron were "working end-to-end on
testnet." Checking this environment's actual `.env` against that claim turned
up two categories of gap, now closed:

**A. Nothing was configured at all.** `TRON_RPC_URL`, `SOLANA_RPC_URL`,
`BITCOIN_API_BASE`, and every hot-wallet/gas/treasury private key for all
three chains were empty — `isTronConfigured()` / `isSolanaConfigured()` /
`isBitcoinConfigured()` all returned `false` in this deployment. The claim was
wrong for *this* environment; the code was done, nothing was switched on.
Fixed by generating fresh keypairs (Bitcoin testnet WIF, Solana devnet
base58, Tron Nile hex — see below) and pointing the three RPC vars at public
testnet endpoints (Nile TronGrid, Solana devnet, mempool.space testnet).
**Not funded yet** — these are freshly generated wallets with zero balance;
see the faucet instructions given to the user alongside this change.

**B. Two real code gaps, found while trying to actually turn test mode on:**

1. **Bitcoin had no testnet mode at all.** `bitcoin.ts`, `bitcoin-tx.ts`,
   `bitcoin-withdrawal.ts`, and `address-validation.ts` all hardcoded
   `networks.bitcoin` (mainnet address format) regardless of `IS_TEST_MODE`.
   Generating a "testnet" Bitcoin wallet under the old code would have
   silently produced a real mainnet address — a genuine money-safety issue,
   not just a missing test feature. Fixed: added `BITCOIN_JS_NETWORK` in
   `bitcoin.ts` (testnet when `IS_TEST_MODE`, mainnet otherwise, mirroring the
   amoy/polygon split already used for EVM chains) and switched every call
   site to use it. `bitcoinApiBase()` now also defaults to
   `mempool.space/testnet/api` in test mode instead of always mainnet.
   `address-validation.ts` deliberately keeps validating client-supplied
   withdrawal addresses against mainnet format regardless of mode, since users
   withdraw to their own real-world (mainnet) wallets — that check is
   validating *someone else's* address, not deriving one of ours.
2. **Tron's TRC-20 USDT contract and Solana's USDC/USDT mints were hardcoded
   to mainnet addresses**, same class of bug already caught and fixed for
   Polygon USDT (§10) but never applied here. Researched rather than guessed:
   Circle's own docs confirm an official Solana **devnet USDC** mint
   (`4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU`) — now used in test mode.
   No first-party-confirmed Nile testnet USDT contract or Solana devnet USDT
   mint exists (Tether doesn't publish either) — both are **omitted from test
   mode** (`TRON_COINS`, `SOLANA_COINS` in `tron.ts`/`solana.ts`) rather than
   guessed, same precedent as Polygon. Native TRX and native SOL are
   unaffected. This gating flows through `getNetworkCoins()` /
   `isCoinSupportedOnNetwork()` in `deposit-chains.ts`, which every deposit,
   withdrawal, and treasury-payout request is validated against — so a
   test-mode request for Tron/Solana USDT is now rejected up front instead of
   querying a wrong or nonexistent contract.

**Also found and fixed, unrelated to the above but discovered while testing:**

3. `address-validation.ts` imported `BITCOIN_NETWORK`/`SOLANA_NETWORK`/
   `TRON_NETWORK` from `bitcoin.ts`/`solana.ts`/`tron.ts` — all three marked
   `'server-only'` — while itself being imported by a client component
   (`CustodialWithdrawForm.tsx`). Inlined the three string constants instead
   of importing them, removing the transitive server-only dependency. A full
   `npm run build` (Turbopack) was run to confirm the client bundle actually
   builds clean either way.
4. `docs/CUSTODIAL_ARCHITECTURE.md` (this file, in an earlier location) was
   breaking the entire production build: `docs/` is fumadocs' public
   documentation source directory (`defineDocs({ dir: "docs" })`), which
   requires every file to have MDX frontmatter with a `title`. This file had
   none, so `npm run build` failed outright — a build break unrelated to any
   blockchain code, only caught because this session ran a real build for the
   first time. Fixed by moving it to the project root (`CUSTODIAL_ARCHITECTURE.md`),
   next to the pre-existing `PROJECT_DOCUMENTATION.md`, since its candid
   internal-engineering-log tone isn't meant for the public docs site anyway.

**Live-verified in this session** (not just typechecked): started the dev
server, generated the new testnet keys, wired them into `.env`, and hit
`/api/sync/{bitcoin,solana,tron}-{deposits,sweeps}` and
`/api/sync/withdrawals` for real. All six returned `{"success":true}` with
real RPC round-trips to Nile Tron, Solana devnet, and mempool.space testnet —
confirming the hot-wallet/gas keys parse, the RPC endpoints are reachable, and
address derivation resolves correctly, for real, not just in a type-checker.
(0 processed on every endpoint, as expected — no deposit addresses have been
generated or funded yet.) Also independently verified all three newly
generated treasury keypairs round-trip correctly through this codebase's own
derivation functions (WIF → address, base58 secret → pubkey, hex private key
→ Tron address) before writing them to `.env`.

**Still not verified — genuinely can't be, without the user's action:**

- No deposit/sweep/withdrawal has been exercised with **real funds** on any
  of the three testnets. The generated treasury/hot/gas wallets all have zero
  balance. Faucet links were given to the user; a real end-to-end run (fund →
  deposit → detect → sweep → withdraw) hasn't happened.
- `TREASURY_PRIVATE_KEY` (must match the existing `DEPOSIT_TREASURY_ADDRESS`)
  remains unset — this repo has no way to generate it, since it must match a
  wallet the business already controls. The client's receiving address is no
  longer an env var; it's set from the admin panel (Finance > Treasury >
  Client Payout Address) and is also still unset, since only the client can
  provide it. So EVM treasury payout and the Bitcoin/Solana/Tron
  bridge-payout paths added in §11 are still completely unexercised
  end-to-end.
