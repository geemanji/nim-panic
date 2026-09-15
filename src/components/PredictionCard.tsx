import { Link } from "@tanstack/react-router";
import { Users, Coins } from "lucide-react";
import { crowdShare, formatNim, msLeft, payoutMultiplier, type FeedPrediction } from "@/lib/nim";
import { panicTier } from "@/lib/panic";
import { getCategoryByKey } from "@/lib/categories";
import { useNow } from "@/hooks/useNow";
import { Countdown } from "./Countdown";

export function PredictionCard({ prediction }: { prediction: FeedPrediction }) {
  const now = useNow();
  const open = prediction.status === "OPEN";
  const remaining = msLeft(prediction.lock_time, now);
  const tier = panicTier(remaining);
  const cat = getCategoryByKey(prediction.category);

  return (
    <Link
      to="/p/$id"
      params={{ id: prediction.id }}
      className={`block rounded-2xl border p-4 transition-all active:scale-[0.985] ${
        open ? tier.card : "border-border bg-card opacity-75"
      }`}
    >
      {/* ── Top row: category + status ── */}
      <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest">
        <span
          className={`rounded-full px-2 py-0.5 ${
            cat ? `${cat.bg} ${cat.color}` : "bg-surface-2 text-muted-foreground"
          }`}
        >
          {cat?.emoji} {cat?.label ?? prediction.category}
        </span>

        {prediction.is_demo && (
          <span className="rounded-full bg-accent/20 px-2 py-0.5 text-accent">Demo</span>
        )}

        <span
          className={`ml-auto rounded-full px-2.5 py-0.5 ${
            open ? tier.badge : "bg-muted text-muted-foreground"
          }`}
        >
          {open ? tier.label : prediction.status}
        </span>
      </div>

      {/* ── Question ── */}
      <h3 className="mt-2.5 font-display text-base font-bold leading-snug">
        {prediction.question}
      </h3>

      {/* ── Outcome buttons (game-card style) ── */}
      <div
        className={`mt-3 grid gap-2 ${prediction.outcomes.length === 2 ? "grid-cols-2" : "grid-cols-1"}`}
      >
        {prediction.outcomes.map((outcome) => {
          const share = crowdShare(prediction.outcome_totals, outcome.key, prediction.outcomes);
          const mult = payoutMultiplier(
            prediction.outcome_totals,
            outcome.key,
            prediction.outcomes,
          );
          const isWinner = prediction.winning_outcome === outcome.key;

          return (
            <div
              key={outcome.key}
              className={`relative overflow-hidden rounded-xl border px-3 py-2.5 ${
                isWinner
                  ? "border-success bg-success/10"
                  : open
                    ? "border-border bg-surface hover:border-primary/40 hover:bg-primary/5"
                    : "border-border bg-surface"
              }`}
            >
              {/* Crowd-share bar behind the content */}
              {open && (
                <div
                  className="absolute inset-y-0 left-0 rounded-l-xl bg-primary/6 transition-all"
                  style={{ width: `${share}%` }}
                />
              )}

              <div className="relative flex items-center justify-between">
                <span className="font-display text-sm font-bold">{outcome.label}</span>
                <span
                  className={`font-display text-sm font-bold tabular ${
                    isWinner ? "text-success" : "text-primary"
                  }`}
                >
                  {mult.toFixed(2)}×
                </span>
              </div>
              <p className="relative mt-0.5 text-[10px] text-muted-foreground tabular">
                {share}% of players
              </p>
            </div>
          );
        })}
      </div>

      {/* ── Footer stats ── */}
      <div className="mt-3 flex items-center gap-3 text-[11px] text-muted-foreground tabular">
        <span className="flex items-center gap-1">
          <Users className="size-3.5" />
          {prediction.participants_count}
        </span>
        <span className="flex items-center gap-1">
          <Coins className="size-3.5" />
          {formatNim(prediction.total_staked_nim)} NIM
        </span>

        {open && (
          <span className={`ml-auto font-bold ${tier.text}`}>
            {tier.level === "panic" && <span className="mr-1">🔒</span>}
            LOCKS <Countdown target={prediction.lock_time} urgent />
          </span>
        )}
        {!open && (
          <span className="ml-auto text-muted-foreground/60 uppercase text-[10px] font-bold">
            {prediction.status}
          </span>
        )}
      </div>
    </Link>
  );
}
