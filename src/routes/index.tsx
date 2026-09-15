import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Flame, Siren, Zap, ChevronRight, Trophy } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { PredictionCard } from "@/components/PredictionCard";
import { CategoryCard } from "@/components/CategoryCard";
import { Onboarding } from "@/components/Onboarding";
import { Countdown } from "@/components/Countdown";
import { useNow } from "@/hooks/useNow";
import { useWallet } from "@/hooks/useWallet";
import { getFeed, getGameConfig, getMyProfile } from "@/lib/game.functions";
import { getUserPreferences } from "@/lib/preferences.functions";
import { getCategoryCounts } from "@/lib/game.functions";
import { CATEGORIES, getCategoryByKey } from "@/lib/categories";
import { msLeft, formatNim } from "@/lib/nim";

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
  const wallet = useWallet();

  const feed = useQuery({
    queryKey: ["feed"],
    queryFn: () => getFeed(),
    refetchInterval: 30_000,
  });
  const config = useQuery({ queryKey: ["config"], queryFn: () => getGameConfig() });
  const counts = useQuery({
    queryKey: ["category-counts"],
    queryFn: () => getCategoryCounts(),
    refetchInterval: 60_000,
  });
  const prefs = useQuery({
    queryKey: ["preferences"],
    queryFn: () => getUserPreferences(),
    enabled: wallet.signedIn,
  });
  const profile = useQuery({
    queryKey: ["my-profile"],
    queryFn: () => getMyProfile(),
    enabled: wallet.signedIn,
  });

  // Show onboarding for signed-in users who haven't completed it yet
  const needsOnboarding =
    wallet.signedIn &&
    !prefs.isLoading &&
    prefs.data !== undefined &&
    !prefs.data.onboardingComplete;

  if (needsOnboarding) {
    return (
      <Onboarding
        onComplete={() => {
          void feed.refetch();
          void prefs.refetch();
        }}
      />
    );
  }

  const rows = feed.data ?? [];
  const preferred = prefs.data?.preferredCategories ?? [];

  // Partition feed
  const openRows = rows
    .filter((p) => p.status === "OPEN" && msLeft(p.lock_time, now) > 0)
    .sort((a, b) => msLeft(a.lock_time, now) - msLeft(b.lock_time, now));

  const panicZone = openRows.filter((p) => msLeft(p.lock_time, now) <= 30 * MINUTE);
  const hot = openRows.filter((p) => {
    const left = msLeft(p.lock_time, now);
    return left > 30 * MINUTE && left <= 3 * 60 * MINUTE;
  });

  // Personalised: prioritise preferred categories, then others
  const personalised =
    preferred.length > 0
      ? openRows.filter((p) => preferred.includes(p.category)).slice(0, 6)
      : openRows.slice(0, 6);

  // "Hot" predictions (most players)
  const hotByPlayers = [...openRows]
    .sort((a, b) => b.participants_count - a.participants_count)
    .slice(0, 3);

  // Daily challenge — earliest-locking prediction
  const dailyChallenge = openRows[0] ?? null;

  const nextLock = openRows[0];
  const catCounts = counts.data ?? {};

  return (
    <AppShell>
      {/* ── Hero banner ── */}
      <section className="rounded-2xl border border-primary/20 bg-card p-4 panic-glow">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl font-bold leading-tight">
              Beat the clock.
              <br />
              <span className="text-primary">Or panic.</span>
            </h1>
            <p className="mt-1 text-xs text-muted-foreground">
              Stake NIM · Call outcomes · Climb the ranks
            </p>
          </div>

          {/* Streak badge */}
          {wallet.signedIn && profile.data && profile.data.streak > 0 && (
            <div className="flex shrink-0 flex-col items-center rounded-2xl bg-primary/15 px-3 py-2">
              <Flame className="size-5 text-primary streak-glow" />
              <span className="font-display text-lg font-bold text-primary tabular">
                {profile.data.streak}
              </span>
              <span className="text-[9px] uppercase tracking-wide text-muted-foreground">
                Streak
              </span>
            </div>
          )}
        </div>

        {/* Next lock ticker */}
        {nextLock && (
          <div className="mt-3 flex items-center gap-2 rounded-xl bg-surface px-3 py-2">
            <Siren className="size-4 shrink-0 text-panic" />
            <div className="min-w-0 flex-1">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Next lock</p>
              <p className="truncate text-xs font-semibold">{nextLock.question}</p>
            </div>
            <span className="shrink-0 font-display text-sm font-bold tabular text-panic panic-blink">
              <Countdown target={nextLock.lock_time} urgent />
            </span>
          </div>
        )}

        {config.data && !config.data.stakingEnabled && (
          <p className="mt-3 rounded-xl bg-warning/15 px-3 py-2 text-[11px] leading-snug text-warning">
            Staking is paused — the game treasury is not configured yet. Browse markets freely.
          </p>
        )}
      </section>

      {/* ── Quick Play button ── */}
      <Link
        to="/play"
        className="mt-3 flex items-center justify-center gap-2 rounded-2xl bg-primary py-3 font-display text-sm font-bold text-primary-foreground transition-opacity active:opacity-80"
      >
        <Zap className="size-4" /> Quick Play
      </Link>

      {/* ── My stats strip (signed in) ── */}
      {wallet.signedIn && profile.data && (
        <section className="mt-4 grid grid-cols-3 gap-2">
          <StatPill label="Panic Score" value={String(profile.data.panic_score ?? 0)} />
          <StatPill label="Accuracy" value={`${profile.data.accuracy ?? 0}%`} />
          <StatPill label="NIM Won" value={formatNim(profile.data.nim_won ?? 0)} />
        </section>
      )}

      {/* ── Panic zone ── */}
      {panicZone.length > 0 && (
        <FeedSection
          title="Panic Zone"
          subtitle="Locking in under 30 min"
          icon={<Siren className="size-4 text-panic" />}
          seeAllTo="/play"
        >
          {panicZone.slice(0, 3).map((p) => (
            <PredictionCard key={p.id} prediction={p} />
          ))}
        </FeedSection>
      )}

      {/* ── Daily Challenge ── */}
      {dailyChallenge && (
        <section className="mt-5">
          <h2 className="mb-2 flex items-center gap-2 font-display text-sm font-bold uppercase tracking-wide">
            <span className="text-base">🔥</span> Daily Challenge
          </h2>
          <Link
            to="/p/$id"
            params={{ id: dailyChallenge.id }}
            className="flex items-center gap-4 rounded-2xl border border-primary/30 bg-card p-4 panic-glow"
          >
            <div className="min-w-0 flex-1">
              <span className="text-[10px] font-bold uppercase tracking-widest text-primary">
                {getCategoryByKey(dailyChallenge.category)?.label ?? dailyChallenge.category}
              </span>
              <p className="mt-1 font-display text-sm font-bold leading-snug">
                {dailyChallenge.question}
              </p>
              <p className="mt-1 text-[11px] text-muted-foreground tabular">
                {dailyChallenge.participants_count} players
              </p>
            </div>
            <div className="shrink-0 text-right">
              <p className="font-display text-xl font-bold text-panic tabular panic-blink">
                <Countdown target={dailyChallenge.lock_time} urgent />
              </p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">locks</p>
            </div>
          </Link>
        </section>
      )}

      {/* ── Personalised feed ── */}
      {personalised.length > 0 && (
        <FeedSection
          title={preferred.length > 0 ? "Your Feed" : "Live Now"}
          subtitle={preferred.length > 0 ? "Based on your categories" : "All open markets"}
          icon={<Flame className="size-4 text-primary" />}
          seeAllTo="/play"
        >
          {personalised.map((p) => (
            <PredictionCard key={p.id} prediction={p} />
          ))}
        </FeedSection>
      )}

      {/* ── Hot predictions ── */}
      {hotByPlayers.length > 0 && (
        <FeedSection
          title="Hot Right Now"
          subtitle="Most players in"
          icon={<Trophy className="size-4 text-warning" />}
        >
          {hotByPlayers.map((p) => (
            <PredictionCard key={p.id} prediction={p} />
          ))}
        </FeedSection>
      )}

      {/* ── Category strip ── */}
      <section className="mt-5">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="font-display text-sm font-bold uppercase tracking-wide">Categories</h2>
          <Link to="/play" className="text-xs font-semibold text-primary">
            See all →
          </Link>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {CATEGORIES.slice(0, 6).map((cat) => (
            <CategoryCard
              key={cat.slug}
              category={cat}
              liveCount={catCounts[cat.key] ?? 0}
              variant="compact"
            />
          ))}
        </div>
      </section>

      {/* ── Heating up ── */}
      {hot.length > 0 && (
        <FeedSection
          title="Heating Up"
          subtitle="A few hours left"
          icon={<Zap className="size-4 text-warning" />}
        >
          {hot.slice(0, 3).map((p) => (
            <PredictionCard key={p.id} prediction={p} />
          ))}
        </FeedSection>
      )}

      {feed.isLoading && <p className="mt-8 text-sm text-muted-foreground">Loading predictions…</p>}
      {!feed.isLoading && rows.length === 0 && (
        <p className="mt-8 rounded-2xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">
          No markets are open right now. Check back soon.
        </p>
      )}
    </AppShell>
  );
}

function FeedSection({
  title,
  subtitle,
  icon,
  seeAllTo,
  children,
}: {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  seeAllTo?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-5">
      <div className="mb-2 flex items-center justify-between">
        <div>
          <h2 className="flex items-center gap-1.5 font-display text-sm font-bold uppercase tracking-wide">
            {icon} {title}
          </h2>
          {subtitle && <p className="mt-0.5 text-[11px] text-muted-foreground">{subtitle}</p>}
        </div>
        {seeAllTo && (
          <Link to={seeAllTo} className="shrink-0 text-xs font-semibold text-primary">
            See all <ChevronRight className="inline size-3" />
          </Link>
        )}
      </div>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function StatPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-card px-2 py-2 text-center">
      <p className="font-display text-base font-bold tabular">{value}</p>
      <p className="text-[10px] text-muted-foreground">{label}</p>
    </div>
  );
}
