/** Client-safe NIM helpers. 1 NIM = 100,000 Luna. */
export const LUNA_PER_NIM = 100_000;

export function nimToLuna(nim: number): number {
  return Math.round(nim * LUNA_PER_NIM);
}

export function lunaToNim(luna: number): number {
  return luna / LUNA_PER_NIM;
}

export function formatNim(value: number | string, maxDecimals = 2): string {
  const n = typeof value === "string" ? Number(value) : value;
  if (!Number.isFinite(n)) return "0";
  const rounded = Math.round(n * 10 ** maxDecimals) / 10 ** maxDecimals;
  return rounded.toLocaleString("en-US", { maximumFractionDigits: maxDecimals });
}

export function shortenAddress(address: string): string {
  const clean = address.replace(/\s+/g, "");
  if (clean.length < 12) return address;
  return `${clean.slice(0, 8)}…${clean.slice(-4)}`;
}

export type PredictionStatus = "OPEN" | "LOCKED" | "RESOLVED" | "SETTLED" | "VOID" | "DRAFT";

export type Outcome = { key: string; label: string };

export type FeedPrediction = {
  id: string;
  question: string;
  description: string | null;
  category: string;
  outcomes: Outcome[];
  lock_time: string;
  resolution_time: string;
  status: PredictionStatus;
  winning_outcome: string | null;
  is_demo: boolean;
  participants_count: number;
  total_staked_nim: number;
  outcome_totals: Record<string, number>;
  min_stake_nim: number;
  max_stake_nim: number;
};

/** Parimutuel-style payout multiplier, with a floor so an empty pool still reads sensibly. */
export function payoutMultiplier(
  totals: Record<string, number>,
  outcomeKey: string,
  outcomes: Outcome[],
): number {
  const pool = outcomes.reduce((sum, o) => sum + (Number(totals[o.key]) || 0), 0);
  const onOutcome = Number(totals[outcomeKey]) || 0;
  if (pool <= 0 || onOutcome <= 0) return 2;
  const raw = (pool * 0.97) / onOutcome;
  return Math.max(1.05, Math.min(9.99, raw));
}

export function crowdShare(
  totals: Record<string, number>,
  outcomeKey: string,
  outcomes: Outcome[],
): number {
  const pool = outcomes.reduce((sum, o) => sum + (Number(totals[o.key]) || 0), 0);
  if (pool <= 0) return 0;
  return Math.round(((Number(totals[outcomeKey]) || 0) / pool) * 100);
}

export function msLeft(iso: string, now = Date.now()): number {
  return Math.max(0, new Date(iso).getTime() - now);
}

export function formatCountdown(ms: number): string {
  const total = Math.floor(ms / 1000);
  const days = Math.floor(total / 86400);
  const hours = Math.floor((total % 86400) / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}
