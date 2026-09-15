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

The app supports two wallet backends, selected automatically at runtime:

| Environment          | Backend    | How it works                                        |
| -------------------- | ---------- | --------------------------------------------------- |
| Nimiq Pay / Telegram | `mini-app` | `@nimiq/mini-app-sdk` provider injected by the host |
| Regular browser      | `hub`      | `@nimiq/hub-api` popup to Nimiq Safe                |

`src/hooks/useNimiq.ts` — unified provider hook. Tries mini-app SDK first
(3 s timeout), falls back to Hub API. Always resolves to `"ready"`.

`src/hooks/useWallet.tsx` — orchestrates the full connect flow: address
selection → server challenge → sign → Supabase session.

**Hub API popup rule**: Hub methods (`chooseAddress`, `signMessage`, `checkout`)
must be called synchronously inside a user-action handler. Never place an
`await` before a Hub call or browsers will block the popup.

**Never invent Nimiq APIs.** Consult the official docs when capability is unclear:

- https://nimiq.dev/mini-apps/
- https://www.nimiq.com/developers/hub/getting-started

---

## Authentication

Wallet-based, two-step:

1. `startWalletAuth` (server fn) — issues a single-use nonce tied to the address.
2. `completeWalletAuth` (server fn) — verifies the Ed25519 signature, creates or
   retrieves the Supabase user, returns `{ accessToken, refreshToken }`.

Crypto primitives are in `src/lib/nimiq-crypto.server.ts` (server-only).
Never expose private keys. Never store seed phrases.

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

| Variable                                              | Purpose                                                |
| ----------------------------------------------------- | ------------------------------------------------------ |
| `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY`          | Server-side Supabase admin client                      |
| `VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY` | Client-side Supabase                                   |
| `NIMIQ_RPC_URL`                                       | Testnet RPC endpoint (default: nimiqwatch public node) |
| `NIM_PANIC_TREASURY_ADDRESS`                          | NQ address that receives stakes and pays out winnings  |
| `NIM_PANIC_ADMIN_ADDRESSES`                           | Comma-separated NQ addresses with admin access         |

---

## What not to build (yet)

- AI-generated predictions
- Decentralized oracles
- Complex betting markets / AMM-style pools
- NFTs, DAOs, or governance
- Chat or complex social networking
- Mainnet payments (testnet only for now)
