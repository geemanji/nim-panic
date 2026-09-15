/**
 * NIM Panic — Progression system helpers (client-safe).
 *
 * Panic Score  = the primary leaderboard metric (replaces raw NIM balance ranking)
 * XP           = cumulative experience that drives level/rank display
 * Win Streak   = consecutive correct predictions
 *
 * All formulas here must be kept in sync with settlement.server.ts where
 * server-side score updates happen.
 */

// ─── XP thresholds ────────────────────────────────────────────────────────────

export type PanicRank = {
  name: string;
  minXp: number;
  /** Tailwind color class */
  color: string;
  /** Short badge label */
  badge: string;
};

export const PANIC_RANKS: PanicRank[] = [
  { name: "Rookie",    minXp: 0,     color: "text-muted-foreground", badge: "ROOKIE"    },
  { name: "Caller",    minXp: 100,   color: "text-success",          badge: "CALLER"    },
  { name: "Predictor", minXp: 500,   color: "text-cat-crypto",       badge: "PREDICTOR" },
  { name: "Analyst",   minXp: 1500,  color: "text-cat-tech",         badge: "ANALYST"   },
  { name: "Oracle",    minXp: 4000,  color: "text-cat-esports",      badge: "ORACLE"    },
  { name: "Panic God", minXp: 10000, color: "text-primary",          badge: "PANIC GOD" },
];

export function rankForXp(xp: number): PanicRank {
  let rank = PANIC_RANKS[0]!;
  for (const r of PANIC_RANKS) {
    if (xp >= r.minXp) rank = r;
  }
  return rank;
}

/** XP awarded per event. */
export const XP_REWARDS = {
  /** Correct prediction */
  WIN: 50,
  /** Any prediction made */
  PARTICIPATE: 10,
  /** Each additional win in an active streak (bonus on top of WIN) */
  STREAK_BONUS: 15,
  /** Daily challenge completion */
  DAILY_CHALLENGE: 75,
} as const;

// ─── Panic Score ──────────────────────────────────────────────────────────────

/**
 * Computes the Panic Score from raw stats.
 * Must mirror the formula in settlement.server.ts `refreshPlayerStats()`.
 *
 * Formula: wins*10 + streak*3 + predictions
 */
export function panicScore(stats: {
  wins: number;
  streak: number;
  predictions: number;
}): number {
  return stats.wins * 10 + stats.streak * 3 + stats.predictions;
}

/** Progress fraction [0,1] toward the next rank. */
export function xpProgress(xp: number): number {
  const current = rankForXp(xp);
  const currentIdx = PANIC_RANKS.indexOf(current);
  const next = PANIC_RANKS[currentIdx + 1];
  if (!next) return 1;
  const range = next.minXp - current.minXp;
  return Math.min(1, (xp - current.minXp) / range);
}

// ─── Game modes ───────────────────────────────────────────────────────────────

export type GameMode =
  | "quick_panic"    // single fast prediction, any category
  | "daily_panic"    // curated daily set, one per category
  | "category"       // browse & predict within a specific category
  | "one_v_one";     // 1v1 challenge against another player

export type GameModeInfo = {
  id: GameMode;
  label: string;
  description: string;
  emoji: string;
  available: boolean;
};

export const GAME_MODES: GameModeInfo[] = [
  {
    id: "quick_panic",
    label: "Quick Panic",
    description: "Fastest prediction near the lock",
    emoji: "⚡",
    available: true,
  },
  {
    id: "daily_panic",
    label: "Daily Panic",
    description: "Today's featured calls",
    emoji: "🔥",
    available: true,
  },
  {
    id: "category",
    label: "Category Challenge",
    description: "Go deep on what you know",
    emoji: "🏅",
    available: true,
  },
  {
    id: "one_v_one",
    label: "1v1 Panic",
    description: "Challenge a friend head-to-head",
    emoji: "⚔️",
    available: false,  // Coming soon
  },
];
