/** Panic tiers — how frantic a market feels as its lock time closes in. */
export type PanicLevel = "panic" | "hot" | "warm" | "calm" | "closed";

export type PanicTier = {
  level: PanicLevel;
  label: string;
  /** Border + background treatment for cards. */
  card: string;
  /** Badge treatment. */
  badge: string;
  /** Countdown text treatment. */
  text: string;
};

const MINUTE = 60_000;

export function panicTier(msRemaining: number): PanicTier {
  if (msRemaining <= 0) {
    return {
      level: "closed",
      label: "Closed",
      card: "border-border bg-card",
      badge: "bg-muted text-muted-foreground",
      text: "text-muted-foreground",
    };
  }
  if (msRemaining <= 5 * MINUTE) {
    return {
      level: "panic",
      label: "Panic",
      card: "border-panic bg-card panic-shake panic-ring",
      badge: "bg-panic text-panic-foreground",
      text: "text-panic panic-blink",
    };
  }
  if (msRemaining <= 30 * MINUTE) {
    return {
      level: "hot",
      label: "Closing",
      card: "border-panic/50 bg-card",
      badge: "bg-panic/20 text-panic",
      text: "text-panic",
    };
  }
  if (msRemaining <= 3 * 60 * MINUTE) {
    return {
      level: "warm",
      label: "Heating up",
      card: "border-warning/40 bg-card",
      badge: "bg-warning/15 text-warning",
      text: "text-warning",
    };
  }
  return {
    level: "calm",
    label: "Live",
    card: "border-border bg-card",
    badge: "bg-success/15 text-success",
    text: "text-primary",
  };
}

/** Panic score 0-100 used for the urgency meter. */
export function panicScore(msRemaining: number): number {
  const window = 6 * 60 * MINUTE;
  if (msRemaining <= 0) return 100;
  return Math.round(Math.max(0, Math.min(100, (1 - msRemaining / window) * 100)));
}
