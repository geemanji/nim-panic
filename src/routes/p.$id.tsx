import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Share2 } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Countdown } from "@/components/Countdown";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useWallet } from "@/hooks/useWallet";
import { confirmEntry, createEntry, getGameConfig, getPrediction } from "@/lib/game.functions";
import { crowdShare, formatNim, payoutMultiplier } from "@/lib/nim";

export const Route = createFileRoute("/p/$id")({
  head: () => ({
    meta: [
      { title: "Make your call — NIM Panic" },
      {
        name: "description",
        content: "Pick your outcome, see live odds and stake NIM on this prediction in NIM Panic.",
      },
      { property: "og:title", content: "Make your call — NIM Panic" },
      {
        property: "og:description",
        content: "Live odds, real NIM stakes. Back your prediction inside Nimiq Pay.",
      },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PredictionDetail,
});

type Stage = "idle" | "creating" | "awaiting" | "verifying" | "done";

function PredictionDetail() {
  const { id } = Route.useParams();
  const queryClient = useQueryClient();
  const wallet = useWallet();
  const [outcome, setOutcome] = useState<string | null>(null);
  const [stake, setStake] = useState("10");
  const [stage, setStage] = useState<Stage>("idle");
  const [note, setNote] = useState<string | null>(null);

  const prediction = useQuery({
    queryKey: ["prediction", id],
    queryFn: () => getPrediction({ data: { id } }),
  });
  const config = useQuery({ queryKey: ["config"], queryFn: () => getGameConfig() });

  const place = useMutation({
    mutationFn: async () => {
      if (!outcome) throw new Error("Pick an outcome first.");
      const stakeNim = Number(stake);
      if (!Number.isFinite(stakeNim) || stakeNim <= 0) throw new Error("Enter a valid stake.");

      setNote(null);
      setStage("creating");
      const entry = await createEntry({
        data: { predictionId: id, outcome, stakeNim },
      });

      setStage("awaiting");
      const transactionHash = await wallet.sendStake({
        recipient: entry.recipient,
        valueLuna: entry.valueLuna,
        memo: entry.memo,
      });

      setStage("verifying");
      return confirmEntry({ data: { entryId: entry.entryId, transactionHash } });
    },
    onSuccess: async (result) => {
      setStage("done");
      if (result.verified) {
        toast.success("Prediction locked in");
        setNote(null);
      } else {
        setNote(("reason" in result && result.reason) || "Payment sent — waiting for confirmation.");
      }
      await queryClient.invalidateQueries({ queryKey: ["prediction", id] });
      await queryClient.invalidateQueries({ queryKey: ["picks"] });
    },
    onError: (error) => {
      setStage("idle");
      toast.error(error instanceof Error ? error.message : "Your prediction did not go through");
    },
  });

  const share = async () => {
    const url = typeof window !== "undefined" ? window.location.href : "";
    const text = `I'm calling it on NIM Panic: ${prediction.data?.question ?? ""}`;
    try {
      if (navigator.share) await navigator.share({ title: "NIM Panic", text, url });
      else {
        await navigator.clipboard.writeText(`${text} ${url}`);
        toast.success("Link copied");
      }
    } catch {
      /* user dismissed the share sheet */
    }
  };

  if (prediction.isLoading) {
    return (
      <AppShell>
        <p className="text-sm text-muted-foreground">Loading prediction…</p>
      </AppShell>
    );
  }

  const p = prediction.data;
  if (!p) {
    return (
      <AppShell>
        <div className="rounded-2xl border border-border bg-card p-6 text-center">
          <h1 className="font-display text-lg font-bold">Prediction unavailable</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            This market was removed or never published.
          </p>
          <Link to="/" className="mt-4 inline-block text-sm font-semibold text-primary">
            Back to markets
          </Link>
        </div>
      </AppShell>
    );
  }

  const open = p.status === "OPEN";
  const stakeNim = Number(stake) || 0;
  const multiplier = outcome ? payoutMultiplier(p.outcome_totals, outcome, p.outcomes) : 0;
  const busy = stage === "creating" || stage === "awaiting" || stage === "verifying";
  const stakingBlocked = config.data ? !config.data.stakingEnabled : false;

  return (
    <AppShell>
      <div className="flex items-center justify-between">
        <Link to="/" className="flex items-center gap-1 text-sm text-muted-foreground">
          <ArrowLeft className="size-4" /> Markets
        </Link>
        <button onClick={share} className="flex items-center gap-1 text-sm text-primary">
          <Share2 className="size-4" /> Share
        </button>
      </div>

      <section className="mt-3 rounded-2xl border border-border bg-card p-4">
        <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wide">
          <span className="rounded-full bg-surface-2 px-2 py-0.5 text-muted-foreground">
            {p.category}
          </span>
          {p.is_demo && (
            <span className="rounded-full bg-accent/20 px-2 py-0.5 text-accent">Demo</span>
          )}
          <span className="ml-auto font-bold text-primary tabular">
            <Countdown target={p.lock_time} />
          </span>
        </div>
        <h1 className="mt-2 font-display text-xl font-bold leading-snug">{p.question}</h1>
        {p.description && (
          <p className="mt-2 text-sm text-muted-foreground">{p.description}</p>
        )}
        <p className="mt-3 text-[11px] text-muted-foreground tabular">
          {p.participants_count} players · {formatNim(p.total_staked_nim)} NIM in the pool
        </p>
      </section>

      <section className="mt-4 space-y-2">
        {p.outcomes.map((o) => {
          const share = crowdShare(p.outcome_totals, o.key, p.outcomes);
          const selected = outcome === o.key;
          const won = p.winning_outcome === o.key;
          return (
            <button
              key={o.key}
              disabled={!open}
              onClick={() => setOutcome(o.key)}
              className={`w-full rounded-2xl border px-4 py-3 text-left transition-colors disabled:opacity-70 ${
                won
                  ? "border-success bg-success/10"
                  : selected
                    ? "border-primary bg-primary/10"
                    : "border-border bg-card"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-display font-bold">{o.label}</span>
                <span className="text-sm font-semibold text-primary tabular">
                  {payoutMultiplier(p.outcome_totals, o.key, p.outcomes).toFixed(2)}×
                </span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-2">
                <div className="h-full rounded-full bg-accent" style={{ width: `${share}%` }} />
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground tabular">
                {share}% of the crowd is here
              </p>
            </button>
          );
        })}
      </section>

      {open && (
        <section className="mt-4 rounded-2xl border border-border bg-card p-4">
          <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Your stake (NIM)
          </label>
          <Input
            type="number"
            inputMode="decimal"
            min={p.min_stake_nim}
            max={p.max_stake_nim}
            value={stake}
            onChange={(event) => setStake(event.target.value)}
            className="mt-2 h-12 text-lg tabular"
          />
          <div className="mt-2 flex gap-2">
            {[5, 10, 25, 50].map((amount) => (
              <button
                key={amount}
                onClick={() => setStake(String(amount))}
                className="flex-1 rounded-xl bg-surface py-2 text-xs font-semibold tabular"
              >
                {amount}
              </button>
            ))}
          </div>
          <p className="mt-3 text-sm text-muted-foreground">
            Limits {formatNim(p.min_stake_nim)}–{formatNim(p.max_stake_nim)} NIM · potential payout{" "}
            <span className="font-semibold text-primary tabular">
              {outcome ? formatNim(stakeNim * multiplier) : "—"} NIM
            </span>
          </p>

          {!wallet.signedIn ? (
            <Button
              className="mt-4 h-12 w-full text-base font-bold"
              onClick={wallet.connect}
              disabled={wallet.connecting}
            >
              {wallet.connecting ? "Connecting…" : "Connect wallet to predict"}
            </Button>
          ) : (
            <Button
              className="mt-4 h-12 w-full text-base font-bold"
              onClick={() => place.mutate()}
              disabled={busy || !outcome || stakingBlocked}
            >
              {stage === "creating" && "Preparing…"}
              {stage === "awaiting" && "Approve in Nimiq Pay…"}
              {stage === "verifying" && "Verifying on-chain…"}
              {(stage === "idle" || stage === "done") && "Predict with NIM"}
            </Button>
          )}

          {stakingBlocked && (
            <p className="mt-2 text-[11px] text-warning">
              Staking is paused until the game treasury is configured.
            </p>
          )}
          {note && (
            <p className="mt-3 rounded-xl bg-surface px-3 py-2 text-[11px] leading-snug text-muted-foreground">
              {note}
            </p>
          )}
        </section>
      )}

      {!open && (
        <p className="mt-4 rounded-2xl border border-border bg-card p-4 text-sm text-muted-foreground">
          This market is {p.status.toLowerCase()}
          {p.winning_outcome
            ? ` — winning outcome: ${p.outcomes.find((o) => o.key === p.winning_outcome)?.label ?? p.winning_outcome}.`
            : "."}
        </p>
      )}
    </AppShell>
  );
}
