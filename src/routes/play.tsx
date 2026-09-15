import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Zap } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { CategoryCard } from "@/components/CategoryCard";
import { PredictionCard } from "@/components/PredictionCard";
import { CATEGORIES } from "@/lib/categories";
import { getCategoryCounts, getFeed } from "@/lib/game.functions";
import { msLeft } from "@/lib/nim";
import { useNow } from "@/hooks/useNow";
import { GAME_MODES } from "@/lib/progression";

export const Route = createFileRoute("/play")({
  head: () => ({
    meta: [
      { title: "Play — NIM Panic" },
      {
        name: "description",
        content:
          "Choose a prediction category and start staking NIM on outcomes. Sports, Crypto, Esports, Tech, Culture and World.",
      },
    ],
  }),
  component: PlayPage,
});

function PlayPage() {
  const now = useNow();
  const counts = useQuery({
    queryKey: ["category-counts"],
    queryFn: () => getCategoryCounts(),
    refetchInterval: 60_000,
  });
  const feed = useQuery({
    queryKey: ["feed"],
    queryFn: () => getFeed(),
    refetchInterval: 30_000,
  });

  const catCounts = counts.data ?? {};
  const rows = feed.data ?? [];

  // Quickest-locking open prediction — the "Quick Panic" pick
  const quickPanic = rows
    .filter((p) => p.status === "OPEN" && msLeft(p.lock_time, now) > 0)
    .sort((a, b) => msLeft(a.lock_time, now) - msLeft(b.lock_time, now))[0];

  return (
    <AppShell>
      {/* ── Header ── */}
      <div className="flex items-center gap-2">
        <Zap className="size-5 text-primary" />
        <h1 className="font-display text-xl font-bold">What are you into?</h1>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">Pick a category and start predicting.</p>

      {/* ── Category grid ── */}
      <section className="mt-4 grid grid-cols-2 gap-3">
        {CATEGORIES.map((cat) => (
          <CategoryCard
            key={cat.slug}
            category={cat}
            liveCount={catCounts[cat.key] ?? 0}
            variant="compact"
          />
        ))}
      </section>

      {/* ── Game modes ── */}
      <section className="mt-6">
        <h2 className="mb-3 font-display text-sm font-bold uppercase tracking-wide">Game Modes</h2>
        <div className="space-y-2">
          {GAME_MODES.map((mode) => (
            <GameModeRow key={mode.id} mode={mode} quickPanicId={quickPanic?.id} />
          ))}
        </div>
      </section>

      {/* ── Quick Panic preview ── */}
      {quickPanic && (
        <section className="mt-6">
          <h2 className="mb-2 font-display text-sm font-bold uppercase tracking-wide">
            ⚡ Quick Panic — Next to Lock
          </h2>
          <PredictionCard prediction={quickPanic} />
        </section>
      )}
    </AppShell>
  );
}

function GameModeRow({
  mode,
  quickPanicId,
}: {
  mode: (typeof GAME_MODES)[number];
  quickPanicId?: string | undefined;
}) {
  const content = (
    <div
      className={`flex items-center gap-3 rounded-2xl border bg-card p-3.5 transition-all ${
        mode.available
          ? "border-border hover:border-primary/30 active:scale-[0.98]"
          : "border-border opacity-50 cursor-not-allowed"
      }`}
    >
      <span className="text-2xl">{mode.emoji}</span>
      <div className="flex-1">
        <p className="font-display text-sm font-bold">{mode.label}</p>
        <p className="text-xs text-muted-foreground">{mode.description}</p>
      </div>
      {!mode.available && (
        <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          Soon
        </span>
      )}
      {mode.available && (
        <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary">
          Play
        </span>
      )}
    </div>
  );

  if (!mode.available) return <div key={mode.id}>{content}</div>;

  // Quick Panic → jump straight to the soonest-locking prediction
  if (mode.id === "quick_panic" && quickPanicId) {
    return (
      <Link to="/p/$id" params={{ id: quickPanicId }}>
        {content}
      </Link>
    );
  }

  // Daily Panic → home feed (daily challenge is shown there)
  if (mode.id === "daily_panic") {
    return <Link to="/">{content}</Link>;
  }

  // Category mode → play page (user already here, scroll up)
  return <div>{content}</div>;
}
