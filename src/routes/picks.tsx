import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle, XCircle, Clock, Coins } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { useWallet } from "@/hooks/useWallet";
import { getMyPicks } from "@/lib/game.functions";
import { formatNim } from "@/lib/nim";
import { getCategoryByKey } from "@/lib/categories";

export const Route = createFileRoute("/picks")({
  head: () => ({
    meta: [
      { title: "My Picks — NIM Panic" },
      {
        name: "description",
        content: "Track every prediction you staked NIM on, its lock status, result and payout.",
      },
      { property: "og:title", content: "My Picks — NIM Panic" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PicksPage,
});

type PickRow = Awaited<ReturnType<typeof getMyPicks>>[number];
type FilterTab = "all" | "active" | "won" | "lost";

const ACTIVE_STATUSES = new Set(["PENDING_PAYMENT", "CONFIRMED", "LOCKED"]);

function PicksPage() {
  const wallet = useWallet();
  const [filter, setFilter] = useState<FilterTab>("all");

  const picks = useQuery({
    queryKey: ["my-picks"],
    queryFn: () => getMyPicks(),
    enabled: wallet.signedIn,
    refetchInterval: 30_000,
  });

  if (!wallet.signedIn) {
    return (
      <AppShell>
        <EmptyState
          title="Connect to see your picks"
          body="Your prediction history lives with your Nimiq wallet."
          action={
            <Button onClick={wallet.connect} disabled={wallet.connecting}>
              {wallet.connecting ? "Connecting…" : "Connect wallet"}
            </Button>
          }
        />
      </AppShell>
    );
  }

  const rows = picks.data ?? [];

  const filtered = rows.filter((r) => {
    if (filter === "active") return ACTIVE_STATUSES.has(r.status);
    if (filter === "won") return r.status === "WON";
    if (filter === "lost") return r.status === "LOST";
    return true;
  });

  const activeCount = rows.filter((r) => ACTIVE_STATUSES.has(r.status)).length;
  const wonCount = rows.filter((r) => r.status === "WON").length;
  const lostCount = rows.filter((r) => r.status === "LOST").length;

  const tabs: { id: FilterTab; label: string; count: number }[] = [
    { id: "all", label: "All", count: rows.length },
    { id: "active", label: "Active", count: activeCount },
    { id: "won", label: "Won", count: wonCount },
    { id: "lost", label: "Lost", count: lostCount },
  ];

  return (
    <AppShell>
      <h1 className="font-display text-xl font-bold">My Picks</h1>
      <p className="mt-1 text-sm text-muted-foreground">Every call you made, and how it landed.</p>

      {/* ── Filter tabs ── */}
      <div className="mt-4 flex gap-1 rounded-xl bg-surface p-1">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setFilter(t.id)}
            className={`flex flex-1 items-center justify-center gap-1 rounded-lg py-2 text-[11px] font-bold transition-colors ${
              filter === t.id
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label}
            {t.count > 0 && (
              <span
                className={`rounded-full px-1.5 py-0.5 text-[10px] tabular ${
                  filter === t.id
                    ? "bg-primary/20 text-primary"
                    : "bg-surface-2 text-muted-foreground"
                }`}
              >
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {picks.isLoading && <p className="mt-6 text-sm text-muted-foreground">Loading your picks…</p>}
      {picks.isError && (
        <p className="mt-4 rounded-xl bg-destructive/15 px-3 py-2 text-sm text-destructive">
          Your picks could not load. Try again shortly.
        </p>
      )}

      {!picks.isLoading && filtered.length === 0 && (
        <EmptyState
          title={filter === "all" ? "No picks yet" : `No ${filter} picks`}
          body={
            filter === "all"
              ? "Back a market with NIM and it will show up here."
              : `You don't have any ${filter} picks yet.`
          }
          action={
            filter === "all" ? (
              <Button asChild>
                <Link to="/play">Find a market</Link>
              </Button>
            ) : undefined
          }
        />
      )}

      <div className="mt-4 space-y-3">
        {filtered.map((row) => (
          <PickCard key={row.id} row={row} />
        ))}
      </div>
    </AppShell>
  );
}

function PickCard({ row }: { row: PickRow }) {
  const prediction = row.predictions as unknown as {
    question: string;
    category: string;
    status: string;
    winning_outcome: string | null;
    outcomes: { key: string; label: string }[];
  } | null;

  const settlementRaw = row.settlements as unknown;
  const settlement = (Array.isArray(settlementRaw) ? settlementRaw[0] : settlementRaw) as
    { payout_nim: number | string | null; status: string | null } | null | undefined;

  const cat = getCategoryByKey(prediction?.category ?? "");
  const outcomeLabel =
    prediction?.outcomes?.find((o) => o.key === row.outcome)?.label ?? row.outcome;
  const payout = Number(settlement?.payout_nim ?? 0);
  const isWon = row.status === "WON";
  const isLost = row.status === "LOST";
  const isActive = new Set(["PENDING_PAYMENT", "CONFIRMED", "LOCKED"]).has(row.status);

  return (
    <Link
      to="/p/$id"
      params={{ id: row.prediction_id }}
      className={`block rounded-2xl border p-4 transition-all active:scale-[0.98] ${
        isWon
          ? "border-success/40 bg-card win-flash"
          : isLost
            ? "border-destructive/30 bg-card loss-flash"
            : isActive
              ? "border-border bg-card"
              : "border-border bg-card opacity-70"
      }`}
    >
      {/* Top row */}
      <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest">
        {cat ? (
          <span className={`rounded-full px-2 py-0.5 ${cat.bg} ${cat.color}`}>
            {cat.emoji} {cat.label}
          </span>
        ) : (
          <span className="rounded-full bg-surface-2 px-2 py-0.5 text-muted-foreground">
            {prediction?.category ?? "MARKET"}
          </span>
        )}

        <span
          className={`ml-auto flex items-center gap-1 rounded-full px-2.5 py-0.5 ${
            isWon
              ? "bg-success/20 text-success"
              : isLost
                ? "bg-destructive/15 text-destructive"
                : isActive
                  ? "bg-primary/15 text-primary"
                  : "bg-muted text-muted-foreground"
          }`}
        >
          {isWon && <CheckCircle className="size-2.5" />}
          {isLost && <XCircle className="size-2.5" />}
          {isActive && <Clock className="size-2.5" />}
          {row.status}
        </span>
      </div>

      {/* Question */}
      <h2 className="mt-2.5 font-display text-sm font-bold leading-snug">
        {prediction?.question ?? "Prediction"}
      </h2>

      {/* Your call + stake */}
      <div className="mt-2.5 flex items-center justify-between text-xs">
        <span className="text-muted-foreground">
          Your call: <span className="font-semibold text-foreground">{outcomeLabel}</span>
        </span>
        <span className="flex items-center gap-1 text-muted-foreground tabular">
          <Coins className="size-3" />
          {formatNim(row.stake_nim)} NIM
        </span>
      </div>

      {/* Result block */}
      {isWon && (
        <div className="mt-2.5 flex items-center gap-2 rounded-xl bg-success/10 px-3 py-2">
          <CheckCircle className="size-4 text-success" />
          <div className="flex-1 text-xs text-success">
            <span className="font-bold">+{formatNim(payout)} NIM</span>
            {settlement?.status === "SENT" ? " · paid out" : " · payout pending"}
          </div>
        </div>
      )}
      {isLost && (
        <div className="mt-2.5 flex items-center gap-2 rounded-xl bg-destructive/10 px-3 py-2">
          <XCircle className="size-4 text-destructive" />
          <p className="text-xs text-destructive">
            <span className="font-bold">−{formatNim(row.stake_nim)} NIM</span> · better luck next
            time
          </p>
        </div>
      )}
      {row.status === "PENDING_PAYMENT" && (
        <p className="mt-2 rounded-xl bg-warning/10 px-3 py-2 text-xs text-warning">
          ⏳ Waiting for your NIM payment to confirm on-chain.
        </p>
      )}
    </Link>
  );
}

function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mt-8 rounded-2xl border border-border bg-card p-6 text-center">
      <span className="text-3xl">🎯</span>
      <h2 className="mt-3 font-display text-base font-bold">{title}</h2>
      <p className="mt-2 text-sm text-muted-foreground">{body}</p>
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
}
