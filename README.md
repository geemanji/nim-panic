# Nim Panic Predict

Build NIM Panic — Nimiq Prediction Game Mini App

Build a mobile-first Nimiq Mini App called NIM Panic.

Product

NIM Panic is a fast, social prediction game where users predict outcomes, stake NIM, and compete on leaderboards.

Tagline:
Predict. Stake NIM. Win.

The experience should feel like a game, not a betting website or crypto dashboard.

Core loop:

Prediction → Choose outcome → Stake NIM → Countdown → Result → Win/Lose → Leaderboard

The MVP should be simple, polished, and demo-ready.

---

IMPORTANT: Nimiq Integration

This is a real Nimiq Mini App, not a simulated crypto application.

Use the official Nimiq Mini App SDK and documentation as the source of truth.

Official documentation:

- https://nimiq.dev/mini-apps/
- https://nimiq.dev/mini-apps/tutorials/mini-app-tutorial
- https://nimiq.dev/mini-apps/api-reference/
- https://nimiq.dev/mini-apps/api-reference/nimiq-provider

Install the SDK:

npm install @nimiq/mini-app-sdk

Initialize the Nimiq provider using the current official SDK pattern.

Do not invent Nimiq APIs.

Do not expose private keys.

Do not create fake wallet balances or fake blockchain transactions in the final implementation.

If a Nimiq API capability is unclear, consult the official documentation rather than guessing.

---

MVP FEATURES

Implement these features:

1. Nimiq wallet connection
2. Home/prediction feed
3. Active prediction detail
4. Select prediction outcome
5. Enter NIM stake
6. Confirm NIM transaction
7. Transaction status
8. Prediction history
9. Win/loss result
10. Leaderboard
11. Share prediction
12. Basic profile/statistics

Do NOT build yet:

- AI-generated predictions
- chat
- complex social networking
- decentralized oracles
- complicated betting markets
- NFTs
- DAO functionality
- unnecessary blockchain dashboards

AI may be added later.

---

DESIGN DIRECTION

The app should feel:

- fast
- playful
- competitive
- slightly chaotic
- mobile-native
- easy to understand
- Nimiq-branded without becoming visually overloaded with crypto imagery

The word NIM should be highly visible throughout the experience.

Use NIM as the primary unit for:

- stakes
- winnings
- balances
- rewards
- transaction history

Avoid excessive blockchain terminology.

The user should immediately understand:

«What is the question?
What are my choices?
How much NIM am I risking?
What can I win?»

---

APP STRUCTURE

1. Home

Header:

NIM PANIC
Predict. Stake NIM. Win.

Show the user's NIM balance if available through the wallet/provider.

Main sections:

LIVE NOW

[ Prediction Card ]

ENDING SOON

[ Prediction Card ]

YOUR STREAK

🔥 4 correct predictions

Prediction cards should show:

- question
- category
- time remaining
- number of participants
- available outcomes
- NIM-related information

Example:

🔥 ENDING IN 02:41

Will Bitcoin close above $120K today?

YES       NO

143 NIM staked
87 players

---

2. Prediction Detail

Example:

NIM PANIC

02:41 remaining

Will Bitcoin close above $120K today?

YES
1.8× potential payout

NO
2.1× potential payout

Your stake
[ 10 NIM ]

[ PREDICT ]

Make the CTA prominent.

Before submitting, show a confirmation state:

Confirm prediction

YES

Stake
10 NIM

Potential payout
18 NIM

[ CONFIRM WITH NIM ]

The actual Nimiq wallet/provider should handle the transaction approval.

---

3. Transaction State

Show clear states:

Confirming NIM payment...

Then:

✓ NIM payment confirmed

Your prediction:
YES

Stake:
10 NIM

Status:
LOCKED

Handle failures clearly:

- User rejected transaction
- Provider unavailable
- Transaction failed
- Transaction pending
- Network error

Never tell the user that a transaction succeeded until it has actually been verified.

---

4. Prediction Lifecycle

Use explicit backend states:

OPEN
 ↓
LOCKED
 ↓
RESOLVED
 ↓
SETTLED

OPEN

Users can participate.

LOCKED

No new predictions or changes.

RESOLVED

The outcome has been determined.

SETTLED

Winnings/losses have been processed.

The backend must enforce these states.

---

5. Resolution

For the MVP, prediction questions can be manually created and resolved by an admin.

Do not build an oracle system yet.

Prediction model:

id
question
description
category
outcomes
start_time
lock_time
resolution_time
winning_outcome
status
created_at

The system must prevent users from changing their prediction after the lock time.

---

6. Prediction Entry

Each prediction entry should contain:

prediction_id
user_id
outcome
stake_nim
transaction_hash
status
created_at

Validate:

- user is authenticated
- prediction is still OPEN
- stake is valid
- transaction is unique
- payment amount matches expected stake
- user cannot submit duplicate entries where prohibited

---

7. Settlement

After resolution:

Winning prediction
       ↓
Calculate payout
       ↓
Verify/execute NIM settlement
       ↓
Update transaction
       ↓
Update user statistics

Never implement winnings using only a frontend number.

Do not simulate blockchain settlement and describe it as real.

If automated payout/escrow requires Nimiq capabilities that are not available or practical for the MVP, clearly isolate the settlement implementation so it can be upgraded later.

---

8. Game Mechanics

The product should emphasize Panic.

Predictions should feel time-sensitive.

Use:

- countdown timers
- “Ending Soon”
- streaks
- win/loss feedback
- daily challenges
- leaderboards
- participation counts

Example:

🔥 18 SECONDS LEFT

Everyone is picking YES.

What do YOU think?

The goal is to create a quick decision-making loop rather than a slow financial-market experience.

---

9. Leaderboard

Create:

Weekly leaderboard

🏆 THIS WEEK

1   @Ada       82 pts
2   @David     76 pts
3   @Chris     71 pts

Score should primarily reward prediction performance rather than simply rewarding users who have the largest NIM balance.

Possible scoring:

- correct predictions
- prediction streaks
- participation
- risk-adjusted performance

Keep the scoring simple for MVP.

---

10. Profile

Show:

@David

🔥 7 prediction streak

Accuracy
78%

Predictions
42

Wins
33

NIM won
+184 NIM

Do not expose unnecessary wallet information.

---

11. Sharing

Every prediction should be shareable.

Example:

🔥 NIM PANIC

Will Bitcoin close above $120K today?

YES / NO

Make your prediction.

Generate a deep link to the prediction.

The shared link should open directly to the relevant prediction inside the Mini App where possible.

WhatsApp can be the primary external sharing channel, but the application must not depend on WhatsApp APIs.

---

12. Database

Use PostgreSQL/Supabase for MVP if appropriate.

Minimum tables:

users

id
wallet_address
username
created_at

predictions

id
question
description
category
outcomes
start_time
lock_time
resolution_time
winning_outcome
status
created_at

prediction_entries

id
prediction_id
user_id
outcome
stake_nim
transaction_hash
status
created_at

settlements

id
prediction_entry_id
payout_nim
transaction_hash
status
created_at

leaderboard_stats

user_id
points
accuracy
wins
streak
period

---

13. Authentication

Do not treat a wallet address as sufficient authentication.

Use a secure wallet-based authentication flow where practical:

Backend creates nonce
        ↓
User signs nonce
        ↓
Backend verifies signature
        ↓
Authenticated session

Never store private keys.

Never request seed phrases.

---

14. Security

The backend must be the authority for:

- prediction state
- lock times
- winning outcomes
- stake validation
- transaction verification
- settlement
- leaderboard calculations

Never trust client-side values for money-related operations.

Use:

- server-side validation
- idempotency
- duplicate transaction protection
- authorization checks
- transaction verification

---

15. UI Components

Create reusable components:

- "PredictionCard"
- "CountdownTimer"
- "OutcomeButton"
- "StakeInput"
- "WalletButton"
- "TransactionStatus"
- "PredictionResult"
- "Leaderboard"
- "StreakBadge"
- "ShareButton"
- "BottomNavigation"

Bottom navigation:

Home | My Picks | Leaderboard | Profile

---

16. Empty/Error States

Design proper states for:

- No active predictions
- Wallet not connected
- Provider unavailable
- Failed transaction
- Rejected transaction
- Pending transaction
- Prediction expired
- Prediction already locked
- No prediction history

Do not leave blank screens.

---

17. Responsive Design

Primary target:

Mobile / Nimiq Pay Mini App

Design for narrow screens first.

Requirements:

- touch-friendly controls
- large primary CTA
- readable countdown
- minimal scrolling
- clear transaction feedback
- accessible text contrast
- responsive layouts

---

18. Development Sequence

Build in this order:

Phase 1

Mini App shell + Nimiq wallet integration

Phase 2

Prediction feed + prediction detail

Phase 3

Prediction selection + NIM staking

Phase 4

Backend transaction verification

Phase 5

Prediction resolution + settlement

Phase 6

History + profile + leaderboard

Phase 7

Sharing + polish

Do not move to advanced features until the complete prediction → payment → resolution flow works.

---

19. Demo Data

During development, create realistic sample predictions such as:

Will Bitcoin close above $120K today?

Will Arsenal win their next match?

Will Lagos record rainfall tomorrow?

Will Nimiq reach 10,000 active users this month?

Will ETH outperform BTC this week?

Clearly distinguish development/mock data from real predictions.

---

20. Definition of Done

The MVP is complete when a user can:

Open NIM Panic
      ↓
Connect Nimiq wallet
      ↓
View live prediction
      ↓
Choose outcome
      ↓
Enter NIM stake
      ↓
Approve NIM transaction
      ↓
Transaction is verified
      ↓
Prediction locks
      ↓
Prediction is resolved
      ↓
Result is displayed
      ↓
Settlement occurs
      ↓
Leaderboard/profile updates

The final product should demonstrate one thing exceptionally well:

«NIM turns prediction into a fast, social game.»

Final implementation rule

Build the smallest genuinely functional version first. Do not replace real Nimiq functionality with fake UI once the wallet/payment integration is being implemented. Use the official Nimiq documentation whenever an API or capability is uncertain.https://nimiq.dev/mini-apps/

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://nim-panic-play.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/7728324e-1ee8-4397-b244-a7e017b949b5).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
