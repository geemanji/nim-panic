# NIM Panic

> Predict. Stake NIM. Win.

NIM Panic is a fast, social prediction game built on the Nimiq blockchain.
Connect your Nimiq wallet, stake NIM on live prediction outcomes, and climb the
leaderboard. The experience is designed to feel like a game — not a betting site
or a crypto dashboard.

---

## What it does

- **Live predictions** — time-boxed questions with a countdown. Pick an outcome
  before the clock runs out.
- **Real NIM staking** — stakes go on-chain via your Nimiq wallet. Payouts come
  from the treasury after resolution.
- **Leaderboard & streaks** — weekly rankings based on prediction accuracy and
  performance, not wallet size.
- **Works anywhere** — runs inside Nimiq Pay (Telegram Mini App) and in any
  regular browser via the Nimiq Hub popup.

---

## Tech stack

| Layer             | Choice                                                                 |
| ----------------- | ---------------------------------------------------------------------- |
| Framework         | [TanStack Start](https://tanstack.com/start) (React SSR)               |
| Language          | TypeScript                                                             |
| Styling           | Tailwind CSS v4                                                        |
| Database          | Supabase (PostgreSQL)                                                  |
| Wallet — Mini App | [@nimiq/mini-app-sdk](https://nimiq.dev/mini-apps/)                    |
| Wallet — Web      | [@nimiq/hub-api](https://www.nimiq.com/developers/hub/getting-started) |
| Blockchain        | Nimiq testnet                                                          |
| Deploy target     | Cloudflare Workers (via Nitro)                                         |

---

## Getting started

You need Node.js 20+ and npm.

```sh
git clone <repository-url>
cd nim-panic
npm install
cp .env.example .env   # fill in your Supabase and Nimiq values
npm run dev
```

The dev server starts at `http://localhost:3000`.

---

## Environment variables

Copy `.env.example` to `.env` and fill in:

| Variable                        | Description                                                   |
| ------------------------------- | ------------------------------------------------------------- |
| `SUPABASE_URL`                  | Your Supabase project URL                                     |
| `SUPABASE_SERVICE_ROLE_KEY`     | Service role key (server-only, never exposed to the browser)  |
| `SUPABASE_PUBLISHABLE_KEY`      | Anon/publishable key                                          |
| `VITE_SUPABASE_URL`             | Same as `SUPABASE_URL` (exposed to the client via Vite)       |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Same as `SUPABASE_PUBLISHABLE_KEY`                            |
| `NIMIQ_RPC_URL`                 | Testnet RPC endpoint (defaults to the public nimiqwatch node) |
| `NIM_PANIC_TREASURY_ADDRESS`    | NQ address that collects stakes and sends payouts             |
| `NIM_PANIC_ADMIN_ADDRESSES`     | Comma-separated NQ addresses with admin access                |

---

## Project structure

```
src/
  components/       Shared UI components
  hooks/            React hooks (useWallet, useNimiq, …)
  lib/              Server functions, Nimiq crypto, RPC client, auth logic
  routes/           File-based routes (TanStack Start)
  integrations/     Supabase client setup
```

---

## Wallet connection

The app detects its environment automatically:

- **Inside Nimiq Pay** — uses the injected `@nimiq/mini-app-sdk` provider.
- **Regular browser** — falls back to the `@nimiq/hub-api` popup (Nimiq Safe).

Both paths go through the same server-side challenge/signature auth flow. No
private keys or seed phrases are ever handled by this application.

---

## Core prediction lifecycle

```
OPEN → LOCKED → RESOLVED → SETTLED
```

- **OPEN** — users can enter predictions and stake NIM.
- **LOCKED** — no new entries; prediction is awaiting resolution.
- **RESOLVED** — winning outcome set by an admin.
- **SETTLED** — payouts sent to winners from the treasury wallet.

---

## Building

```sh
npm run build        # production build (outputs to .output/)
npm run preview      # preview the build locally
```

---

## Deploying

The build targets Cloudflare Workers. After `npm run build`:

```sh
npx wrangler deploy --config .output/server/wrangler.json
```

Set your environment variables as Cloudflare Worker secrets before deploying.
