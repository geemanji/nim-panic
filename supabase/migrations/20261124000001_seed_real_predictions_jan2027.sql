-- ─── Seed 18 real prediction markets (Dec 24, 2026 – Feb 14, 2027) ──────────
-- 3 per category: SPORTS · CRYPTO · ESPORTS · TECH · CULTURE · WORLD
-- All questions are grounded in real events happening during this window.
-- lock_time and resolution_time are relative to now() so they're always fresh.
-- Safe to re-run: deletes existing rows with these questions first.
-- Runs as postgres superuser (bypasses RLS).

-- Remove any existing rows with these questions (idempotent re-run)
DELETE FROM public.predictions
WHERE question IN (
  'Will the San Francisco 49ers earn the NFC''s #1 seed and a first-round bye?',
  'Will the Buffalo Bills reach the AFC Championship Game on January 31?',
  'Will the San Francisco 49ers win Super Bowl LXI on February 14?',
  'Will Bitcoin close above $70,000 on any day before January 15?',
  'Will Ethereum close above $2,000 on any day before January 15?',
  'Will Solana (SOL) close above $100 on any day before January 15?',
  'Will a non-partner-org team reach VCT Masters Seoul 2027?',
  'Will G2 Esports win the LEC 2027 Winter Split?',
  'Will a Pacific region team win VCT Masters Seoul 2027?',
  'Will Nvidia (NVDA) close above $200 on any trading day before January 15?',
  'Will Apple (AAPL) close above $375 on any trading day before January 15?',
  'Will the Nasdaq Composite close above 26,000 before January 15?',
  'Will RAYE win Album of the Year at the 2027 Grammy Awards on February 7?',
  'Will Children of Blood and Bone open at #1 at the domestic box office on January 15?',
  'Will a first-time Grammy nominee win Record of the Year at the 2027 Grammys?',
  'Will Ilse Aigner be elected Germany''s first female president on January 30?',
  'Will the new Democratic-majority US House pass any bill in its first 30 days?',
  'Will Marine Le Pen be cleared to run for president by the French Court of Cassation before February 1?'
);

INSERT INTO public.predictions
  (question, description, category, outcomes, lock_time, resolution_time, status, is_demo,
   participants_count, total_staked_nim, outcome_totals, min_stake_nim, max_stake_nim)
VALUES

-- ═══════════════════════════════════════════════════════════════════════════
-- SPORTS  (3 predictions)
-- ═══════════════════════════════════════════════════════════════════════════

(
  'Will the San Francisco 49ers earn the NFC''s #1 seed and a first-round bye?',
  'The 49ers lead the NFC at 9-1 after their 35-10 rout of the Vikings in Mexico City on Nov 23. As the #1 seed they would skip Wild Card Weekend (Jan 16-18) and host the Divisional Round. Settles YES if San Francisco finishes the regular season as the top seed in the NFC, NO otherwise.',
  'SPORTS',
  '[{"key":"YES","label":"49ers get #1 seed"},{"key":"NO","label":"Another NFC team gets it"}]'::jsonb,
  now() + interval '30 days',
  now() + interval '32 days',
  'OPEN', false, 0, 0, '{}'::jsonb, 1, 500
),
(
  'Will the Buffalo Bills reach the AFC Championship Game on January 31?',
  'The Bills and 49ers are co-favorites at Kalshi (15-16%) to win Super Bowl LXI. Wild Card Weekend is Jan 16-18 and the AFC Championship is Jan 31. Settles YES if Buffalo wins their Wild Card and Divisional Round games to reach the Jan 31 Conference Championship, NO if they are eliminated before that.',
  'SPORTS',
  '[{"key":"YES","label":"Bills reach AFC Championship"},{"key":"NO","label":"Bills eliminated earlier"}]'::jsonb,
  now() + interval '53 days',
  now() + interval '54 days',
  'OPEN', false, 0, 0, '{}'::jsonb, 1, 500
),
(
  'Will the San Francisco 49ers win Super Bowl LXI on February 14?',
  'Super Bowl LXI is at SoFi Stadium in Inglewood, CA on Sunday, Feb 14, 2027. The 49ers are the slight pre-playoff favorite at ~16-19% implied odds on prediction markets, with the Bills close behind. Settles on the final score at the end of regulation or overtime.',
  'SPORTS',
  '[{"key":"NINERS","label":"49ers win"},{"key":"OTHER","label":"Another team wins"}]'::jsonb,
  now() + interval '82 days',
  now() + interval '83 days',
  'OPEN', false, 0, 0, '{}'::jsonb, 1, 1000
),

-- ═══════════════════════════════════════════════════════════════════════════
-- CRYPTO  (3 predictions)
-- ═══════════════════════════════════════════════════════════════════════════

(
  'Will Bitcoin close above $70,000 on any day before January 15?',
  'BTC bounced to ~$61,100 on Nov 23 after a sharp weekend sell-off to $55,300, rising alongside a broader equity rebound triggered by Jensen Huang''s return to Nvidia. Settles YES if the CoinGecko daily close (UTC midnight) exceeds $70,000 on any day before Jan 15.',
  'CRYPTO',
  '[{"key":"ABOVE","label":"Closes above $70k"},{"key":"AT_OR_BELOW","label":"Stays at or below $70k"}]'::jsonb,
  now() + interval '52 days',
  now() + interval '53 days',
  'OPEN', false, 0, 0, '{}'::jsonb, 1, 1000
),
(
  'Will Ethereum close above $2,000 on any day before January 15?',
  'ETH reclaimed $1,716 on Nov 23 after falling to a low near $1,540 over the previous weekend. The last close above $2,000 was in early September. Settles YES if the CoinGecko daily close (UTC midnight) exceeds $2,000 on any day before Jan 15.',
  'CRYPTO',
  '[{"key":"ABOVE","label":"Closes above $2k"},{"key":"AT_OR_BELOW","label":"Stays at or below $2k"}]'::jsonb,
  now() + interval '52 days',
  now() + interval '53 days',
  'OPEN', false, 0, 0, '{}'::jsonb, 1, 1000
),
(
  'Will Solana (SOL) close above $100 on any day before January 15?',
  'SOL rebounded to around $75 on Nov 23 after touching $65 over the weekend, outperforming Bitcoin and Ethereum on the daily chart. Spot Solana ETFs saw $4.38 million in net inflows last week while BTC and ETH products bled. Settles on the CoinGecko daily close (UTC midnight); YES if SOL exceeds $100 before Jan 15.',
  'CRYPTO',
  '[{"key":"ABOVE","label":"Closes above $100"},{"key":"AT_OR_BELOW","label":"Stays at or below $100"}]'::jsonb,
  now() + interval '52 days',
  now() + interval '53 days',
  'OPEN', false, 0, 0, '{}'::jsonb, 1, 750
),

-- ═══════════════════════════════════════════════════════════════════════════
-- ESPORTS  (3 predictions)
-- ═══════════════════════════════════════════════════════════════════════════

(
  'Will a non-partner-org team reach VCT Masters Seoul 2027?',
  'The 2027 VCT season introduces open qualifiers in every region, giving teams outside the original 30 partner organizations a path into the top tier for the first time. VCT Kickoff runs Jan 14 to Feb 7 across four regions (São Paulo, Berlin, Bangkok, Hangzhou), and the top finishers advance to Masters Seoul (Feb 20 to Mar 3). Settles YES if any team that entered through the Open Qualifier route reaches Masters Seoul.',
  'ESPORTS',
  '[{"key":"YES","label":"Open-qualifier team reaches Seoul"},{"key":"NO","label":"Only partner orgs advance"}]'::jsonb,
  now() + interval '88 days',
  now() + interval '89 days',
  'OPEN', false, 0, 0, '{}'::jsonb, 1, 500
),
(
  'Will G2 Esports win the LEC 2027 Winter Split?',
  'The LEC 2027 Winter Split begins January 15 at the LEC Studio in Berlin. G2 Esports have won three of the last four LEC titles and enter 2027 with a rebuilt roster. The Winter Split playoffs conclude in late February. Settles YES if G2 wins the Winter Split grand final.',
  'ESPORTS',
  '[{"key":"G2","label":"G2 Esports wins"},{"key":"FIELD","label":"Another team wins"}]'::jsonb,
  now() + interval '88 days',
  now() + interval '89 days',
  'OPEN', false, 0, 0, '{}'::jsonb, 1, 500
),
(
  'Will a Pacific region team win VCT Masters Seoul 2027?',
  'VCT Masters Seoul 2027 (Feb 20 to Mar 3) is the first international event of the season. Seoul previously hosted the 2024 VALORANT Champions and the 2025 Game Changers Championship, giving Pacific-region teams strong home-crowd familiarity. Settles YES if the champion is a Pacific-region team, NO if the winner is from EMEA, Americas, or China.',
  'ESPORTS',
  '[{"key":"PACIFIC","label":"Pacific region wins"},{"key":"OTHER","label":"Another region wins"}]'::jsonb,
  now() + interval '99 days',
  now() + interval '100 days',
  'OPEN', false, 0, 0, '{}'::jsonb, 1, 500
),

-- ═══════════════════════════════════════════════════════════════════════════
-- TECH  (3 predictions)
-- ═══════════════════════════════════════════════════════════════════════════

(
  'Will Nvidia (NVDA) close above $200 on any trading day before January 15?',
  'NVDA closed at $125.53 on Nov 20 after a seven-week, 48% decline, then surged ~31% on Nov 23 to around $165 when Jensen Huang was reinstated as CEO. Settles YES if NVDA closes above $200 on any trading session at the Nasdaq before Jan 15.',
  'TECH',
  '[{"key":"ABOVE","label":"Closes above $200"},{"key":"AT_OR_BELOW","label":"Stays at or below $200"}]'::jsonb,
  now() + interval '52 days',
  now() + interval '53 days',
  'OPEN', false, 0, 0, '{}'::jsonb, 1, 1000
),
(
  'Will Apple (AAPL) close above $375 on any trading day before January 15?',
  'Apple shares rose 1.9% to $349 on Nov 23, carried higher alongside the Nvidia-led tech rally. AAPL is up roughly 29% year-to-date after a record fiscal 2026 of $478.8B in revenue. Settles YES if AAPL closes above $375 on any Nasdaq session before Jan 15.',
  'TECH',
  '[{"key":"ABOVE","label":"Closes above $375"},{"key":"AT_OR_BELOW","label":"Stays at or below $375"}]'::jsonb,
  now() + interval '52 days',
  now() + interval '53 days',
  'OPEN', false, 0, 0, '{}'::jsonb, 1, 750
),
(
  'Will the Nasdaq Composite close above 26,000 before January 15?',
  'The Nasdaq surged 6.51% to 24,089.56 on Nov 23 — its biggest one-day gain since April 2025 — after Jensen Huang''s return to Nvidia triggered a broad AI-sector rebound. The all-time high is 27,599.79, set in early October. Settles YES if the Nasdaq Composite index (COMP) closes above 26,000 on any trading day before Jan 15.',
  'TECH',
  '[{"key":"ABOVE","label":"Closes above 26,000"},{"key":"AT_OR_BELOW","label":"Stays at or below 26,000"}]'::jsonb,
  now() + interval '52 days',
  now() + interval '53 days',
  'OPEN', false, 0, 0, '{}'::jsonb, 1, 750
),

-- ═══════════════════════════════════════════════════════════════════════════
-- CULTURE  (3 predictions)
-- ═══════════════════════════════════════════════════════════════════════════

(
  'Will RAYE win Album of the Year at the 2027 Grammy Awards on February 7?',
  'The 69th Grammy Awards air live on Feb 7, 2027 from Crypto.com Arena in Los Angeles. RAYE leads all nominees with 11 nominations, including Album of the Year for This Music May Contain Hope — the same album that won the Mercury Prize. She ties Beyoncé''s record for the most nominations by a female artist in a single year. Other AOTY nominees include Rosalía, Olivia Rodrigo, Phoebe Bridgers, Taylor Swift, Bruno Mars, Ella Langley, and Olivia Dean.',
  'CULTURE',
  '[{"key":"RAYE","label":"RAYE wins AOTY"},{"key":"OTHER","label":"Another artist wins AOTY"}]'::jsonb,
  now() + interval '75 days',
  now() + interval '76 days',
  'OPEN', false, 0, 0, '{}'::jsonb, 1, 500
),
(
  'Will Children of Blood and Bone open at #1 at the domestic box office on January 15?',
  'Children of Blood and Bone (Paramount) opens wide on Jan 15, 2027. Directed by Gina Prince-Bythewood and starring Thuso Mbedu, Damson Idris, Idris Elba, and Viola Davis, it adapts Tomi Adeyemi''s bestselling fantasy novel. The Beekeeper 2 (Jason Statham) opens the same weekend. Settles on the Box Office Mojo domestic opening weekend estimate for Jan 15–17; YES if Children of Blood and Bone is #1.',
  'CULTURE',
  '[{"key":"YES","label":"Opens at #1"},{"key":"NO","label":"Another film is #1"}]'::jsonb,
  now() + interval '52 days',
  now() + interval '54 days',
  'OPEN', false, 0, 0, '{}'::jsonb, 1, 300
),
(
  'Will a first-time Grammy nominee win Record of the Year at the 2027 Grammys?',
  'The 2027 Grammy Record of the Year nominees include multiple first-timers: Ella Langley (seven noms overall) and Olivia Dean (six noms), who is last year''s Best New Artist. Established acts like Rosalía (nine noms), Olivia Rodrigo, Phoebe Bridgers, and Bruno Mars also contend. Settles YES if the Record of the Year winner has never received a Grammy nomination before the 69th ceremony on Feb 7, 2027.',
  'CULTURE',
  '[{"key":"YES","label":"First-time nominee wins"},{"key":"NO","label":"Previous nominee wins"}]'::jsonb,
  now() + interval '75 days',
  now() + interval '76 days',
  'OPEN', false, 0, 0, '{}'::jsonb, 1, 300
),

-- ═══════════════════════════════════════════════════════════════════════════
-- WORLD  (3 predictions)
-- ═══════════════════════════════════════════════════════════════════════════

(
  'Will Ilse Aigner be elected Germany''s first female president on January 30?',
  'The Federal Convention convenes Jan 30, 2027 to elect a new Bundespräsident. Chancellor Friedrich Merz (CDU) has publicly backed Ilse Aigner, 61, of the CSU — the Bavarian sister party of the CDU — who would become Germany''s first female head of state. A candidate needs an absolute majority (631 votes) in the first two rounds; a plurality suffices in a third round. Settles YES if Aigner is elected on Jan 30.',
  'WORLD',
  '[{"key":"AIGNER","label":"Aigner elected"},{"key":"OTHER","label":"Another candidate elected"}]'::jsonb,
  now() + interval '67 days',
  now() + interval '68 days',
  'OPEN', false, 0, 0, '{}'::jsonb, 1, 500
),
(
  'Will the new Democratic-majority US House pass any bill in its first 30 days?',
  'Democrats won the House in the Nov 3, 2026 midterms. The new 120th Congress is sworn in on Jan 3, 2027. Settles YES if the House passes any bill (by recorded vote) during the first 30 calendar days after swearing-in, before Feb 2, 2027. Procedural resolutions and rules packages do not count as a bill.',
  'WORLD',
  '[{"key":"YES","label":"At least one bill passes"},{"key":"NO","label":"No bill passed in 30 days"}]'::jsonb,
  now() + interval '70 days',
  now() + interval '72 days',
  'OPEN', false, 0, 0, '{}'::jsonb, 1, 500
),
(
  'Will Marine Le Pen be cleared to run for president by the French Court of Cassation before February 1?',
  'The French Court of Cassation is expected to rule on Marine Le Pen''s embezzlement appeal by early January 2027 at the latest. The Paris Court of Appeal upheld her conviction on July 7, 2026 but reduced her ineligibility to 45 months (30 suspended), clearing her path to run. The final Cassation ruling could fully uphold, modify, or quash that sentence. The French presidential election first round is April 18, 2027. Settles YES if the Court of Cassation issues a ruling before Feb 1 that leaves Le Pen eligible to stand as a candidate.',
  'WORLD',
  '[{"key":"CLEARED","label":"Le Pen cleared to run"},{"key":"NOT_CLEARED","label":"Ruling blocks or delayed past Feb 1"}]'::jsonb,
  now() + interval '68 days',
  now() + interval '70 days',
  'OPEN', false, 0, 0, '{}'::jsonb, 1, 500
);
