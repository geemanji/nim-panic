import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { PredictionCard } from "@/components/PredictionCard";
import { Countdown } from "@/components/Countdown";
import { getFeedByCategory } from "@/lib/game.functions";
import { CATEGORY_BY_SLUG } from "@/lib/categories";
import { msLeft } from "@/lib/nim";
import { useNow } from "@/hooks/useNow";

export const Route = createFileRoute("/category/$slug")({
  head: ({ params }) => {
    const cat = CATEGORY_BY_SLUG[params.slug];
    return {
      meta: [
        { title: `${cat?.label ?? "Category"} Predictions — NIM Panic` },
        {
          name: "description",
          content: `Live ${cat?.label ?? ""} predictions on NIM Panic. Pick outcomes, stake NIM before the clock locks.`,
        },
      ],
    };
  },
  component: CategoryPage,
});

type Tab = "live" | "ending" | "upcoming";

const MINUTE = 60_000;

function CategoryPage() {
  const { slug } = Route.useParams();
  const now = useNow();
  const cat = CATEGORY_BY_SLUG[slug];
  const [tab, setTab] = useState<Tab>("live");

  const feed = useQuery({
    queryKey: ["feed-category", slug],
    queryFn: () =>
      getFeedByCategory({ data: { category: cat?.key ?? slug.toUpperCase() } }),
    refetchInterval: 30_000,
    enabled: Boolean(cat),
  });

  if (!cat) {
    return (
      <AppShell>
        <div className="mt-8 rounded-2xl border border-border bg-card p-6 text-center">
          <p className="font-display text-lg font-bold">Unknown category</p>
          <Link to="/play" className="mt-3 block text-sm font-semibold text-primary">
            ← Back to Play
          </Link>
        </div>
      </AppShell>
    );
  }

  const rows = feed.data ?? [];

  const live = rows.filter(
    (p) => p.status === "OPEN" && msLeft(p.lock_time, now) > 3 * 60 * MINUTE,
  );
  const ending = rows.filter(
    (p) => p.status === "OPEN" && msLeft(p.lock_time, now) > 0 && msLeft(p.lock_time, now) <= 3 * 60 * MINUTE,
  );
  const upcoming = rows.filter(
    (p) => p.status === "OPEN" && msLeft(p.lock_time, now) <= 0,
  ).concat(rows.filter((p) => p.status === "LOCKED" || p.status === "RESOLVED" || p.status === "SETTLED"));

  const tabs: { id: Tab; label: string; count: number }[] = [
    { id: "live",     label: "Live",         count: live.length    },
    { id: "ending",   label: "Ending Soon",  count: ending.length  },
    { id: "upcoming", label: "Settled",      count: upcoming.length },
  ];

  const activeRows = tab === "live" ? live : tab === "ending" ? ending : upcoming;

  return (
    <AppShell>
      {/* ── Category hero ── */}
      <section
        className={`rounded-2xl border p-5 ${cat.border} bg-card`}
        style={{ background: `linear-gradient(135deg, oklch(0.21 0.04 265), oklch(0.21 0.04 265) 60%, transparent)` }}
      >
        <div className="flex items-center gap-3">
          <Link to="/play" className="flex items-center gap-1 text-xs text-muted-foreground">
            <ArrowLeft className="size-4" />
          </Link>
          <span className="text-3xl">{cat.emoji}</span>
          <div>
            <h1 className={`font-display text-2xl font-bold ${cat.color}`}>{cat.label}</h1>
            <p className="text-xs text-muted-foreground">{cat.description}</p>
          </div>
        </div>

        {/* Live count banner */}
        {live.length > 0 && (
          <div className={`mt-4 flex items-center justify-between rounded-xl px-3 py-2 ${cat.bg}`}>
            <span className={`text-xs font-bold uppercase tracking-wide ${cat.color}`}>
              {live.length} live prediction{live.length !== 1 ? "s" : ""}
            </span>
            {ending.length > 0 && (
              <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                <span className="text-panic font-bold">{ending.length}</span> closing soon
              </span>
            )}
          </div>
        )}
      </section>

      {/* ── Tabs ── */}
      <div className="mt-4 flex gap-1 rounded-xl bg-surface p-1">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold transition-colors ${
              tab === t.id
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label}
            {t.count > 0 && (
              <span
                className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular ${
                  tab === t.id ? `${cat.bg} ${cat.color}` : "bg-surface-2 text-muted-foreground"
                }`}
              >
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Prediction list ── */}
      {feed.isLoading && (
        <p className="mt-6 text-sm text-muted-foreground">Loading predictions…</p>
      )}

      {!feed.isLoading && activeRows.length === 0 && (
        <div className="mt-8 rounded-2xl border border-border bg-card p-6 text-center">
          <p className="text-sm text-muted-foreground">
            {tab === "live"
              ? "No live predictions in this category right now."
              : tab === "ending"
              ? "Nothing closing soon."
              : "No settled predictions yet."}
          </p>
          {tab !== "live" && live.length > 0 && (
            <button
              onClick={() => setTab("live")}
              className="mt-3 text-sm font-semibold text-primary"
            >
              See {live.length} live prediction{live.length !== 1 ? "s" : ""}
            </button>
          )}
        </div>
      )}

      <div className="mt-4 space-y-3">
        {activeRows.map((p) => (
          <PredictionCard key={p.id} prediction={p} />
        ))}
      </div>
    </AppShell>
  );
}
