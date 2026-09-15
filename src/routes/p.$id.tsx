import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Share2, Users, Coins, CheckCircle, XCircle } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Countdown } from "@/components/Countdown";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FaucetButton } from "@/components/FaucetButton";
import { useWallet } from "@/hooks/useWallet";
import {
  confirmEntry,
  createEntry,
  getGameConfig,
  getPrediction,
  getWalletBalance,
} from "@/lib/game.functions";
import { crowdShare, formatNim, payoutMultiplier } from "@/lib/nim";
import { getCategoryByKey } from "@/lib/categories";
import { panicTier } from "@/lib/panic";
import { msLeft } from "@/lib/nim";
import { useNow } from "@/hooks/useNow";

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

const QUICK_STAKES = [5, 10, 25, 50];

function PredictionDetail() {
  const { id } = Route.useParams();
  const queryClient = useQueryClient();
  const wallet = useWallet();
  const now = useNow();
  const [outcome, setOutcome] = useState<string | null>(null);
  const [stake, setStake] = useState("10");
  const [stage, setStage] = useState<Stage>("idle");
  const [note, setNote] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<"won" | "lost" | null>(null);

  const prediction = useQuery({
    queryKey: ["prediction", id],
    queryFn: () => getPrediction({ data: { id } }),
    refetchInterval: 15_000,
  });
  const config = useQuery({ queryKey: ["config"], queryFn: () => getGameConfig() });
  const balance = useQuery({
    queryKey: ["wallet-balance"],
    queryFn: () => getWalletBalance(),
    enabled: wallet.signedIn,
    retry: false,
  });

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
      const sig = await wallet.signPrediction(entry.messageToSign);

      setStage("verifying");
      return confirmEntry({
        data: {
          entryId: entry.entryId,
          publicKey: sig.publicKey,
          signature: sig.signature,
        },
      });
    },
    onSuccess: async (result) => {
      setStage("done");
      if (result.verified) {
        toast.success("Prediction locked in! 🔒");
        setNote(null);
      } else {
        setNote("Prediction recorded — waiting for final confirmation.");
      }
      await queryClient.invalidateQueries({ queryKey: ["prediction", id] });
      await queryClient.invalidateQueries({ queryKey: ["my-picks"] });
      await queryClient.invalidateQueries({ queryKey: ["feed"] });
      await queryClient.invalidateQueries({ queryKey: ["wallet-balance"] });
      await queryClient.invalidateQueries({ queryKey: ["my-profile"] });
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
      /* dismissed */
    }
  };

  if (prediction.isLoading) {
    return (
      <AppShell>
        <div className="mt-16 flex flex-col items-center gap-3 text-muted-foreground">
          <div className="size-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <p className="text-sm">Loading prediction…</p>
        </div>
      </AppShell>
    );
  }

  const p = prediction.data;
  if (!p) {
    return (
      <AppShell>
        <div className="mt-8 rounded-2xl border border-border bg-card p-6 text-center">
          <h1 className="font-display text-lg font-bold">Prediction unavailable</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            This market was removed or never published.
          </p>
          <Link to="/" className="mt-4 inline-block text-sm font-semibold text-primary">
            ← Back to markets
          </Link>
        </div>
      </AppShell>
    );
  }

  const open = p.status === "OPEN";
  const remaining = msLeft(p.lock_time, now);
  const tier = panicTier(remaining);
  const cat = getCategoryByKey(p.category);
  const stakeNim = Number(stake) || 0;
  const multiplier = outcome ? payoutMultiplier(p.outcome_totals, outcome, p.outcomes) : 0;
  const potentialPayout = outcome && stakeNim > 0 ? stakeNim * multiplier : 0;
  const busy = stage === "creating" || stage === "awaiting" || stage === "verifying";
  const isDone = stage === "done" && place.isSuccess;

  return (
    <AppShell>
      {/* ── Nav row ── */}
      <div className="flex items-center justify-between">
        <Link
          to="/"
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> Markets
        </Link>
        <button onClick={share} className="flex items-center gap-1 text-sm text-primary">
          <Share2 className="size-4" /> Share
        </button>
      </div>

      {/* ── Prediction card ── */}
      <section
        className={`mt-3 rounded-2xl border p-4 ${open ? tier.card : "border-border bg-card"}`}
      >
        {/* Category + demo + countdown */}
        <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest">
          {cat ? (
            <span className={`rounded-full px-2 py-0.5 ${cat.bg} ${cat.color}`}>
              {cat.emoji} {cat.label}
            </span>
          ) : (
            <span className="rounded-full bg-surface-2 px-2 py-0.5 text-muted-foreground">
              {p.category}
            </span>
          )}
          {p.is_demo && (
            <span className="rounded-full bg-accent/20 px-2 py-0.5 text-accent">Demo</span>
          )}

          {open && (
            <span className={`ml-auto font-display text-base font-bold tabular ${tier.text}`}>
              <Countdown target={p.lock_time} urgent />
            </span>
          )}
          {!open && (
            <span className="ml-auto rounded-full bg-muted px-2 py-0.5 text-muted-foreground">
              {p.status}
            </span>
          )}
        </div>

        {/* Question */}
        <h1 className="mt-3 font-display text-xl font-bold leading-snug">{p.question}</h1>

        {p.description && (
          <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{p.description}</p>
        )}

        {/* Player / pool stats */}
        <div className="mt-3 flex items-center gap-4 text-[11px] text-muted-foreground tabular">
          <span className="flex items-center gap-1">
            <Users className="size-3.5" /> {p.participants_count} players
          </span>
          <span className="flex items-center gap-1">
            <Coins className="size-3.5" /> {formatNim(p.total_staked_nim)} NIM staked
          </span>
        </div>
      </section>

      {/* ── Outcome selection ── */}
      <section className="mt-4 space-y-2.5">
        {p.outcomes.map((o) => {
          const share = crowdShare(p.outcome_totals, o.key, p.outcomes);
          const mult = payoutMultiplier(p.outcome_totals, o.key, p.outcomes);
          const selected = outcome === o.key;
          const won = p.winning_outcome === o.key;

          return (
            <button
              key={o.key}
              disabled={!open}
              onClick={() => {
                setOutcome(o.key);
                if (stage === "done") setStage("idle");
              }}
              className={`relative w-full overflow-hidden rounded-2xl border px-4 py-3.5 text-left transition-all disabled:opacity-70 ${
                won
                  ? "border-success bg-success/10"
                  : selected
                    ? "border-primary bg-primary/10"
                    : "border-border bg-card hover:border-primary/30"
              }`}
            >
              {/* Crowd share progress bar */}
              <div
                className={`absolute inset-y-0 left-0 transition-all ${
                  won ? "bg-success/10" : selected ? "bg-primary/8" : "bg-surface"
                }`}
                style={{ width: `${share}%` }}
              />

              <div className="relative flex items-center justify-between gap-3">
                <div>
                  <p className="font-display text-base font-bold">{o.label}</p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground tabular">
                    {share}% of the crowd ·{" "}
                    {p.outcome_totals[o.key] ? formatNim(Number(p.outcome_totals[o.key])) : "0"} NIM
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p
                    className={`font-display text-xl font-bold tabular ${
                      won ? "text-success" : selected ? "text-primary" : "text-foreground"
                    }`}
                  >
                    {mult.toFixed(2)}×
                  </p>
                  {selected && stakeNim > 0 && (
                    <p className="text-[11px] text-primary tabular">
                      = {formatNim(stakeNim * mult)} NIM
                    </p>
                  )}
                </div>
              </div>

              {/* Crowd share bar below */}
              <div className="relative mt-2 h-1 overflow-hidden rounded-full bg-surface-2">
                <div
                  className={`h-full rounded-full transition-all ${
                    won ? "bg-success" : selected ? "bg-primary" : "bg-muted-foreground/40"
                  }`}
                  style={{ width: `${share}%` }}
                />
              </div>
            </button>
          );
        })}
      </section>

      {/* ── Stake section (open markets only) ── */}
      {open && (
        <section className="mt-4 rounded-2xl border border-border bg-card p-4">
          <label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
            Your stake (NIM)
          </label>

          <Input
            type="number"
            inputMode="decimal"
            min={p.min_stake_nim}
            max={p.max_stake_nim}
            value={stake}
            onChange={(e) => setStake(e.target.value)}
            className="mt-2 h-14 font-display text-2xl font-bold tabular"
          />

          {/* Quick pick amounts */}
          <div className="mt-2.5 grid grid-cols-4 gap-2">
            {QUICK_STAKES.map((amount) => (
              <button
                key={amount}
                onClick={() => setStake(String(amount))}
                className={`rounded-xl py-2.5 text-sm font-bold tabular transition-colors ${
                  Number(stake) === amount
                    ? "bg-primary/20 text-primary border border-primary/40"
                    : "bg-surface text-muted-foreground hover:bg-surface-2"
                }`}
              >
                {amount}
              </button>
            ))}
          </div>

          {/* Limits + payout preview */}
          <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
            <span>
              Min {formatNim(p.min_stake_nim)} · Max {formatNim(p.max_stake_nim)} NIM
            </span>
            {outcome && potentialPayout > 0 && (
              <span className="font-bold text-primary tabular">
                Win {formatNim(potentialPayout)} NIM
              </span>
            )}
          </div>

          {/* Faucet nudge — testnet only, zero balance */}
          {wallet.signedIn && (
            <FaucetButton
              balanceNim={balance.data?.nim ?? null}
              isTestnet={config.data?.network === "test"}
            />
          )}

          {/* CTA */}
          {!wallet.signedIn ? (
            <Button
              className="mt-4 h-13 w-full text-base font-bold"
              onClick={wallet.connect}
              disabled={wallet.connecting}
            >
              {wallet.connecting ? "Connecting…" : "Connect wallet to predict"}
            </Button>
          ) : isDone ? (
            <div className="mt-4 rounded-xl bg-success/15 px-4 py-3 text-center">
              <CheckCircle className="mx-auto mb-1 size-6 text-success" />
              <p className="font-display font-bold text-success">Prediction locked in!</p>
              {note && <p className="mt-1 text-xs text-muted-foreground">{note}</p>}
            </div>
          ) : (
            <Button
              className="mt-4 h-13 w-full text-base font-bold"
              onClick={() => place.mutate()}
              disabled={busy || !outcome}
            >
              {stage === "creating" && "Preparing entry…"}
              {stage === "awaiting" && "Sign in Nimiq Pay…"}
              {stage === "verifying" && "Verifying signature…"}
              {stage === "idle" &&
                (outcome
                  ? `Predict ${formatNim(stakeNim)} NIM on ${p.outcomes.find((o) => o.key === outcome)?.label ?? outcome}`
                  : "Select an outcome")}
              {stage === "done" && "Prediction locked in ✓"}
            </Button>
          )}
        </section>
      )}

      {/* ── Locked / resolved state ── */}
      {!open && (
        <section className="mt-4 rounded-2xl border border-border bg-card p-4">
          {p.winning_outcome ? (
            <div className="flex items-center gap-3">
              <CheckCircle className="size-6 shrink-0 text-success" />
              <div>
                <p className="font-display font-bold text-success">Resolved</p>
                <p className="text-sm text-muted-foreground">
                  Winning outcome:{" "}
                  <span className="font-semibold text-foreground">
                    {p.outcomes.find((o) => o.key === p.winning_outcome)?.label ??
                      p.winning_outcome}
                  </span>
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <XCircle className="size-6 shrink-0 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                This market is{" "}
                <span className="font-semibold text-foreground">{p.status.toLowerCase()}</span> —
                awaiting resolution.
              </p>
            </div>
          )}
        </section>
      )}

      {/* Pending note */}
      {stage !== "done" && note && (
        <p className="mt-3 rounded-xl bg-surface px-3 py-2 text-[11px] leading-snug text-muted-foreground">
          {note}
        </p>
      )}

      {/* Stage progress indicator */}
      {busy && (
        <div className="mt-4 space-y-2">
          {(
            [
              { key: "creating", label: "Creating entry", active: stage === "creating" },
              { key: "awaiting", label: "Waiting for signature", active: stage === "awaiting" },
              { key: "verifying", label: "Verifying signature", active: stage === "verifying" },
            ] as const
          ).map(({ key, label, active }) => (
            <div
              key={key}
              className={`flex items-center gap-2 text-xs ${active ? "text-primary" : "text-muted-foreground/40"}`}
            >
              <div
                className={`size-1.5 rounded-full ${active ? "bg-primary" : "bg-muted-foreground/20"}`}
              />
              {label}
              {active && (
                <div className="ml-auto size-3 rounded-full border border-primary border-t-transparent animate-spin" />
              )}
            </div>
          ))}
        </div>
      )}
    </AppShell>
  );
}
