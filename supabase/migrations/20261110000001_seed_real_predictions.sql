-- ─── Seed 18 real prediction markets (Nov 25 – Dec 21, 2026) ─────────────────
-- 3 per category: SPORTS · CRYPTO · ESPORTS · TECH · CULTURE · WORLD
-- All questions are grounded in real events happening during this window.
-- lock_time and resolution_time are relative to now() so they're always fresh.
-- Safe to re-run: deletes existing rows with these questions first.
-- Runs as postgres superuser (bypasses RLS).

-- Remove any existing rows with these questions (idempotent re-run)
DELETE FROM public.predictions
WHERE question IN (
  'Will the Kansas City Chiefs beat the Buffalo Bills on Thanksgiving night, Nov 26?',
  'Who wins the 76ers-Heat Emirates NBA Cup clash on Nov 25?',
  'Will Chelsea beat Liverpool in the Premier League on Dec 5?',
  'Will Bitcoin close above $65,000 on December 5?',
  'Will Ethereum drop below $1,600 before December 7?',
  'Will NIM gain more than 10% against USD between Nov 23 and Dec 7?',
  'Will the PGL Major Singapore CS2 champion come from a European or CIS roster?',
  'Will a Western European team win DreamLeague Season 30 (Dota 2)?',
  'Will LOUD win Red Bull Home Ground 2026 in Los Angeles?',
  'Will Nvidia (NVDA) close above $180 before December 5?',
  'Will Anthropic (ANT) close above its $97 first-day close before December 5?',
  'Will Apple (AAPL) close above $355 before December 5?',
  'Will Spider-Man: Brand New Day cross $1 billion at the domestic box office before Dec 7?',
  'Will Avengers: Doomsday out-open Dune: Part Three on the Dec 18-20 opening weekend?',
  'Will a new album debut at #1 on the Billboard 200 the week of Dec 6?',
  'Will the US federal government shut down when funding lapses on December 12, 2026?',
  'Will Brent crude close below $85/barrel before December 7?',
  'Will the Democrats'' US House majority be officially certified before December 7?'
);

INSERT INTO public.predictions
  (question, description, category, outcomes, lock_time, resolution_time, status, is_demo,
   participants_count, total_staked_nim, outcome_totals, min_stake_nim, max_stake_nim)
VALUES

-- ═══════════════════════════════════════════════════════════════════════════
-- SPORTS  (3 predictions)
-- ═══════════════════════════════════════════════════════════════════════════

(
  'Will the Kansas City Chiefs beat the Buffalo Bills on Thanksgiving night, Nov 26?',
  'NFL Thanksgiving nightcap on NBC/Peacock. Kansas City visits Buffalo in the Week 12 Sunday Night Football slot on Thursday, Nov 26. Market settles on the final score at the end of regulation or overtime.',
  'SPORTS',
  '[{"key":"CHIEFS","label":"Chiefs win"},{"key":"BILLS","label":"Bills win"}]'::jsonb,
  now() + interval '2 days',
  now() + interval '4 days',
  'OPEN', false, 0, 0, '{}'::jsonb, 1, 500
),
(
  'Who wins the 76ers-Heat Emirates NBA Cup clash on Nov 25?',
  'Emirates NBA Cup East Group B clash on Wednesday, Nov 25 (5 p.m. ET, ESPN). Miami visits Philadelphia. Result after regulation or overtime.',
  'SPORTS',
  '[{"key":"SIXERS","label":"76ers win"},{"key":"HEAT","label":"Heat win"}]'::jsonb,
  now() + interval '1 day',
  now() + interval '3 days',
  'OPEN', false, 0, 0, '{}'::jsonb, 1, 500
),
(
  'Will Chelsea beat Liverpool in the Premier League on Dec 5?',
  'Premier League matchday 14 headliner at Stamford Bridge on Saturday, Dec 5 (12:30 GMT, TNT Sports). Market settles YES only on a Chelsea win; a Liverpool win or a draw settles NO.',
  'SPORTS',
  '[{"key":"YES","label":"Chelsea win"},{"key":"NO","label":"Liverpool win or draw"}]'::jsonb,
  now() + interval '11 days',
  now() + interval '13 days',
  'OPEN', false, 0, 0, '{}'::jsonb, 1, 500
),

-- ═══════════════════════════════════════════════════════════════════════════
-- CRYPTO  (3 predictions)
-- ═══════════════════════════════════════════════════════════════════════════

(
  'Will Bitcoin close above $65,000 on December 5?',
  'BTC rebounded to around $63,400 on Nov 23 after a brutal November sell-off, with a 24-hour range of $60,358 to $64,446. Settles on the CoinGecko daily close (UTC midnight) on Dec 5.',
  'CRYPTO',
  '[{"key":"ABOVE","label":"Above $65k"},{"key":"BELOW","label":"At or below $65k"}]'::jsonb,
  now() + interval '11 days',
  now() + interval '13 days',
  'OPEN', false, 0, 0, '{}'::jsonb, 1, 1000
),
(
  'Will Ethereum drop below $1,600 before December 7?',
  'ETH is on a seven-week losing streak near yearly lows, reclaiming $1,791 on Nov 23 after touching $1,696. Settles YES if the CoinGecko spot price closes below $1,600 on any day before Dec 7 UTC midnight.',
  'CRYPTO',
  '[{"key":"YES","label":"Drops below $1.6k"},{"key":"NO","label":"Holds above $1.6k"}]'::jsonb,
  now() + interval '13 days',
  now() + interval '15 days',
  'OPEN', false, 0, 0, '{}'::jsonb, 1, 1000
),
(
  'Will NIM gain more than 10% against USD between Nov 23 and Dec 7?',
  'Uses the NIM/USD price on CoinGecko at 00:00 UTC Nov 23 as the baseline (~$0.000169). Settles on the 00:00 UTC Dec 7 close. YES if NIM is up more than 10% over the window, NO otherwise.',
  'CRYPTO',
  '[{"key":"UP10","label":"Up more than 10%"},{"key":"FLAT_DOWN","label":"Flat or down"}]'::jsonb,
  now() + interval '13 days',
  now() + interval '15 days',
  'OPEN', false, 0, 0, '{}'::jsonb, 1, 500
),

-- ═══════════════════════════════════════════════════════════════════════════
-- ESPORTS  (3 predictions)
-- ═══════════════════════════════════════════════════════════════════════════

(
  'Will the PGL Major Singapore CS2 champion come from a European or CIS roster?',
  'PGL Major Singapore (CS2) runs Nov 24 to Dec 13 with 32 teams and a $1.25M prize pool; the best-of-five grand final is Dec 13 at the Singapore Indoor Stadium. Settles YES if the champion is a European or CIS roster, NO otherwise.',
  'ESPORTS',
  '[{"key":"EU_CIS","label":"European or CIS"},{"key":"NON_EU","label":"Non-European"}]'::jsonb,
  now() + interval '19 days',
  now() + interval '20 days',
  'OPEN', false, 0, 0, '{}'::jsonb, 1, 750
),
(
  'Will a Western European team win DreamLeague Season 30 (Dota 2)?',
  'DreamLeague Season 30 (Dota 2, ESL Pro Tour) runs Dec 2 to 13 with 24 teams and a $750k prize pool. Settles YES if the grand final champion is a Western European (WEU) team, NO if the winner is from any other region.',
  'ESPORTS',
  '[{"key":"WEU","label":"Western Europe"},{"key":"FIELD","label":"Another region"}]'::jsonb,
  now() + interval '19 days',
  now() + interval '20 days',
  'OPEN', false, 0, 0, '{}'::jsonb, 1, 500
),
(
  'Will LOUD win Red Bull Home Ground 2026 in Los Angeles?',
  'Red Bull Home Ground 2026 brings 10 teams to the Shrine Auditorium in Los Angeles, Dec 10 to 13, including 100 Thieves, G2, NRG, Sentinels, T1, ZETA DIVISION and Fnatic. LOUD arrive as the 2026 VALORANT world champions. Settles YES if LOUD wins the tournament.',
  'ESPORTS',
  '[{"key":"LOUD_WIN","label":"LOUD wins"},{"key":"OTHER","label":"Another team wins"}]'::jsonb,
  now() + interval '19 days',
  now() + interval '20 days',
  'OPEN', false, 0, 0, '{}'::jsonb, 1, 500
),

-- ═══════════════════════════════════════════════════════════════════════════
-- TECH  (3 predictions)
-- ═══════════════════════════════════════════════════════════════════════════

(
  'Will Nvidia (NVDA) close above $180 before December 5?',
  'Nvidia shares surged about 31% to roughly $165 on Nov 23 after the board reinstated Jensen Huang as CEO, adding close to $1T in market cap. Settles YES if NVDA closes above $180 on any trading day before Dec 5.',
  'TECH',
  '[{"key":"ABOVE","label":"Closes above $180"},{"key":"AT_OR_BELOW","label":"Stays at or below $180"}]'::jsonb,
  now() + interval '11 days',
  now() + interval '13 days',
  'OPEN', false, 0, 0, '{}'::jsonb, 1, 1000
),
(
  'Will Anthropic (ANT) close above its $97 first-day close before December 5?',
  'Anthropic (ANT) priced its IPO at $83, opened at $111.50 and closed its first day at $97.17, then faded to roughly $88. Settles YES if ANT closes above its $97.17 first-day close on any trading day before Dec 5.',
  'TECH',
  '[{"key":"ABOVE","label":"Closes above $97"},{"key":"AT_OR_BELOW","label":"Stays at or below $97"}]'::jsonb,
  now() + interval '11 days',
  now() + interval '13 days',
  'OPEN', false, 0, 0, '{}'::jsonb, 1, 1000
),
(
  'Will Apple (AAPL) close above $355 before December 5?',
  'Apple is at $349.21, up about 29% year-to-date on record fiscal 2026 revenue of $478.8B. Settles YES if AAPL closes above $355 on any trading day before Dec 5.',
  'TECH',
  '[{"key":"ABOVE","label":"Closes above $355"},{"key":"AT_OR_BELOW","label":"Stays at or below $355"}]'::jsonb,
  now() + interval '11 days',
  now() + interval '13 days',
  'OPEN', false, 0, 0, '{}'::jsonb, 1, 750
),

-- ═══════════════════════════════════════════════════════════════════════════
-- CULTURE  (3 predictions)
-- ═══════════════════════════════════════════════════════════════════════════

(
  'Will Spider-Man: Brand New Day cross $1 billion at the domestic box office before Dec 7?',
  'Spider-Man: Brand New Day is the highest-grossing domestic film of all time at roughly $959M, but has not yet crossed $1B in North America. Settles on the Box Office Mojo domestic cumulative total as of Dec 7.',
  'CULTURE',
  '[{"key":"YES","label":"Crosses $1B domestic"},{"key":"NO","label":"Falls short of $1B"}]'::jsonb,
  now() + interval '13 days',
  now() + interval '15 days',
  'OPEN', false, 0, 0, '{}'::jsonb, 1, 500
),
(
  'Will Avengers: Doomsday out-open Dune: Part Three on the Dec 18-20 opening weekend?',
  'Avengers: Doomsday and Dune: Part Three both open on Dec 18 in a box-office collision the press has dubbed Dunesday. Dune holds the U.S. IMAX exclusivity window. Settles on the Dec 18-20 domestic opening weekend; YES if Avengers: Doomsday grosses more, NO if Dune: Part Three wins or ties.',
  'CULTURE',
  '[{"key":"DOOMSDAY","label":"Avengers: Doomsday"},{"key":"DUNE_OR_TIE","label":"Dune: Part Three wins or ties"}]'::jsonb,
  now() + interval '24 days',
  now() + interval '28 days',
  'OPEN', false, 0, 0, '{}'::jsonb, 1, 500
),
(
  'Will a new album debut at #1 on the Billboard 200 the week of Dec 6?',
  'Covers the Billboard 200 chart dated Dec 6, 2026 (published in early December). Settles YES if any album makes its debut at the #1 position.',
  'CULTURE',
  '[{"key":"YES","label":"New #1 debut"},{"key":"NO","label":"No new debut at #1"}]'::jsonb,
  now() + interval '8 days',
  now() + interval '10 days',
  'OPEN', false, 0, 0, '{}'::jsonb, 1, 300
),

-- ═══════════════════════════════════════════════════════════════════════════
-- WORLD  (3 predictions)
-- ═══════════════════════════════════════════════════════════════════════════

(
  'Will the US federal government shut down when funding lapses on December 12, 2026?',
  'Federal funding under the September continuing resolution expires Dec 11; a lapse would begin at 12:01 a.m. on Dec 12. House Republicans face a crunch before the Democratic takeover in January. Settles YES if a shutdown begins on or after Dec 12, NO if funding is extended.',
  'WORLD',
  '[{"key":"SHUTDOWN","label":"Shutdown begins"},{"key":"FUNDED","label":"Funding extended"}]'::jsonb,
  now() + interval '17 days',
  now() + interval '19 days',
  'OPEN', false, 0, 0, '{}'::jsonb, 1, 500
),
(
  'Will Brent crude close below $85/barrel before December 7?',
  'Brent crude slid to roughly $90 on Nov 23 as returning Middle East and Libyan supply outweighed Gulf attack risks. Settles YES if the Brent front-month futures close falls below $85/barrel on any trading day before Dec 7.',
  'WORLD',
  '[{"key":"YES","label":"Drops below $85"},{"key":"NO","label":"Stays at or above $85"}]'::jsonb,
  now() + interval '13 days',
  now() + interval '15 days',
  'OPEN', false, 0, 0, '{}'::jsonb, 1, 500
),
(
  'Will the Democrats'' US House majority be officially certified before December 7?',
  'Democrats flipped the US House in the Nov 3 midterms. Settles YES when the Associated Press or state certifications officially confirm the Democratic majority before Dec 7, NO if the final call is still outstanding.',
  'WORLD',
  '[{"key":"CERTIFIED","label":"Certified by Dec 7"},{"key":"NOT_YET","label":"Not certified by Dec 7"}]'::jsonb,
  now() + interval '13 days',
  now() + interval '15 days',
  'OPEN', false, 0, 0, '{}'::jsonb, 1, 500
);
