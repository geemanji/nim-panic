import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Flame, Zap } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { PredictionCard } from "@/components/PredictionCard";
import { getFeed, getGameConfig } from "@/lib/game.functions";
import { msLeft } from "@/lib/nim";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "NIM Panic — Predict, Stake NIM, Win" },
      {
        name: "description",
        content:
          "A Nimiq Pay mini app: predict real-world outcomes, stake NIM on your call and climb the weekly leaderboard.",
      },
      { property: "og:title", content: "NIM Panic — Predict, Stake NIM, Win" },
      {
        property: "og:description",
        content: "Predict outcomes, stake NIM and climb the weekly leaderboard inside Nimiq Pay.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  const feed = useQuery({ queryKey: ["feed"], queryFn: () => getFeed() });
  const config = useQuery({ queryKey: ["config"], queryFn: () => getGameConfig() });

  const rows = feed.data ?? [];
  const live = rows.filter((p) => p.status === "OPEN" && msLeft(p.lock_time) > 60 * 60 * 1000);
  const endingSoon = rows.filter(
    (p) => p.status === "OPEN" && msLeft(p.lock_time) <= 60 * 60 * 1000 && msLeft(p.lock_time) > 0,
  );
  const settled = rows.filter((p) => p.status !== "OPEN");

  return (
    <AppShell>
      <section className="rounded-2xl border border-border bg-card p-4 panic-glow">
        <h1 className="font-display text-2xl font-bold leading-tight">
          Call it. Stake it. <span className="text-primary">Own it.</span>
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Pick an outcome, back it with NIM and take the weekly crown.
        </p>
        {config.data && !config.data.stakingEnabled && (
          <p className="mt-3 rounded-xl bg-warning/15 px-3 py-2 text-[11px] leading-snug text-warning">
            Staking is paused: the game treasury is not configured yet. You can browse every market.
          </p>
        )}
      </section>

      {feed.isLoading && <p className="mt-6 text-sm text-muted-foreground">Loading markets…</p>}
      {feed.isError && (
        <p className="mt-6 rounded-xl bg-destructive/15 px-3 py-2 text-sm text-destructive">
          Markets could not load. Pull down or try again shortly.
        </p>
      )}

      {endingSoon.length > 0 && (
        <Section title="Ending soon" icon={<Zap className="size-4 text-panic" />}>
          {endingSoon.map((p) => (
            <PredictionCard key={p.id} prediction={p} />
          ))}
        </Section>
      )}

      {live.length > 0 && (
        <Section title="Live now" icon={<Flame className="size-4 text-primary" />}>
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
  icon,
  children,
}: {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-6">
      <h2 className="mb-2 flex items-center gap-2 font-display text-sm font-bold uppercase tracking-wide">
        {icon}
        {title}
      </h2>
      <div className="space-y-3">{children}</div>
    </section>
  );
}
