import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Trophy } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { getLeaderboard } from "@/lib/game.functions";
import { formatNim } from "@/lib/nim";

export const Route = createFileRoute("/leaderboard")({
  head: () => ({
    meta: [
      { title: "Weekly Leaderboard — NIM Panic" },
      {
        name: "description",
        content:
          "See who is calling markets best this week: points, accuracy, streaks and NIM won in NIM Panic.",
      },
      { property: "og:title", content: "Weekly Leaderboard — NIM Panic" },
      {
        property: "og:description",
        content: "Points, accuracy, streaks and NIM won — the weekly NIM Panic rankings.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LeaderboardPage,
});

const MEDALS = ["🥇", "🥈", "🥉"];

function LeaderboardPage() {
  const board = useQuery({ queryKey: ["leaderboard"], queryFn: () => getLeaderboard() });
  const rows = board.data?.rows ?? [];

  return (
    <AppShell>
      <div className="flex items-center gap-2">
        <Trophy className="size-5 text-primary" />
        <h1 className="font-display text-xl font-bold">Leaderboard</h1>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        Week {board.data?.period ?? "—"} · points from correct calls, streaks and participation.
      </p>

      {board.isLoading && <p className="mt-6 text-sm text-muted-foreground">Loading rankings…</p>}
      {board.isError && (
        <p className="mt-6 rounded-xl bg-destructive/15 px-3 py-2 text-sm text-destructive">
          Rankings could not load. Try again shortly.
        </p>
      )}

      {!board.isLoading && rows.length === 0 && (
        <p className="mt-8 rounded-2xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">
          No ranked players yet this week. Make the first call and take the top spot.
        </p>
      )}

      <ol className="mt-5 space-y-2">
        {rows.map((row, index) => (
          <li
            key={row.user_id}
            className={`flex items-center gap-3 rounded-2xl border p-3 ${
              index < 3 ? "border-primary/40 bg-card panic-glow" : "border-border bg-card"
            }`}
          >
            <span className="w-7 text-center font-display text-sm font-bold tabular">
              {MEDALS[index] ?? index + 1}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate font-display text-sm font-bold">
                {row.username ?? "Anonymous"}
              </p>
              <p className="text-[11px] text-muted-foreground tabular">
                {row.wins}/{row.predictions} correct · {row.accuracy}% · streak {row.streak}
              </p>
            </div>
            <div className="text-right">
              <p className="font-display text-sm font-bold text-primary tabular">{row.points} pts</p>
              <p className="text-[11px] text-muted-foreground tabular">
                {formatNim(row.nim_won)} NIM
              </p>
            </div>
          </li>
        ))}
      </ol>
    </AppShell>
  );
}
