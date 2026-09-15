import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Flame, LogOut, ShieldCheck } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { FaucetButton } from "@/components/FaucetButton";
import { useWallet } from "@/hooks/useWallet";
import { getMyProfile, getWalletBalance, getGameConfig } from "@/lib/game.functions";
import { getUserPreferences } from "@/lib/preferences.functions";
import { formatNim, shortenAddress } from "@/lib/nim";
import { rankForXp, xpProgress, PANIC_RANKS } from "@/lib/progression";
import { getCategoryByKey } from "@/lib/categories";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "Your Profile — NIM Panic" },
      {
        name: "description",
        content: "Your NIM Panic stats: Panic Score, XP, streak, accuracy, wins and NIM won.",
      },
      { property: "og:title", content: "Your Profile — NIM Panic" },
      { property: "og:type", content: "profile" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const wallet = useWallet();

  const profile = useQuery({
    queryKey: ["my-profile"],
    queryFn: () => getMyProfile(),
    enabled: wallet.signedIn,
  });
  const balance = useQuery({
    queryKey: ["wallet-balance"],
    queryFn: () => getWalletBalance(),
    enabled: wallet.signedIn,
    retry: false,
  });
  const prefs = useQuery({
    queryKey: ["preferences"],
    queryFn: () => getUserPreferences(),
    enabled: wallet.signedIn,
  });
  const config = useQuery({ queryKey: ["config"], queryFn: () => getGameConfig() });

  if (!wallet.signedIn) {
    return (
      <AppShell>
        <div className="mt-8 rounded-2xl border border-border bg-card p-6 text-center">
          <span className="text-4xl">👛</span>
          <h1 className="mt-3 font-display text-base font-bold">No wallet connected</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Connect your Nimiq wallet to see your Panic Score, streak and winnings.
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

  const data = profile.data;
  const xp = data?.xp ?? 0;
  const rank = rankForXp(xp);
  const progress = xpProgress(xp);
  const nextRankIdx = PANIC_RANKS.indexOf(rank) + 1;
  const nextRank = PANIC_RANKS[nextRankIdx];
  const balanceNim = balance.data?.nim ?? null;
  const isTestnet = config.data?.network === "test";
  const preferredKeys = prefs.data?.preferredCategories ?? [];

  return (
    <AppShell>
      {/* ── Player card ── */}
      <section className="rounded-2xl border border-border bg-card p-4 panic-glow">
        <div className="flex items-start gap-3">
          {/* Avatar placeholder */}
          <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-primary/15 text-2xl">
            🎮
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="font-display text-xl font-bold truncate">
                {data?.username ?? "Player"}
              </h1>
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide bg-primary/15 ${rank.color}`}
              >
                {rank.badge}
              </span>
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground tabular">
              {wallet.address ? shortenAddress(wallet.address) : "—"}
            </p>
            {/* On-chain balance */}
            <p className="mt-1 text-xs text-muted-foreground">
              NIM Pay wallet:{" "}
              <span className="font-semibold text-foreground tabular">
                {balance.isLoading
                  ? "loading…"
                  : typeof balanceNim === "number"
                    ? `${formatNim(balanceNim)} NIM`
                    : "unavailable"}
              </span>
            </p>
          </div>
        </div>

        {/* Faucet — only appears on testnet with zero balance */}
        <FaucetButton balanceNim={balanceNim} isTestnet={isTestnet} />

        {/* Streak */}
        <div className="mt-3 flex items-center gap-2 rounded-xl bg-surface px-3 py-2">
          <Flame
            className={`size-5 ${data?.streak ? "text-primary streak-glow" : "text-muted-foreground"}`}
          />
          <div className="flex-1">
            <p className="text-xs font-semibold">
              {data?.streak ?? 0} win streak
              {data?.best_streak ? (
                <span className="ml-2 text-muted-foreground font-normal">
                  · best {data.best_streak}
                </span>
              ) : null}
            </p>
          </div>
          {data?.streak && data.streak >= 3 && (
            <span className="text-xs font-bold text-primary">+{data.streak * 15} XP bonus</span>
          )}
        </div>

        {/* XP progress bar */}
        <div className="mt-3">
          <div className="flex items-center justify-between text-[11px] text-muted-foreground mb-1">
            <span>{rank.name}</span>
            <span className="tabular">
              {xp} XP{nextRank ? ` / ${nextRank.minXp}` : ""}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-surface-2">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${progress * 100}%` }}
            />
          </div>
          {nextRank && (
            <p className="mt-1 text-[10px] text-muted-foreground">
              {nextRank.minXp - xp} XP to {nextRank.name}
            </p>
          )}
        </div>
      </section>

      {/* ── Panic Score + key stats ── */}
      <section className="mt-4">
        <h2 className="mb-2 font-display text-xs font-bold uppercase tracking-widest text-muted-foreground">
          Stats
        </h2>
        <div className="grid grid-cols-2 gap-2">
          <StatCard
            label="Panic Score"
            value={String(data?.panic_score ?? 0)}
            sub="Primary ranking metric"
            highlight
          />
          <StatCard label="Accuracy" value={`${data?.accuracy ?? 0}%`} sub="Correct predictions" />
          <StatCard
            label="Predictions"
            value={String(data?.predictions_count ?? 0)}
            sub="Total calls made"
          />
          <StatCard label="Wins" value={String(data?.wins_count ?? 0)} sub="Correct calls" />
          <StatCard label="NIM Won" value={formatNim(data?.nim_won ?? 0)} sub="Total winnings" />
          <StatCard
            label="NIM Staked"
            value={formatNim(data?.nim_staked ?? 0)}
            sub="Total at risk"
          />
        </div>
      </section>

      {/* ── Preferred categories ── */}
      {preferredKeys.length > 0 && (
        <section className="mt-4">
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-display text-xs font-bold uppercase tracking-widest text-muted-foreground">
              Your Categories
            </h2>
            <Link to="/play" className="text-[11px] font-semibold text-primary">
              Change →
            </Link>
          </div>
          <div className="flex flex-wrap gap-2">
            {preferredKeys.map((key) => {
              const cat = getCategoryByKey(key);
              if (!cat) return null;
              return (
                <span
                  key={key}
                  className={`flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold ${cat.bg} ${cat.color}`}
                >
                  {cat.emoji} {cat.label}
                </span>
              );
            })}
          </div>
        </section>
      )}

      {/* ── Admin link ── */}
      {data?.isAdmin && (
        <Button asChild variant="secondary" className="mt-4 w-full">
          <Link to="/admin">
            <ShieldCheck className="size-4" /> Admin console
          </Link>
        </Button>
      )}

      {/* ── Sign out ── */}
      <Button
        variant="ghost"
        className="mt-2 w-full text-muted-foreground"
        onClick={wallet.signOut}
      >
        <LogOut className="size-4" /> Sign out
      </Button>
    </AppShell>
  );
}

function StatCard({
  label,
  value,
  sub,
  highlight = false,
}: {
  label: string;
  value: string;
  sub: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border p-3 ${
        highlight ? "border-primary/30 bg-primary/5" : "border-border bg-card"
      }`}
    >
      <p className={`font-display text-2xl font-bold tabular ${highlight ? "text-primary" : ""}`}>
        {value}
      </p>
      <p className="mt-0.5 text-xs font-semibold">{label}</p>
      <p className="mt-0.5 text-[10px] text-muted-foreground">{sub}</p>
    </div>
  );
}
