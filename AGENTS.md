# Agent Guidelines — NIM Panic

Rules and context for AI agents working on this codebase.

---

## Project overview

NIM Panic is a fast, social prediction game built on the Nimiq blockchain.
Users connect their Nimiq wallet, stake NIM on prediction outcomes, and compete
on leaderboards. The product runs as a web app that also works as a Nimiq Pay
Mini App (embedded in Telegram / the Nimiq Pay mobile app).

Stack: TanStack Start (React SSR) · TypeScript · Tailwind CSS v4 · Supabase ·
Nimiq testnet

---

## Git safety

- Never force-push, rebase, amend, or squash commits that have already been pushed.
- Always push new work to a feature branch. Never push directly to `main`.
- Keep `main` in a working, deployable state at all times.

---

## Code style

- Match the conventions already in use — don't introduce a new pattern when an existing one fits.
- All Nimiq addresses are normalised to spaceless uppercase (`NQ12ABCD…`) before storage or comparison. Use `normalizeAddress()` from `src/lib/nimiq-crypto.server.ts`.
- Server-only files use the `.server.ts` suffix. Never import them from client code.
- TanStack Start server functions live in `src/lib/*.functions.ts`. Keep server logic there, not in route files.

---

## File-based routing

Routes live in `src/routes/`. Do **not** create `src/pages/` or any Next.js / Remix directories.

| File              | URL                                                 |
| ----------------- | --------------------------------------------------- |
| `index.tsx`       | `/`                                                 |
| `about.tsx`       | `/about`                                            |
| `users/index.tsx` | `/users`                                            |
| `users/$id.tsx`   | `/users/:id`                                        |
| `_layout.tsx`     | layout route — renders children via `<Outlet />`    |
| `__root.tsx`      | app shell — wraps every page; preserve `<Outlet />` |

`routeTree.gen.ts` is auto-generated — never edit it by hand.

---

## Nimiq integration

The app uses the Nimiq Pay Mini App SDK as its sole wallet provider:

| Environment          | State           | How it works                                             |
| -------------------- | --------------- | -------------------------------------------------------- |
| Nimiq Pay / Telegram | `"ready"`       | `@nimiq/mini-app-sdk` provider injected by the host      |
| Regular browser      | `"unavailable"` | SDK init times out (3 s); app stays browsable, no wallet |

`src/hooks/useNimiq.ts` — calls `init()` from `@nimiq/mini-app-sdk` with a
3-second timeout. If it resolves, `state` becomes `"ready"`. If it times out or
throws, `state` becomes `"unavailable"`. There is **no Hub API fallback** in
the current implementation — the Hub API package is a dependency but is not
used in source.

Capabilities exposed by the provider:

- `listAccounts()` — returns the user's wallet addresses
- `sign(message)` — signs a string, returns `{ publicKey, signature }` hex strings
- `sendBasicTransactionWithData({ recipient, value, data })` — sends a NIM transaction

`src/hooks/useWallet.tsx` — orchestrates the full connect flow: address
selection → server challenge → sign → Supabase session.

**Staking is signature-based, not a direct transaction.** Players sign a
deterministic message to authorise a prediction entry. The treasury sends
winnings on-chain at settlement time. Do not prompt users to send a transaction
as part of placing a prediction.

**Never invent Nimiq APIs.** Consult the official docs when capability is unclear:

- https://nimiq.dev/mini-apps/
- https://www.nimiq.com/developers/hub/getting-started

---

## Authentication

Wallet-based, two-step:

1. `startWalletAuth` (server fn) — validates the NQ address, stores a single-use
   nonce in `auth_nonces` with a 5-minute expiry, returns a message to sign:
   `"NIM PANIC sign-in\nAddress: {address}\nNonce: {nonce}"`.
2. `completeWalletAuth` (server fn) — derives the NQ address from the public key
   (blake2b-256 → base32 → IBAN checksum), verifies the Ed25519 signature,
   marks the nonce as used, creates or retrieves the Supabase user, and returns
   `{ accessToken, refreshToken, address }`.

Crypto primitives are in `src/lib/nimiq-crypto.server.ts` (server-only).
Never expose private keys. Never store seed phrases.

---

## Prediction entry flow

Understanding this flow is required before touching any entry-related code.

1. `createEntry` — validates the prediction is `OPEN` and past the lock time
   guard, creates a `PENDING_PAYMENT` entry with a unique 10-char `memo`, and
   returns a deterministic message for the wallet to sign:
   ```
   NIM PANIC prediction
   Entry: <uuid>
   Outcome: <key>
   Stake: <nim> NIM
   Nonce: <memo>
   ```
2. `wallet.signPrediction(message)` — signs on the client via the Mini App SDK.
3. `confirmEntry` — reconstructs the exact message, verifies the signature
   against the player's registered address, updates the entry to `CONFIRMED`,
   and increments `participants_count`, `total_staked_nim`, and `outcome_totals`
   on the prediction row.

The nonce (memo) and entry ID in the signed message prevent replay attacks
across different entries or predictions.

**Staking is not an on-chain transfer.** Do not add transaction-sending logic to
the entry flow. The treasury sends NIM to winners only at settlement time.

---

## Security rules

The backend is the authority for everything money-related:

- prediction state and lock times
- winning outcome assignment
- stake validation and transaction verification
- settlement and payout
- leaderboard scores

Never trust client-supplied values for any of the above. Use server-side
validation, idempotency keys, and duplicate-transaction protection throughout.

---

## Environment variables

See `.env.example` for the full list. Key ones:

| Variable                                              | Purpose                                                                                |
| ----------------------------------------------------- | -------------------------------------------------------------------------------------- |
| `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY`          | Server-side Supabase admin client (never expose `SERVICE_ROLE_KEY` to the browser)     |
| `SUPABASE_PUBLISHABLE_KEY`                            | Anon key used by the server-side public Supabase client                                |
| `VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY` | Client-side Supabase (same values as above, prefixed for Vite exposure)                |
| `NIMIQ_RPC_URL`                                       | Testnet RPC endpoint (default: `https://rpc-testnet.nimiqwatch.com`)                   |
| `NIMIQ_RPC_AUTH`                                      | Optional `user:password` for Basic auth on a private RPC node                          |
| `NIM_PANIC_TREASURY_ADDRESS`                          | NQ address that pays out winnings. Without this, settlements queue as `PENDING_PAYOUT` |
| `NIM_PANIC_ADMIN_ADDRESSES`                           | Comma-separated NQ addresses with admin access                                         |

---

## Settlement and scoring

`src/lib/settlement.server.ts` — two functions agents must know:

- `payout({ recipient, amountNim, reference })` — sends NIM from the treasury
  via `sendFromTreasury()`. If the RPC/treasury is not configured, returns
  `PENDING_PAYOUT` rather than throwing.
- `refreshPlayerStats(supabaseAdmin, userId)` — recomputes all profile
  aggregates and upserts the weekly leaderboard row. Call this after any entry
  status change.

**Payout multiplier** (in `src/lib/nim.ts`):

```
multiplier = (totalPool × 0.97) / amountOnWinningOutcome
```

Clamped to `[1.05, 9.99]`. Computed at settlement time from `outcome_totals`.

**Scoring** (applied inside `refreshPlayerStats`):

```
points = wins × 10 + streak × 3 + totalPredictions
```

Streak is the count of consecutive `WON` entries from the most recent backwards.

`src/lib/lifecycle.server.ts` — `syncPredictionStates()` auto-transitions
`OPEN → LOCKED` when `lock_time` passes and expires any `PENDING_PAYMENT`
entries on newly-locked markets. It is called on every feed/prediction read.
Do not bypass it.

---

## What not to build (yet)

- AI-generated predictions
- Decentralized oracles
- Complex betting markets / AMM-style pools
- NFTs, DAOs, or governance
- Chat or complex social networking
- Mainnet payments (testnet only for now)
