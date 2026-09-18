-- ─── Seed / refresh demo predictions ────────────────────────────────────────
-- Deletes stale demo rows and inserts a fresh set with lock/resolution times
-- relative to now(), so they always appear as live on any fresh deploy.
-- Safe to re-run: DELETE + INSERT is idempotent for demo rows.
-- Categories: SPORTS · CRYPTO · ESPORTS · TECH · CULTURE · WORLD

DELETE FROM public.predictions WHERE is_demo = true;

INSERT INTO public.predictions
  (question, description, category, outcomes, lock_time, resolution_time, status, is_demo,
   participants_count, total_staked_nim, outcome_totals, min_stake_nim, max_stake_nim)
VALUES

-- ═══════════════════════════════════════════════════════════════════════════
-- CRYPTO  (7 predictions)
-- ═══════════════════════════════════════════════════════════════════════════

-- panic zone: 12 min
(
  'Will Bitcoin close above $65K today?',
  'Resolved from the daily UTC close price on CoinGecko.',
  'CRYPTO',
  '[{"key":"YES","label":"YES"},{"key":"NO","label":"NO"}]'::jsonb,
  now() + interval '12 minutes',
  now() + interval '8 hours',
  'OPEN', true, 112, 198,
  '{"YES":124,"NO":74}'::jsonb,
  1, 500
),
-- panic zone: 22 min
(
  'Will Ethereum gas fees stay below 20 Gwei for the next hour?',
  'Average gas price on mainnet, sampled every 5 minutes. Resolved at lock time.',
  'CRYPTO',
  '[{"key":"YES","label":"YES"},{"key":"NO","label":"NO"}]'::jsonb,
  now() + interval '22 minutes',
  now() + interval '2 hours',
  'OPEN', true, 67, 118,
  '{"YES":72,"NO":46}'::jsonb,
  1, 500
),
-- heating up: 90 min
(
  'Will BTC dominance rise above 55% today?',
  'Resolved using the CoinGecko BTC dominance figure at end of the UTC day.',
  'CRYPTO',
  '[{"key":"YES","label":"YES"},{"key":"NO","label":"NO"}]'::jsonb,
  now() + interval '90 minutes',
  now() + interval '10 hours',
  'OPEN', true, 88, 154,
  '{"YES":98,"NO":56}'::jsonb,
  1, 500
),
-- heating up: 2 h
(
  'Will ETH outperform BTC this week?',
  'Compares the 7-day percentage price change of ETH vs BTC on CoinGecko.',
  'CRYPTO',
  '[{"key":"ETH","label":"ETH wins"},{"key":"BTC","label":"BTC wins"}]'::jsonb,
  now() + interval '2 hours',
  now() + interval '5 days',
  'OPEN', true, 76, 142,
  '{"ETH":80,"BTC":62}'::jsonb,
  1, 500
),
-- heating up: 2.5 h
(
  'Will Solana maintain a top-5 market cap position this week?',
  'Resolved using CoinGecko market cap rankings at end of the period.',
  'CRYPTO',
  '[{"key":"YES","label":"YES"},{"key":"NO","label":"NO"}]'::jsonb,
  now() + interval '2 hours 30 minutes',
  now() + interval '6 days',
  'OPEN', true, 44, 86,
  '{"YES":55,"NO":31}'::jsonb,
  1, 500
),
-- longer: 2 days
(
  'Will NIM price increase by 5% this week?',
  'Based on the NIM/USD closing price at end of the 7-day window on CoinGecko.',
  'CRYPTO',
  '[{"key":"YES","label":"YES"},{"key":"NO","label":"NO"}]'::jsonb,
  now() + interval '2 days',
  now() + interval '7 days',
  'OPEN', true, 58, 104,
  '{"YES":68,"NO":36}'::jsonb,
  1, 500
),
-- longer: 3 days
(
  'Will the total crypto market cap exceed $3T this month?',
  'Resolved from CoinGecko global market cap data at end of the resolution window.',
  'CRYPTO',
  '[{"key":"YES","label":"YES"},{"key":"NO","label":"NO"}]'::jsonb,
  now() + interval '3 days',
  now() + interval '12 days',
  'OPEN', true, 39, 72,
  '{"YES":48,"NO":24}'::jsonb,
  1, 500
),

-- ═══════════════════════════════════════════════════════════════════════════
-- SPORTS  (7 predictions)
-- ═══════════════════════════════════════════════════════════════════════════

-- panic zone: 8 min
(
  'Will there be a goal in the first 10 minutes of the next big match?',
  'Resolved from official match data. VAR-confirmed goals only.',
  'SPORTS',
  '[{"key":"YES","label":"YES"},{"key":"NO","label":"NO"}]'::jsonb,
  now() + interval '8 minutes',
  now() + interval '4 hours',
  'OPEN', true, 89, 161,
  '{"YES":95,"NO":66}'::jsonb,
  1, 500
),
-- panic zone: 18 min
(
  'Will the home team win the next Premier League match?',
  'Full-time result only. A draw counts as NO.',
  'SPORTS',
  '[{"key":"YES","label":"YES"},{"key":"NO","label":"NO"}]'::jsonb,
  now() + interval '18 minutes',
  now() + interval '6 hours',
  'OPEN', true, 103, 188,
  '{"YES":115,"NO":73}'::jsonb,
  1, 500
),
-- heating up: 75 min
(
  'Will the F1 polesitter win the race this weekend?',
  'Resolved on official race classification. Safety car periods included.',
  'SPORTS',
  '[{"key":"YES","label":"YES"},{"key":"NO","label":"NO"}]'::jsonb,
  now() + interval '75 minutes',
  now() + interval '3 days',
  'OPEN', true, 71, 130,
  '{"YES":82,"NO":48}'::jsonb,
  1, 500
),
-- heating up: 2 h
(
  'Will the top seed progress to the tennis semi-finals?',
  'Resolved on official ATP/WTA draw results.',
  'SPORTS',
  '[{"key":"YES","label":"YES"},{"key":"NO","label":"NO"}]'::jsonb,
  now() + interval '2 hours',
  now() + interval '4 days',
  'OPEN', true, 55, 98,
  '{"YES":62,"NO":36}'::jsonb,
  1, 500
),
-- heating up: 2 h 20 min
(
  'Will the NBA game go to overtime tonight?',
  'Any overtime period counts as YES. Resolved on official box score.',
  'SPORTS',
  '[{"key":"YES","label":"YES"},{"key":"NO","label":"NO"}]'::jsonb,
  now() + interval '2 hours 20 minutes',
  now() + interval '8 hours',
  'OPEN', true, 47, 84,
  '{"YES":29,"NO":55}'::jsonb,
  1, 500
),
-- longer: 1 day
(
  'Will there be a red card in the next El Clásico?',
  'Any red card in regular or extra time counts as YES.',
  'SPORTS',
  '[{"key":"YES","label":"YES"},{"key":"NO","label":"NO"}]'::jsonb,
  now() + interval '1 day',
  now() + interval '2 days',
  'OPEN', true, 62, 114,
  '{"YES":38,"NO":76}'::jsonb,
  1, 500
),
-- longer: 4 days
(
  'Will the underdog win the boxing match this weekend?',
  'Resolved on official result. Technical decisions count.',
  'SPORTS',
  '[{"key":"YES","label":"YES"},{"key":"NO","label":"NO"}]'::jsonb,
  now() + interval '4 days',
  now() + interval '5 days',
  'OPEN', true, 34, 62,
  '{"YES":21,"NO":41}'::jsonb,
  1, 500
),

-- ═══════════════════════════════════════════════════════════════════════════
-- ESPORTS  (5 predictions)
-- ═══════════════════════════════════════════════════════════════════════════

-- panic zone: 15 min
(
  'Will the favourite team win the current CS2 map?',
  'Resolved on map result. Forfeit counts as a loss for the forfeiting side.',
  'ESPORTS',
  '[{"key":"YES","label":"YES"},{"key":"NO","label":"NO"}]'::jsonb,
  now() + interval '15 minutes',
  now() + interval '3 hours',
  'OPEN', true, 78, 142,
  '{"YES":88,"NO":54}'::jsonb,
  1, 500
),
-- heating up: 80 min
(
  'Will there be a 30+ kill game in the next Valorant match?',
  'Total combined kills in a single map must reach 30. Resolved on Riot match data.',
  'ESPORTS',
  '[{"key":"YES","label":"YES"},{"key":"NO","label":"NO"}]'::jsonb,
  now() + interval '80 minutes',
  now() + interval '5 hours',
  'OPEN', true, 54, 96,
  '{"YES":60,"NO":36}'::jsonb,
  1, 500
),
-- heating up: 2 h 10 min
(
  'Will Team Liquid make it out of the group stage?',
  'Resolved on official tournament bracket after group play ends.',
  'ESPORTS',
  '[{"key":"YES","label":"YES"},{"key":"NO","label":"NO"}]'::jsonb,
  now() + interval '2 hours 10 minutes',
  now() + interval '3 days',
  'OPEN', true, 42, 76,
  '{"YES":51,"NO":25}'::jsonb,
  1, 500
),
-- longer: 1 day
(
  'Will the defending champion win the next major LoL tournament?',
  'Resolved on the official Riot Games tournament results page.',
  'ESPORTS',
  '[{"key":"YES","label":"YES"},{"key":"NO","label":"NO"}]'::jsonb,
  now() + interval '1 day',
  now() + interval '6 days',
  'OPEN', true, 61, 110,
  '{"YES":70,"NO":40}'::jsonb,
  1, 500
),
-- longer: 3 days
(
  'Will a new speedrun world record be set this week?',
  'Any major category on speedrun.com with more than 50 runners. Verified runs only.',
  'ESPORTS',
  '[{"key":"YES","label":"YES"},{"key":"NO","label":"NO"}]'::jsonb,
  now() + interval '3 days',
  now() + interval '7 days',
  'OPEN', true, 28, 50,
  '{"YES":33,"NO":17}'::jsonb,
  1, 500
),

-- ═══════════════════════════════════════════════════════════════════════════
-- TECH  (5 predictions)
-- ═══════════════════════════════════════════════════════════════════════════

-- panic zone: 20 min
(
  'Will GitHub go down in the next hour?',
  'Resolved from githubstatus.com. Any "incident" or "partial outage" counts as YES.',
  'TECH',
  '[{"key":"YES","label":"YES"},{"key":"NO","label":"NO"}]'::jsonb,
  now() + interval '20 minutes',
  now() + interval '2 hours',
  'OPEN', true, 44, 78,
  '{"YES":12,"NO":66}'::jsonb,
  1, 500
),
-- heating up: 100 min
(
  'Will Apple announce a new product at their next event?',
  'Any hardware announcement on the official Apple newsroom counts as YES.',
  'TECH',
  '[{"key":"YES","label":"YES"},{"key":"NO","label":"NO"}]'::jsonb,
  now() + interval '100 minutes',
  now() + interval '5 days',
  'OPEN', true, 66, 120,
  '{"YES":78,"NO":42}'::jsonb,
  1, 500
),
-- heating up: 2 h 45 min
(
  'Will a new AI model top the LMSys leaderboard this week?',
  'Based on the public Chatbot Arena leaderboard rankings at end of the period.',
  'TECH',
  '[{"key":"YES","label":"YES"},{"key":"NO","label":"NO"}]'::jsonb,
  now() + interval '2 hours 45 minutes',
  now() + interval '7 days',
  'OPEN', true, 52, 94,
  '{"YES":58,"NO":36}'::jsonb,
  1, 500
),
-- longer: 2 days
(
  'Will Starlink announce a new coverage country this week?',
  'Official Starlink availability map or SpaceX press release only.',
  'TECH',
  '[{"key":"YES","label":"YES"},{"key":"NO","label":"NO"}]'::jsonb,
  now() + interval '2 days',
  now() + interval '7 days',
  'OPEN', true, 31, 56,
  '{"YES":38,"NO":18}'::jsonb,
  1, 500
),
-- longer: 5 days
(
  'Will Node.js release a new LTS version this month?',
  'Official announcement on nodejs.org. Release candidates do not count.',
  'TECH',
  '[{"key":"YES","label":"YES"},{"key":"NO","label":"NO"}]'::jsonb,
  now() + interval '5 days',
  now() + interval '15 days',
  'OPEN', true, 22, 40,
  '{"YES":26,"NO":14}'::jsonb,
  1, 500
),

-- ═══════════════════════════════════════════════════════════════════════════
-- CULTURE  (4 predictions)
-- ═══════════════════════════════════════════════════════════════════════════

-- panic zone: 25 min
(
  'Will today''s Wordle be solved in 3 or fewer guesses by the majority?',
  'Based on the NYT Wordle statistics summary published after midnight ET.',
  'CULTURE',
  '[{"key":"YES","label":"YES"},{"key":"NO","label":"NO"}]'::jsonb,
  now() + interval '25 minutes',
  now() + interval '20 hours',
  'OPEN', true, 93, 168,
  '{"YES":56,"NO":112}'::jsonb,
  1, 500
),
-- heating up: 110 min
(
  'Will a new song debut at #1 on the global Spotify chart this week?',
  'Resolved from the official Spotify Charts weekly top 200.',
  'CULTURE',
  '[{"key":"YES","label":"YES"},{"key":"NO","label":"NO"}]'::jsonb,
  now() + interval '110 minutes',
  now() + interval '7 days',
  'OPEN', true, 47, 84,
  '{"YES":55,"NO":29}'::jsonb,
  1, 500
),
-- longer: 1 day
(
  'Will a film gross over $50M at the box office this weekend?',
  'Resolved from Box Office Mojo domestic opening weekend figures.',
  'CULTURE',
  '[{"key":"YES","label":"YES"},{"key":"NO","label":"NO"}]'::jsonb,
  now() + interval '1 day',
  now() + interval '4 days',
  'OPEN', true, 59, 106,
  '{"YES":70,"NO":36}'::jsonb,
  1, 500
),
-- longer: 3 days
(
  'Will this week''s most-streamed Netflix show have a season renewal?',
  'Resolved on official Netflix announcement within 7 days of the prediction close.',
  'CULTURE',
  '[{"key":"YES","label":"YES"},{"key":"NO","label":"NO"}]'::jsonb,
  now() + interval '3 days',
  now() + interval '10 days',
  'OPEN', true, 36, 64,
  '{"YES":42,"NO":22}'::jsonb,
  1, 500
),

-- ═══════════════════════════════════════════════════════════════════════════
-- WORLD  (5 predictions)
-- ═══════════════════════════════════════════════════════════════════════════

-- panic zone: 14 min
(
  'Will it rain in London today?',
  'Any measurable precipitation reported by the Met Office for Greater London counts as YES.',
  'WORLD',
  '[{"key":"YES","label":"YES"},{"key":"NO","label":"NO"}]'::jsonb,
  now() + interval '14 minutes',
  now() + interval '20 hours',
  'OPEN', true, 148, 244,
  '{"YES":160,"NO":84}'::jsonb,
  1, 500
),
-- panic zone: 28 min
(
  'Will the USD/EUR rate move by more than 0.5% today?',
  'Resolved using the ECB reference rate published at ~16:00 CET.',
  'WORLD',
  '[{"key":"YES","label":"YES"},{"key":"NO","label":"NO"}]'::jsonb,
  now() + interval '28 minutes',
  now() + interval '10 hours',
  'OPEN', true, 74, 132,
  '{"YES":42,"NO":90}'::jsonb,
  1, 500
),
-- heating up: 2 h
(
  'Will Dubai temperature exceed 40°C this week?',
  'Based on the official daily maximum recorded by Dubai Meteorological Office.',
  'WORLD',
  '[{"key":"YES","label":"YES"},{"key":"NO","label":"NO"}]'::jsonb,
  now() + interval '2 hours',
  now() + interval '5 days',
  'OPEN', true, 37, 68,
  '{"YES":45,"NO":23}'::jsonb,
  1, 500
),
-- longer: 2 days
(
  'Will a G7 country announce new economic sanctions this week?',
  'Official government press release or UN Security Council statement required.',
  'WORLD',
  '[{"key":"YES","label":"YES"},{"key":"NO","label":"NO"}]'::jsonb,
  now() + interval '2 days',
  now() + interval '7 days',
  'OPEN', true, 41, 74,
  '{"YES":50,"NO":24}'::jsonb,
  1, 500
),
-- longer: 4 days
(
  'Will oil (Brent crude) trade above $90 per barrel by end of the month?',
  'Resolved using the ICE Brent front-month settlement price.',
  'WORLD',
  '[{"key":"YES","label":"YES"},{"key":"NO","label":"NO"}]'::jsonb,
  now() + interval '4 days',
  now() + interval '12 days',
  'OPEN', true, 53, 96,
  '{"YES":61,"NO":35}'::jsonb,
  1, 500
);
