import { Link } from "@tanstack/react-router";
import { Coins, Users } from "lucide-react";
import { crowdShare, formatNim, payoutMultiplier, type FeedPrediction } from "@/lib/nim";
import { Countdown } from "./Countdown";

export function PredictionCard({ prediction }: { prediction: FeedPrediction }) {
  const open = prediction.status === "OPEN";

  return (
    <Link
      to="/p/$id"
      params={{ id: prediction.id }}
      className="block rounded-2xl border border-border bg-card p-4 transition-transform active:scale-[0.99]"
    >
      <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wide">
        <span className="rounded-full bg-surface-2 px-2 py-0.5 text-muted-foreground">
          {prediction.category}
        </span>
        {prediction.is_demo && (
          <span className="rounded-full bg-accent/20 px-2 py-0.5 text-accent">Demo</span>
        )}
        <span
          className={`ml-auto rounded-full px-2 py-0.5 ${
            open ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"
          }`}
        >
          {open ? "Live" : prediction.status}
        </span>
      </div>

      <h3 className="mt-2 font-display text-base font-bold leading-snug">{prediction.question}</h3>

      <div className="mt-3 grid grid-cols-2 gap-2">
        {prediction.outcomes.map((outcome) => {
          const share = crowdShare(prediction.outcome_totals, outcome.key, prediction.outcomes);
          const isWinner = prediction.winning_outcome === outcome.key;
          return (
            <div
              key={outcome.key}
              className={`rounded-xl border px-3 py-2 ${
                isWinner ? "border-success bg-success/10" : "border-border bg-surface"
              }`}
            >
              <p className="truncate text-xs font-semibold">{outcome.label}</p>
              <p className="text-[11px] text-muted-foreground tabular">
                {payoutMultiplier(prediction.outcome_totals, outcome.key, prediction.outcomes).toFixed(2)}× ·{" "}
                {share}%
              </p>
            </div>
          );
        })}
      </div>

      <div className="mt-3 flex items-center gap-3 text-[11px] text-muted-foreground tabular">
        <span className="flex items-center gap-1">
          <Users className="size-3.5" /> {prediction.participants_count}
        </span>
        <span className="flex items-center gap-1">
          <Coins className="size-3.5" /> {formatNim(prediction.total_staked_nim)} NIM
        </span>
        <span className="ml-auto font-semibold text-primary">
          <Countdown target={prediction.lock_time} />
        </span>
      </div>
    </Link>
  );
}
