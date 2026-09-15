-- ─── User Preferences ────────────────────────────────────────────────────────
-- Stores per-user onboarding state and category preferences.
-- preferred_categories is an array of category keys, e.g. {"CRYPTO","SPORTS"}.

CREATE TABLE public.user_preferences (
  user_id             uuid    PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  onboarding_complete boolean NOT NULL DEFAULT false,
  preferred_categories text[]  NOT NULL DEFAULT '{}',
  updated_at          timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.user_preferences TO authenticated;
GRANT ALL ON public.user_preferences TO service_role;

ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own preferences readable"
  ON public.user_preferences FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "own preferences writable"
  ON public.user_preferences FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "own preferences updatable"
  ON public.user_preferences FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

-- ─── Profiles — add progression columns ──────────────────────────────────────
-- xp          : cumulative experience points
-- panic_score : current computed Panic Score (denormalised from leaderboard formula)

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS xp          integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS panic_score integer NOT NULL DEFAULT 0;

-- ─── Leaderboard stats — add all-time period support ─────────────────────────
-- The period column already supports arbitrary strings; we just need to ensure
-- the "alltime" bucket exists for new upserts (handled in settlement.server.ts).
-- No schema change required — the existing table already handles it.

-- ─── Backfill existing profiles with a default preferences row ───────────────
INSERT INTO public.user_preferences (user_id, onboarding_complete, preferred_categories)
SELECT id, false, '{}'
FROM auth.users
ON CONFLICT (user_id) DO NOTHING;
