import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Trophy } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { getLeaderboard } from "@/lib/game.functions";
import { formatNim } from "@/lib/nim";

export const Route = createFileRoute("/leaderboard")({
  head: () => ({
    meta: [
      { title: "Leaderboard — NIM Panic" },
      {
        name: "description",
        content:
          "See who is calling markets best: Panic Score, accuracy, streaks and NIM won in NIM Panic.",
      },
      { property: "og:title", content: "Leaderboard — NIM Panic" },
      { property: "og:description", content: "Weekly and all-time NIM Panic rankings." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LeaderboardPage,
});

const MEDALS = ["🥇", "🥈", "🥉"];

type Period = "weekly" | "alltime";

function LeaderboardPage() {
  const [period, setPeriod] = useState<Period>("weekly");

  const board = useQuery({
    queryKey: ["leaderboard", period],
    queryFn: () => getLeaderboard({ data: { period } }),
  });

  const rows = board.data?.rows ?? [];

  return (
    <AppShell>
      {/* ── Header ── */}
      <div className="flex items-center gap-2">
        <Trophy className="size-5 text-primary" />
        <h1 className="font-display text-xl font-bold">Leaderboard</h1>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        Ranked by Panic Score — wins, streaks and participation.
      </p>

      {/* ── Period tabs ── */}
      <div className="mt-4 flex gap-1 rounded-xl bg-surface p-1">
        {(["weekly", "alltime"] as const).map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`flex-1 rounded-lg py-2 text-xs font-bold transition-colors ${
              period === p
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {p === "weekly" ? "🗓 This Week" : "🏆 All Time"}
          </button>
        ))}
      </div>

      {board.isLoading && <p className="mt-6 text-sm text-muted-foreground">Loading rankings…</p>}
      {board.isError && (
        <p className="mt-6 rounded-xl bg-destructive/15 px-3 py-2 text-sm text-destructive">
          Rankings could not load. Try again shortly.
        </p>
      )}

      {!board.isLoading && rows.length === 0 && (
        <div className="mt-8 rounded-2xl border border-border bg-card p-6 text-center">
          <p className="font-display text-base font-bold">No ranked players yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {period === "weekly"
              ? "Make the first call this week and take the top spot."
              : "No all-time stats recorded yet."}
          </p>
        </div>
      )}

      {/* ── Top 3 podium ── */}
      {rows.length >= 3 && (
        <div className="mt-5 grid grid-cols-3 gap-2">
          {/* 2nd place */}
          <PodiumCard row={rows[1]!} rank={2} />
          {/* 1st place — taller */}
          <PodiumCard row={rows[0]!} rank={1} elevated />
          {/* 3rd place */}
          <PodiumCard row={rows[2]!} rank={3} />
        </div>
      )}

      {/* ── Full list (rank 4+, or all if < 3) ── */}
      <ol className="mt-4 space-y-2">
        {(rows.length >= 3 ? rows.slice(3) : rows).map((row, index) => {
          const rank = rows.length >= 3 ? index + 4 : index + 1;
          return (
            <li
              key={row.user_id}
              className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3"
            >
              <span className="w-6 text-center font-display text-xs font-bold tabular text-muted-foreground">
                {rank}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-display text-sm font-bold">
                  {row.username ?? "Anonymous"}
                </p>
                <p className="mt-0.5 text-[11px] text-muted-foreground tabular">
                  {row.wins}W · {row.accuracy}% acc · {row.streak} streak
                </p>
              </div>
              <div className="shrink-0 text-right">
                <p className="font-display text-sm font-bold text-primary tabular">
                  {row.points} pts
                </p>
                <p className="text-[11px] text-muted-foreground tabular">
                  {formatNim(row.nim_won)} NIM
                </p>
              </div>
            </li>
          );
        })}
      </ol>

      {rows.length > 0 && (
        <p className="mt-4 text-center text-[11px] text-muted-foreground">
          Panic Score = wins × 10 + streak × 3 + predictions
        </p>
      )}
    </AppShell>
  );
}

function PodiumCard({
  row,
  rank,
  elevated = false,
}: {
  row: {
    user_id: string;
    username: string | null;
    points: number;
    wins: number;
    accuracy: number;
    streak: number;
    nim_won: number | string;
  };
  rank: number;
  elevated?: boolean;
}) {
  return (
    <div
      className={`flex flex-col items-center rounded-2xl border bg-card p-3 text-center ${
        rank === 1 ? "border-primary/40 panic-glow" : "border-border"
      } ${elevated ? "pt-4" : ""}`}
    >
      <span className="text-2xl">{MEDALS[rank - 1]}</span>
      <p className="mt-1 w-full truncate font-display text-xs font-bold">
        {row.username ?? "Anon"}
      </p>
      <p className="mt-1 font-display text-base font-bold text-primary tabular">
        {row.points}
        <span className="ml-0.5 text-[10px] font-normal text-muted-foreground">pts</span>
      </p>
      <p className="text-[10px] text-muted-foreground tabular">
        {row.wins}W · {row.accuracy}%
      </p>
    </div>
  );
}
