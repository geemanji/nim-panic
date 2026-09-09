import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Coins, Hourglass, ListChecks, Siren, Trophy } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Countdown } from "@/components/Countdown";
import { Button } from "@/components/ui/button";
import { useWallet } from "@/hooks/useWallet";
import { useNow } from "@/hooks/useNow";
import { getMyPicks } from "@/lib/game.functions";
import { formatNim, msLeft } from "@/lib/nim";
import { panicTier } from "@/lib/panic";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "My Dashboard — NIM Panic" },
      {
        name: "description",
        content:
          "Your NIM Panic control room: staked entries, pending payouts and every live market you are in.",
      },
      { property: "og:title", content: "My Dashboard — NIM Panic" },
      {
        property: "og:description",
        content: "Track staked NIM, pending payouts and the markets still ticking down.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: DashboardPage,
});

type PickRow = Awaited<ReturnType<typeof getMyPicks>>[number];

type Joined = {
  question: string;
  category: string;
  status: string;
  winning_outcome: string | null;
  lock_time: string;
  outcomes: { key: string; label: string }[];
} | null;

function prediction(row: PickRow): Joined {
  return row.predictions as unknown as Joined;
}

function settlement(row: PickRow) {
  const raw = row.settlements as unknown;
  return (Array.isArray(raw) ? raw[0] : raw) as
    | { payout_nim: number | string | null; status: string | null }
    | null
    | undefined;
}

function DashboardPage() {
  const wallet = useWallet();
  const now = useNow();
  const picks = useQuery({
    queryKey: ["my-picks"],
    queryFn: () => getMyPicks(),
    enabled: wallet.signedIn,
    refetchInterval: 30_000,
  });

  if (!wallet.signedIn) {
    return (
      <AppShell>
        <div className="mt-8 rounded-2xl border border-border bg-card p-6 text-center">
          <h1 className="font-display text-base font-bold">Connect to open your dashboard</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Your staked entries and payouts live with your Nimiq wallet.
          </p>
          <div className="mt-4 flex justify-center">
            <Button onClick={wallet.connect} disabled={wallet.connecting}>
              {wallet.connecting ? "Connecting…" : "Connect wallet"}
            </Button>
          </div>
        </div>
      </AppShell>
    );
  }

  const rows = picks.data ?? [];
  const activeStatuses = new Set(["PENDING", "CONFIRMED", "LOCKED"]);

  const staked = rows.filter((r) => activeStatuses.has(r.status));
  const stakedTotal = staked.reduce((sum, r) => sum + Number(r.stake_nim ?? 0), 0);
  const pendingPayouts = rows.filter(
    (r) => r.status === "WON" && settlement(r)?.status !== "SENT",
  );
  const pendingTotal = pendingPayouts.reduce(
    (sum, r) => sum + Number(settlement(r)?.payout_nim ?? 0),
    0,
  );
  const paidTotal = rows
    .filter((r) => r.status === "WON" && settlement(r)?.status === "SENT")
    .reduce((sum, r) => sum + Number(settlement(r)?.payout_nim ?? 0), 0);

  const liveMarkets = rows
    .filter((r) => {
      const p = prediction(r);
      return (
        activeStatuses.has(r.status) && p?.status === "OPEN" && msLeft(p.lock_time, now) > 0
      );
    })
    .sort(
      (a, b) =>
        msLeft(prediction(a)?.lock_time ?? "", now) - msLeft(prediction(b)?.lock_time ?? "", now),
    );

  return (
    <AppShell>
      <h1 className="font-display text-xl font-bold">My dashboard</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Everything you have riding, and how close it is to the buzzer.
      </p>

      {picks.isLoading && (
        <p className="mt-6 text-sm text-muted-foreground">Loading your dashboard…</p>
      )}
      {picks.isError && (
        <p className="mt-6 rounded-xl bg-destructive/15 px-3 py-2 text-sm text-destructive">
          Your dashboard could not load. Try again shortly.
        </p>
      )}

      <section className="mt-5 grid grid-cols-3 gap-3">
        <Stat
          icon={<Coins className="size-3.5 text-primary" />}
          label="At stake"
          value={`${formatNim(stakedTotal)}`}
        />
        <Stat
          icon={<Hourglass className="size-3.5 text-warning" />}
          label="Pending"
          value={`${formatNim(pendingTotal)}`}
        />
        <Stat
          icon={<Trophy className="size-3.5 text-success" />}
          label="Paid out"
          value={`${formatNim(paidTotal)}`}
        />
      </section>

      <Block
        title="Live markets you're in"
        icon={<Siren className="size-4 text-panic" />}
        empty={
          liveMarkets.length === 0
            ? "You have nothing running right now. Grab a market before it locks."
            : null
        }
      >
        {liveMarkets.map((row) => {
          const p = prediction(row);
          const remaining = msLeft(p?.lock_time ?? "", now);
          const tier = panicTier(remaining);
          const label = p?.outcomes?.find((o) => o.key === row.outcome)?.label ?? row.outcome;
          return (
            <Link
              key={row.id}
              to="/p/$id"
              params={{ id: row.prediction_id }}
              className={`block rounded-2xl border p-4 ${tier.card}`}
            >
              <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wide">
                <span className="rounded-full bg-surface-2 px-2 py-0.5 text-muted-foreground">
                  {p?.category ?? "MARKET"}
                </span>
                <span className={`ml-auto rounded-full px-2 py-0.5 ${tier.badge}`}>
                  {tier.label}
                </span>
              </div>
              <h3 className="mt-2 font-display text-sm font-bold leading-snug">
                {p?.question ?? "Prediction"}
              </h3>
              <div className="mt-2 flex items-center justify-between text-xs">
                <span className="text-muted-foreground">
                  Your call: <span className="font-semibold text-foreground">{label}</span>
                </span>
                <span className="font-semibold tabular">
                  <Countdown target={p?.lock_time ?? ""} urgent />
                </span>
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground tabular">
                {formatNim(row.stake_nim)} NIM staked · {row.status}
              </p>
            </Link>
          );
        })}
      </Block>

      <Block
        title="Pending payouts"
        icon={<Hourglass className="size-4 text-warning" />}
        empty={pendingPayouts.length === 0 ? "No payouts waiting on the treasury." : null}
      >
        {pendingPayouts.map((row) => (
          <Link
            key={row.id}
            to="/p/$id"
            params={{ id: row.prediction_id }}
            className="block rounded-2xl border border-warning/40 bg-card p-4"
          >
            <h3 className="font-display text-sm font-bold leading-snug">
              {prediction(row)?.question ?? "Prediction"}
            </h3>
            <p className="mt-2 text-xs text-warning tabular">
              +{formatNim(settlement(row)?.payout_nim ?? 0)} NIM · payout on its way
            </p>
          </Link>
        ))}
      </Block>

      <Block
        title="Staked entries"
        icon={<ListChecks className="size-4 text-primary" />}
        empty={staked.length === 0 ? "Nothing staked yet." : null}
      >
        {staked.map((row) => {
          const p = prediction(row);
          const label = p?.outcomes?.find((o) => o.key === row.outcome)?.label ?? row.outcome;
          return (
            <Link
              key={row.id}
              to="/p/$id"
              params={{ id: row.prediction_id }}
              className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold">{p?.question ?? "Prediction"}</p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  {label} · {row.status}
                </p>
              </div>
              <span className="shrink-0 text-xs font-semibold tabular">
                {formatNim(row.stake_nim)} NIM
              </span>
            </Link>
          );
        })}
      </Block>

      <div className="mt-6 flex gap-2">
        <Button asChild variant="secondary" className="flex-1">
          <Link to="/picks">Full history</Link>
        </Button>
        <Button asChild className="flex-1">
          <Link to="/">Find a market</Link>
        </Button>
      </div>
    </AppShell>
  );
}

function Stat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-3">
      <p className="flex items-center gap-1 text-[10px] uppercase tracking-wide text-muted-foreground">
        {icon}
        {label}
      </p>
      <p className="mt-1 font-display text-base font-bold tabular">{value}</p>
      <p className="text-[10px] text-muted-foreground">NIM</p>
    </div>
  );
}

function Block({
  title,
  icon,
  empty,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  empty: string | null;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-6">
      <h2 className="mb-2 flex items-center gap-2 font-display text-sm font-bold uppercase tracking-wide">
        {icon}
        {title}
      </h2>
      {empty ? (
        <p className="rounded-2xl border border-border bg-card p-4 text-sm text-muted-foreground">
          {empty}
        </p>
      ) : (
        <div className="space-y-3">{children}</div>
      )}
    </section>
  );
}
