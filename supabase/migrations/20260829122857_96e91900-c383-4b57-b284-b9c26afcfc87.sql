-- Roles
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own roles readable" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- Profiles
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  wallet_address text NOT NULL UNIQUE,
  username text NOT NULL UNIQUE,
  streak integer NOT NULL DEFAULT 0,
  best_streak integer NOT NULL DEFAULT 0,
  predictions_count integer NOT NULL DEFAULT 0,
  wins_count integer NOT NULL DEFAULT 0,
  nim_won numeric(20,5) NOT NULL DEFAULT 0,
  nim_staked numeric(20,5) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own profile readable" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);

-- Wallet auth nonces (server-only)
CREATE TABLE public.auth_nonces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address text NOT NULL,
  nonce text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.auth_nonces TO service_role;
ALTER TABLE public.auth_nonces ENABLE ROW LEVEL SECURITY;

-- Predictions
CREATE TABLE public.predictions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question text NOT NULL,
  description text,
  category text NOT NULL DEFAULT 'GENERAL',
  outcomes jsonb NOT NULL,
  start_time timestamptz NOT NULL DEFAULT now(),
  lock_time timestamptz NOT NULL,
  resolution_time timestamptz NOT NULL,
  winning_outcome text,
  status text NOT NULL DEFAULT 'OPEN',
  is_demo boolean NOT NULL DEFAULT false,
  min_stake_nim numeric(20,5) NOT NULL DEFAULT 1,
  max_stake_nim numeric(20,5) NOT NULL DEFAULT 500,
  participants_count integer NOT NULL DEFAULT 0,
  total_staked_nim numeric(20,5) NOT NULL DEFAULT 0,
  outcome_totals jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT predictions_status_check CHECK (status IN ('DRAFT','OPEN','LOCKED','RESOLVED','SETTLED','VOID'))
);
GRANT SELECT ON public.predictions TO anon, authenticated;
GRANT ALL ON public.predictions TO service_role;
ALTER TABLE public.predictions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "published predictions are public" ON public.predictions FOR SELECT TO anon, authenticated USING (status <> 'DRAFT');

-- Entries
CREATE TABLE public.prediction_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prediction_id uuid NOT NULL REFERENCES public.predictions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  outcome text NOT NULL,
  stake_nim numeric(20,5) NOT NULL,
  memo text NOT NULL UNIQUE,
  transaction_hash text UNIQUE,
  status text NOT NULL DEFAULT 'PENDING_PAYMENT',
  result text,
  created_at timestamptz NOT NULL DEFAULT now(),
  confirmed_at timestamptz,
  CONSTRAINT entries_status_check CHECK (status IN ('PENDING_PAYMENT','CONFIRMED','LOCKED','WON','LOST','EXPIRED','VOID')),
  CONSTRAINT entries_stake_positive CHECK (stake_nim > 0)
);
CREATE UNIQUE INDEX prediction_entries_one_active_per_user
  ON public.prediction_entries (prediction_id, user_id)
  WHERE status <> 'EXPIRED' AND status <> 'VOID';
GRANT SELECT ON public.prediction_entries TO authenticated;
GRANT ALL ON public.prediction_entries TO service_role;
ALTER TABLE public.prediction_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own entries readable" ON public.prediction_entries FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- Settlements
CREATE TABLE public.settlements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prediction_entry_id uuid NOT NULL UNIQUE REFERENCES public.prediction_entries(id) ON DELETE CASCADE,
  payout_nim numeric(20,5) NOT NULL DEFAULT 0,
  transaction_hash text,
  status text NOT NULL DEFAULT 'PENDING_PAYOUT',
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  paid_at timestamptz,
  CONSTRAINT settlements_status_check CHECK (status IN ('NO_PAYOUT','PENDING_PAYOUT','SENT','FAILED'))
);
GRANT SELECT ON public.settlements TO authenticated;
GRANT ALL ON public.settlements TO service_role;
ALTER TABLE public.settlements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own settlements readable" ON public.settlements FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.prediction_entries e WHERE e.id = prediction_entry_id AND e.user_id = auth.uid()));

-- Leaderboard (public, denormalised username only)
CREATE TABLE public.leaderboard_stats (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  period text NOT NULL,
  username text NOT NULL,
  points integer NOT NULL DEFAULT 0,
  accuracy numeric(5,2) NOT NULL DEFAULT 0,
  wins integer NOT NULL DEFAULT 0,
  predictions integer NOT NULL DEFAULT 0,
  streak integer NOT NULL DEFAULT 0,
  nim_won numeric(20,5) NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, period)
);
GRANT SELECT ON public.leaderboard_stats TO anon, authenticated;
GRANT ALL ON public.leaderboard_stats TO service_role;
ALTER TABLE public.leaderboard_stats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "leaderboard is public" ON public.leaderboard_stats FOR SELECT TO anon, authenticated USING (true);

-- Demo predictions
INSERT INTO public.predictions (question, description, category, outcomes, lock_time, resolution_time, status, is_demo, participants_count, total_staked_nim, outcome_totals) VALUES
('Will Bitcoin close above $120K today?', 'Resolved from the daily close on the reference exchange.', 'CRYPTO', '[{"key":"YES","label":"YES"},{"key":"NO","label":"NO"}]'::jsonb, now() + interval '45 minutes', now() + interval '6 hours', 'OPEN', true, 87, 143, '{"YES":92,"NO":51}'::jsonb),
('Will Arsenal win their next match?', 'Full-time result only. A draw counts as NO.', 'SPORTS', '[{"key":"YES","label":"YES"},{"key":"NO","label":"NO"}]'::jsonb, now() + interval '3 hours', now() + interval '9 hours', 'OPEN', true, 54, 96, '{"YES":61,"NO":35}'::jsonb),
('Will Lagos record rainfall tomorrow?', 'Any measurable rainfall reported for Lagos counts as YES.', 'WEATHER', '[{"key":"YES","label":"YES"},{"key":"NO","label":"NO"}]'::jsonb, now() + interval '14 minutes', now() + interval '30 hours', 'OPEN', true, 128, 210, '{"YES":150,"NO":60}'::jsonb),
('Will Nimiq reach 10,000 active users this month?', 'Based on the published monthly active user figure.', 'NIMIQ', '[{"key":"YES","label":"YES"},{"key":"NO","label":"NO"}]'::jsonb, now() + interval '2 days', now() + interval '5 days', 'OPEN', true, 39, 74, '{"YES":48,"NO":26}'::jsonb),
('Will ETH outperform BTC this week?', 'Compares weekly percentage change of ETH and BTC.', 'CRYPTO', '[{"key":"ETH","label":"ETH"},{"key":"BTC","label":"BTC"}]'::jsonb, now() + interval '90 seconds', now() + interval '4 days', 'OPEN', true, 201, 388, '{"ETH":190,"BTC":198}'::jsonb);