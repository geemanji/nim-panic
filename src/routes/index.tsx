import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AlarmClock, Flame, Siren, Zap } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { PredictionCard } from "@/components/PredictionCard";
import { Countdown } from "@/components/Countdown";
import { useNow } from "@/hooks/useNow";
import { getFeed, getGameConfig } from "@/lib/game.functions";
import { msLeft } from "@/lib/nim";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "NIM Panic — Beat the Clock, Stake NIM" },
      {
        name: "description",
        content:
          "A Nimiq Pay mini app: call real-world outcomes before the clock locks, stake NIM and climb the weekly leaderboard.",
      },
      { property: "og:title", content: "NIM Panic — Beat the Clock, Stake NIM" },
      {
        property: "og:description",
        content:
          "Markets lock fast. Call it, stake NIM and climb the weekly leaderboard inside Nimiq Pay.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: HomePage,
});

const MINUTE = 60_000;

function HomePage() {
  const now = useNow();
  const feed = useQuery({ queryKey: ["feed"], queryFn: () => getFeed(), refetchInterval: 30_000 });
  const config = useQuery({ queryKey: ["config"], queryFn: () => getGameConfig() });

  const rows = feed.data ?? [];
  const openRows = rows
    .filter((p) => p.status === "OPEN" && msLeft(p.lock_time, now) > 0)
    .sort((a, b) => msLeft(a.lock_time, now) - msLeft(b.lock_time, now));

  const panic = openRows.filter((p) => msLeft(p.lock_time, now) <= 30 * MINUTE);
  const heating = openRows.filter((p) => {
    const left = msLeft(p.lock_time, now);
    return left > 30 * MINUTE && left <= 3 * 60 * MINUTE;
  });
  const live = openRows.filter((p) => msLeft(p.lock_time, now) > 3 * 60 * MINUTE);
  const settled = rows.filter((p) => p.status !== "OPEN" || msLeft(p.lock_time, now) <= 0);
  const next = openRows[0];

  return (
    <AppShell>
      <section className="rounded-2xl border border-border bg-card p-4 panic-glow">
        <h1 className="font-display text-2xl font-bold leading-tight">
          Beat the clock. <span className="text-primary">Or panic.</span>
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Markets lock without mercy. Call an outcome, back it with NIM before the timer dies.
        </p>

        {next && (
          <div className="mt-3 flex items-center gap-3 rounded-xl bg-surface px-3 py-2">
            <AlarmClock className="size-4 shrink-0 text-panic" />
            <div className="min-w-0 flex-1">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                Next lock
              </p>
              <p className="truncate text-xs font-semibold">{next.question}</p>
            </div>
            <span className="font-display text-sm font-bold tabular">
              <Countdown target={next.lock_time} urgent />
            </span>
          </div>
        )}

        {config.data && !config.data.stakingEnabled && (
          <p className="mt-3 rounded-xl bg-warning/15 px-3 py-2 text-[11px] leading-snug text-warning">
            Staking is paused: the game treasury is not configured yet. You can browse every market.
          </p>
        )}

        <Link
          to="/dashboard"
          className="mt-3 inline-flex text-xs font-semibold text-primary underline-offset-4 hover:underline"
        >
          See my staked entries →
        </Link>
      </section>

      {feed.isLoading && <p className="mt-6 text-sm text-muted-foreground">Loading markets…</p>}
      {feed.isError && (
        <p className="mt-6 rounded-xl bg-destructive/15 px-3 py-2 text-sm text-destructive">
          Markets could not load. Pull down or try again shortly.
        </p>
      )}

      {panic.length > 0 && (
        <Section
          title="Panic zone"
          subtitle="Locking in under 30 minutes"
          icon={<Siren className="size-4 text-panic" />}
        >
          {panic.map((p) => (
            <PredictionCard key={p.id} prediction={p} />
          ))}
        </Section>
      )}

      {heating.length > 0 && (
        <Section
          title="Heating up"
          subtitle="A few hours left"
          icon={<Zap className="size-4 text-warning" />}
        >
          {heating.map((p) => (
            <PredictionCard key={p.id} prediction={p} />
          ))}
        </Section>
      )}

      {live.length > 0 && (
        <Section title="Wide open" icon={<Flame className="size-4 text-primary" />}>
          {live.map((p) => (
            <PredictionCard key={p.id} prediction={p} />
          ))}
        </Section>
      )}

      {settled.length > 0 && (
        <Section title="Locked & resolved">
          {settled.map((p) => (
            <PredictionCard key={p.id} prediction={p} />
          ))}
        </Section>
      )}

      {!feed.isLoading && rows.length === 0 && (
        <p className="mt-8 rounded-2xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">
          No markets are open right now. Check back soon.
        </p>
      )}
    </AppShell>
  );
}

function Section({
  title,
  subtitle,
  icon,
  children,
}: {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-6">
      <h2 className="mb-1 flex items-center gap-2 font-display text-sm font-bold uppercase tracking-wide">
        {icon}
        {title}
      </h2>
      {subtitle && <p className="mb-2 text-[11px] text-muted-foreground">{subtitle}</p>}
      <div className="space-y-3">{children}</div>
    </section>
  );
}
