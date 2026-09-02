import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { useWallet } from "@/hooks/useWallet";
import { getMyPicks } from "@/lib/game.functions";
import { formatNim } from "@/lib/nim";

export const Route = createFileRoute("/picks")({
  head: () => ({
    meta: [
      { title: "My Picks — NIM Panic" },
      {
        name: "description",
        content: "Track every prediction you staked NIM on, its lock status, result and payout.",
      },
      { property: "og:title", content: "My Picks — NIM Panic" },
      {
        property: "og:description",
        content: "Your NIM Panic prediction history: pending, locked, won and paid entries.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PicksPage,
});

type PickRow = Awaited<ReturnType<typeof getMyPicks>>[number];

const STATUS_STYLES: Record<string, string> = {
  PENDING: "bg-warning/15 text-warning",
  CONFIRMED: "bg-success/15 text-success",
  LOCKED: "bg-surface-2 text-muted-foreground",
  WON: "bg-success/20 text-success",
  LOST: "bg-destructive/15 text-destructive",
  EXPIRED: "bg-muted text-muted-foreground",
  REFUNDED: "bg-accent/20 text-accent",
};

function PicksPage() {
  const wallet = useWallet();
  const picks = useQuery({
    queryKey: ["my-picks"],
    queryFn: () => getMyPicks(),
    enabled: wallet.signedIn,
  });

  if (!wallet.signedIn) {
    return (
      <AppShell>
        <EmptyState
          title="Connect to see your picks"
          body="Your prediction history lives with your Nimiq wallet. Connect to load it."
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

  return (
    <AppShell>
      <h1 className="font-display text-xl font-bold">My Picks</h1>
      <p className="mt-1 text-sm text-muted-foreground">Every call you made, and how it landed.</p>

      {picks.isLoading && <p className="mt-6 text-sm text-muted-foreground">Loading your picks…</p>}
      {picks.isError && (
        <p className="mt-6 rounded-xl bg-destructive/15 px-3 py-2 text-sm text-destructive">
          Your picks could not load. Try again shortly.
        </p>
      )}

      {!picks.isLoading && rows.length === 0 && (
        <EmptyState
          title="No picks yet"
          body="Back a market with NIM and it will show up here with live status and payouts."
          action={
            <Button asChild>
              <Link to="/">Browse markets</Link>
            </Button>
          }
        />
      )}

      <div className="mt-5 space-y-3">
        {rows.map((row) => (
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
    | { payout_nim: number | string | null; status: string | null }
    | null
    | undefined;

  const outcomeLabel =
    prediction?.outcomes?.find((o) => o.key === row.outcome)?.label ?? row.outcome;
  const payout = Number(settlement?.payout_nim ?? 0);

  return (
    <Link
      to="/p/$id"
      params={{ id: row.prediction_id }}
      className="block rounded-2xl border border-border bg-card p-4"
    >
      <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wide">
        <span className="rounded-full bg-surface-2 px-2 py-0.5 text-muted-foreground">
          {prediction?.category ?? "MARKET"}
        </span>
        <span
          className={`ml-auto rounded-full px-2 py-0.5 ${
            STATUS_STYLES[row.status] ?? "bg-surface-2 text-muted-foreground"
          }`}
        >
          {row.status}
        </span>
      </div>

      <h2 className="mt-2 font-display text-sm font-bold leading-snug">
        {prediction?.question ?? "Prediction"}
      </h2>

      <div className="mt-3 flex items-center justify-between text-xs">
        <span className="text-muted-foreground">
          Your call: <span className="font-semibold text-foreground">{outcomeLabel}</span>
        </span>
        <span className="tabular text-muted-foreground">
          Stake {formatNim(row.stake_nim)} NIM
        </span>
      </div>

      {row.status === "WON" && (
        <p className="mt-2 rounded-xl bg-success/15 px-3 py-2 text-xs text-success">
          Won +{formatNim(payout)} NIM ·{" "}
          {settlement?.status === "SENT" ? "paid out" : "payout pending"}
        </p>
      )}
      {row.status === "LOST" && (
        <p className="mt-2 rounded-xl bg-destructive/10 px-3 py-2 text-xs text-destructive">
          Lost −{formatNim(row.stake_nim)} NIM
        </p>
      )}
      {row.status === "PENDING" && (
        <p className="mt-2 rounded-xl bg-warning/10 px-3 py-2 text-xs text-warning">
          Waiting for your NIM payment to confirm on-chain.
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
      <h2 className="font-display text-base font-bold">{title}</h2>
      <p className="mt-2 text-sm text-muted-foreground">{body}</p>
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
}
