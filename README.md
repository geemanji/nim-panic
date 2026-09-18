# NIM Panic

> Predict. Stake NIM. Win.

NIM Panic is a fast, social prediction game built on the Nimiq blockchain. Connect a Nimiq wallet, stake NIM on live prediction outcomes, and compete on weekly leaderboards. The app runs in any browser and is purpose-built to run as a Nimiq Pay Mini App inside Telegram.

Built for the Nimiq hackathon. Testnet only.

---

## What it does

Players browse open prediction markets — each one is a time-boxed question with a live countdown. Before the clock runs out, they pick an outcome and commit a NIM stake. Once the market locks, no new entries are accepted. An admin resolves the result, and the treasury wallet pays out winners automatically using a parimutuel multiplier.

**Prediction categories:** Crypto, Sports, Esports, Tech, Culture, World

**Lifecycle of a market:**

```
DRAFT → OPEN → LOCKED → RESOLVED → SETTLED
```

- `OPEN` — entries accepted; stake size is configurable per market (min/max NIM)
- `LOCKED` — clock hit zero, no new picks
- `RESOLVED` — admin sets the winning outcome
- `SETTLED` — payouts sent from the treasury wallet to every winner's address

**Scoring:** winners earn points (`wins × 10 + streak × 3 + predictions`). Streaks, accuracy, and NIM earned are tracked per player. Weekly leaderboards reset every Monday; an all-time board runs in parallel.

---

## How staking works

Staking is signature-based, not a direct on-chain transfer. This keeps the UX fast and works inside a Mini App where raw transaction flows are restricted.

1. Player picks an outcome and a stake amount on `/p/:id`.
2. The server creates a `PENDING_PAYMENT` entry and returns a deterministic message to sign:
   ```
   NIM PANIC prediction
   Entry: <uuid>
   Outcome: <key>
   Stake: <nim> NIM
   Nonce: <10-char memo>
   ```
3. The player's Nimiq wallet signs the message (no transaction sent).
4. The server verifies the Ed25519 signature against the player's registered address, then marks the entry `CONFIRMED`.
5. At settlement, the treasury wallet sends winnings on-chain via JSON-RPC.

The nonce and entry ID in the signed message prevent replay attacks across entries or predictions.

---

## Tech stack

| Layer         | Choice                                                                                                                    |
| ------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Framework     | [TanStack Start](https://tanstack.com/start) 1.168 (React 19 SSR)                                                         |
| Language      | TypeScript 5.8                                                                                                            |
| Styling       | Tailwind CSS v4                                                                                                           |
| Database      | Supabase (PostgreSQL + Auth)                                                                                              |
| Wallet        | [@nimiq/mini-app-sdk](https://nimiq.dev/mini-apps/) 0.1                                                                   |
| Blockchain    | Nimiq testnet (JSON-RPC)                                                                                                  |
| Crypto        | [@noble/ed25519](https://github.com/paulmillr/noble-ed25519) + [@noble/hashes](https://github.com/paulmillr/noble-hashes) |
| Deploy target | Cloudflare Workers via Nitro                                                                                              |

---

## Getting started

You need Node.js 20+ and npm. A Supabase project is required.

```sh
git clone <repository-url>
cd nim-panic
npm install
cp .env.example .env
# fill in .env — see the table below
npm run dev
```

The dev server starts at `http://localhost:3000`.

To apply the database schema, run the migrations against your Supabase project:

```sh
npx supabase db push
# or apply them manually from supabase/migrations/ in the Supabase dashboard
```

---

## Environment variables

| Variable                        | Required | Description                                                                                     |
| ------------------------------- | -------- | ----------------------------------------------------------------------------------------------- |
| `SUPABASE_URL`                  | Yes      | Supabase project URL (server-side)                                                              |
| `SUPABASE_SERVICE_ROLE_KEY`     | Yes      | Service role key — never exposed to the browser                                                 |
| `SUPABASE_PUBLISHABLE_KEY`      | Yes      | Anon key (server-side Supabase public client)                                                   |
| `VITE_SUPABASE_URL`             | Yes      | Same as `SUPABASE_URL`, exposed to the browser via Vite                                         |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Yes      | Same as `SUPABASE_PUBLISHABLE_KEY`, exposed to the browser                                      |
| `NIMIQ_RPC_URL`                 | Optional | Testnet RPC endpoint. Defaults to `https://rpc-testnet.nimiqwatch.com`                          |
| `NIMIQ_RPC_AUTH`                | Optional | `user:password` for Basic auth on a private RPC node                                            |
| `NIM_PANIC_TREASURY_ADDRESS`    | Optional | NQ address that holds stakes and sends payouts. Without this, payouts queue as `PENDING_PAYOUT` |
| `NIM_PANIC_ADMIN_ADDRESSES`     | Optional | Comma-separated NQ addresses with admin privileges                                              |

The app runs without a treasury address — payouts are recorded as pending and can be retried later via the admin console once a treasury is configured.

---

## Project structure

```
src/
  routes/               File-based routes (TanStack Start)
    __root.tsx          App shell — wraps every page
    index.tsx           Home feed with live markets
    p.$id.tsx           Prediction detail + entry/staking flow
    picks.tsx           Signed-in user's prediction history
    leaderboard.tsx     Weekly and all-time leaderboard
    profile.tsx         Player profile and stats
    admin.tsx           Admin console (market management, settlements)
    category.$slug.tsx  Category-filtered feed

  lib/
    game.functions.ts         Public server functions: feed, predictions, entry flow, leaderboard
    auth.functions.ts         Wallet auth: startWalletAuth, completeWalletAuth
    admin.functions.ts        Admin server functions: create, resolve, settle, retry payouts
    faucet.functions.ts       Testnet faucet proxy
    settlement.server.ts      payout() driver and refreshPlayerStats()
    lifecycle.server.ts       Auto-transitions OPEN→LOCKED on every read
    nimiq-rpc.server.ts       Nimiq JSON-RPC client, sendFromTreasury(), getBalanceLuna()
    nimiq-crypto.server.ts    Ed25519 verify, address derivation, normalizeAddress()
    nim.ts                    Client-safe helpers: payoutMultiplier(), formatNim(), types
    categories.ts             Category definitions
    progression.ts            Ranks, XP, Panic Score, game modes

  hooks/
    useNimiq.ts         Nimiq Pay Mini App SDK provider (listAccounts, sign, sendTransaction)
    useWallet.tsx       WalletProvider context — connect, signOut, signPrediction

  components/
    AppShell.tsx        Layout wrapper with nav
    Onboarding.tsx      4-step first-run flow
    PredictionCard.tsx  Market card for the feed
    Countdown.tsx       Live countdown timer
    FaucetButton.tsx    Testnet NIM faucet button
    ui/                 Radix-based component library

  integrations/supabase/
    client.ts           Browser Supabase client (VITE_ keys)
    client.server.ts    Server admin Supabase client (SERVICE_ROLE key)
    auth-middleware.ts  requireSupabaseAuth middleware for server functions

supabase/
  migrations/           7 SQL migration files — full schema, RLS policies, seed data
```

---

## Authentication

Authentication is wallet-based. No passwords for regular users.

**Step 1 — challenge** (`startWalletAuth`):
The server validates the NQ address format, stores a single-use nonce in `auth_nonces` with a 5-minute expiry, and returns a message to sign.

**Step 2 — verify** (`completeWalletAuth`):
The server derives the NQ address from the submitted public key (blake2b-256 → base32 → IBAN checksum). If it matches the claimed address, the signature is verified against the challenge message. On success, a Supabase user is created if one doesn't exist, a profile and `user` role are inserted, and access/refresh tokens are returned.

The signed message format:

```
NIM PANIC sign-in
Address: <NQ address>
Nonce: <uuid>
```

Signature verification handles the multiple byte encodings Nimiq wallets may produce (sha256-prefixed, raw-prefixed, sha256-raw, raw).

---

## Database schema

All tables use Row Level Security. Players can only read their own rows. Predictions and the leaderboard are public.

| Table                | Purpose                                                                                                                          |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `profiles`           | One per user. Wallet address, username, streak, best_streak, predictions_count, wins_count, nim_won, nim_staked, xp, panic_score |
| `user_roles`         | RBAC. Enum: `admin` or `user`                                                                                                    |
| `auth_nonces`        | Single-use sign-in challenges. Service-role only                                                                                 |
| `predictions`        | Markets. Status, outcomes (JSONB), stake bounds, outcome totals, participant count                                               |
| `prediction_entries` | User picks. Links to a prediction, records outcome, stake, memo, and status                                                      |
| `settlements`        | One per entry. Records payout amount, transaction hash, and status                                                               |
| `leaderboard_stats`  | Denormalized weekly and all-time scores. Public                                                                                  |
| `user_preferences`   | Onboarding flag and preferred categories                                                                                         |

Entry status progression: `PENDING_PAYMENT → CONFIRMED → LOCKED → WON | LOST`

Settlement status: `NO_PAYOUT | PENDING_PAYOUT | SENT | FAILED`

---

## Payout mechanics

Payouts use a parimutuel multiplier:

```
multiplier = (totalPool × 0.97) / amountOnWinningOutcome
```

Clamped to `[1.05, 9.99]`. Each winner receives `stake × multiplier` NIM, sent from the treasury wallet via the Nimiq JSON-RPC `sendBasicTransactionWithData` call. The transaction data field contains `NP-WIN:<entry-id-prefix>` for auditability.

If the RPC node or treasury address is not configured, payouts are stored as `PENDING_PAYOUT` and can be retried from the admin console once the treasury is set up.

---

## Admin console

Accessible at `/admin`. Requires a Supabase user with `role = 'admin'` in `user_roles`.

**Market management:**

- Create markets (question, category, outcomes, lock window, resolution window, stake bounds)
- Re-open, lock, and manage market status manually

**Resolution and settlement:**

- Set the winning outcome on a resolved market
- Trigger settlement — computes multipliers, writes settlement rows, fires on-chain payouts, and refreshes all player stats
- Retry failed or pending payouts

**Treasury console:**

- Live treasury balance (via RPC)
- Full payout history grouped by market, with per-winner breakdown including wallet address, stake, payout amount, and transaction hash

---

## Building and deploying

```sh
npm run build        # production build → .output/
npm run preview      # preview locally

# Deploy to Cloudflare Workers
npx wrangler deploy --config .output/server/wrangler.json
```

Set all environment variables as Cloudflare Worker secrets before deploying:

```sh
echo "<value>" | npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY
# repeat for each secret variable
```

---

## Security notes

- The server is the sole authority for prediction state, lock times, stake validation, and payouts. No client-supplied values for these are trusted.
- Private keys and seed phrases are never handled by this application.
- Treasury key material lives on the Nimiq RPC node (unlocked hot wallet). The app sends the payout instruction; it never holds the key.
- `SUPABASE_SERVICE_ROLE_KEY` must stay server-side only. It is never referenced from any `VITE_` variable or client code.
- All NQ addresses are normalised to spaceless uppercase before storage or comparison.

---

## Testnet faucet

Players can request testnet NIM from the in-app faucet button. The server proxies the request to `https://faucet.pos.nimiq-testnet.com/tapit` using the player's verified wallet address from their session — no user input needed.
