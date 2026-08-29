# NIM Panic — Nimiq Prediction Mini App

Predict. Stake NIM. Win. A mobile-first game that runs inside Nimiq Pay, using the real Nimiq Mini App SDK for accounts, message signing and NIM payments, with a Lovable Cloud backend as the authority for state, verification and settlement.

## What the docs actually allow (verified today)

The injected Nimiq provider (`init()` from `@nimiq/mini-app-sdk`) gives exactly:
`listAccounts()`, `sign(message)` → `{ publicKey, signature }`, `isConsensusEstablished()`, `getBlockNumber()`, `sendBasicTransaction()`, `sendBasicTransactionWithData()` (amounts in Luna, 1 NIM = 100,000 Luna) plus staking calls. It returns a tx hash — nothing else.

Consequences baked into this plan:
- There is **no balance method**. Balance is read server-side from a Nimiq RPC node and labelled as on-chain balance; if the node is unreachable the balance area shows "unavailable" instead of a fake number.
- Stakes are paid with `sendBasicTransactionWithData()`, with a short memo (`NP:<entryRef>`) so the backend can match the payment to one entry.
- Auth uses the nonce → `sign()` → server-side verify flow.

## Configuration (env-driven, testnet default)

`NIMIQ_NETWORK` (default `test`), `NIMIQ_RPC_URL_TEST`, `NIMIQ_RPC_URL_MAIN`, optional `NIMIQ_RPC_AUTH`, `NIM_PANIC_TREASURY_ADDRESS` (placeholder NQ address until you supply the real one), `NIM_PANIC_ADMIN_ADDRESSES` (empty for now; admin route stays locked until set). All read server-side only.

## Screens (mobile-first, bottom nav: Home / My Picks / Leaderboard / Profile)

1. **Home** — NIM PANIC header, wallet chip + NIM balance, LIVE NOW and ENDING SOON prediction cards (question, category, countdown, participants, NIM staked, outcome pills), streak badge, daily challenge strip.
2. **Prediction detail** `/p/$id` — countdown, outcome buttons with live odds/potential payout, stake input with quick chips (5/10/25 NIM), big PREDICT CTA, chaotic crowd hint ("72% picking YES"), share button. Public route with its own OG meta so shared links preview.
3. **Confirm sheet** — outcome, stake, potential payout, CONFIRM WITH NIM; then transaction status states: preparing → awaiting approval in Nimiq Pay → verifying on-chain → locked. Distinct copy for rejected / provider unavailable / pending / failed / network error, each with retry.
4. **My Picks** — history grouped by state, win/loss result cards (+/- NIM), payout status.
5. **Leaderboard** — weekly, points-based (correct picks + streak bonus + participation), medal styling for top 3.
6. **Profile** — handle, streak, accuracy, predictions, wins, NIM won, wallet address truncated only.
7. **Admin** `/admin` (locked until admin addresses are configured) — create predictions, resolve winning outcome, trigger settlement.

Empty/error states designed for every case in the brief; no blank screens. Deep link `/p/$id` is the share target, WhatsApp is just one prefilled `share:` option via the Web Share API with clipboard fallback.

## Backend (Lovable Cloud)

Tables: `users` (wallet_address, username, streak stats), `auth_nonces`, `predictions`, `prediction_entries`, `settlements`, `leaderboard_stats`, plus `user_roles` + `has_role()` for admin. RLS on everything; public reads limited to open/locked/resolved predictions and aggregate counts; entries readable only by their owner; all writes go through server functions.

Lifecycle enforced in SQL + server functions: `OPEN → LOCKED → RESOLVED → SETTLED`. Lock time is compared against server time only; entries after `lock_time` are rejected.

Server functions (TanStack `createServerFn`):
- `startAuth` / `verifyAuth` — nonce issued server-side, signature + publicKey verified against the claimed address before a session is issued.
- `createEntry` — validates auth, OPEN state, stake bounds, no duplicate entry; returns the expected recipient, Luna amount and memo. Records entry as `PENDING`.
- `confirmEntry` — takes the tx hash, fetches the transaction from the RPC node, and only marks `CONFIRMED` if recipient, value and memo match and the hash is unused (unique index = idempotency). Until then the UI never says "confirmed".
- `resolvePrediction`, `settlePrediction` (admin) — compute pool-based payouts, write `settlements`, update stats and leaderboard.
- Public read functions for feed, detail, leaderboard.

## Settlement (automated, isolated)

Payouts run through a single `settlementDriver` module so it can be swapped:
- `rpc-wallet` driver (your choice): the server calls the configured Nimiq RPC node's `sendTransaction` for each winning entry, so the signing key lives in the node, never in app code and never in the browser. Needs an RPC node with an unlocked treasury wallet — testnet first.
- `manual` fallback: when no payout-capable RPC is configured, settlements are recorded as `PENDING_PAYOUT` with the exact NIM amount and shown to the user as "payout pending" — never as paid.

Every payout row is idempotent (one settlement per entry, tx hash stored), and settlement retries never double-pay.

## Technical notes

- Signature verification: Nimiq signed messages are Ed25519 over the prefixed message hash; verification runs in the Worker with a pure-JS Ed25519 implementation (`@noble/ed25519`) — no native modules. If the prefix format cannot be reproduced byte-for-byte against a real signature, the plan falls back to verifying auth through a first on-chain payment from the address and this is flagged rather than silently weakened.
- All provider calls are browser-only, behind a `useNimiq()` hook that surfaces `unavailable` when the app is opened outside Nimiq Pay (with a clear "Open in Nimiq Pay" state, and a read-only browse mode).
- Demo predictions (Bitcoin $120K, Arsenal, Lagos rainfall, Nimiq users, ETH vs BTC) are seeded in the migration and flagged `is_demo`, shown with a DEMO tag.

## Build order

1. Shell, design system, bottom nav, Nimiq provider hook + wallet connect + auth.
2. Cloud schema, migrations, demo seed, feed + detail.
3. Outcome selection, stake, confirm, payment via provider.
4. Server-side transaction verification and locking.
5. Admin resolve + settlement driver.
6. My Picks, profile, leaderboard.
7. Sharing, deep links, polish, empty/error passes.

## Open items

- Real treasury NQ address (placeholder until then; payments are blocked in mainnet mode without it).
- Admin wallet address.
- RPC URL(s) with a funded treasury wallet for automated payouts.
