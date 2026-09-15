import { Link } from "@tanstack/react-router";
import { Trophy, TrendingUp, Gamepad2, Cpu, Sparkles, Globe } from "lucide-react";
import type { Category } from "@/lib/categories";

const ICONS: Record<string, React.ElementType> = {
  Trophy,
  TrendingUp,
  Gamepad2,
  Cpu,
  Sparkles,
  Globe,
};

type Props = {
  category: Category;
  /** Live open prediction count for this category. */
  liveCount?: number;
  /** Compact mode — 2-column grid tile. Full mode — wider card with description. */
  variant?: "compact" | "full";
};

export function CategoryCard({ category, liveCount = 0, variant = "compact" }: Props) {
  const Icon = ICONS[category.icon] ?? Globe;

  if (variant === "full") {
    return (
      <Link
        to="/category/$slug"
        params={{ slug: category.slug }}
        className={`flex items-center gap-4 rounded-2xl border p-4 transition-all active:scale-[0.98] cat-lift ${category.border} bg-card`}
      >
        {/* Icon blob */}
        <span
          className={`flex size-12 shrink-0 items-center justify-center rounded-2xl text-2xl ${category.bg}`}
        >
          {category.emoji}
        </span>

        <div className="min-w-0 flex-1">
          <p className={`font-display text-base font-bold ${category.color}`}>
            {category.label}
          </p>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">{category.description}</p>
        </div>

        <div className="shrink-0 text-right">
          {liveCount > 0 ? (
            <>
              <p className={`font-display text-lg font-bold tabular ${category.color}`}>
                {liveCount}
              </p>
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Live</p>
            </>
          ) : (
            <p className="text-[11px] text-muted-foreground/50">No live</p>
          )}
        </div>
      </Link>
    );
  }

  // compact (2-column grid tile)
  return (
    <Link
      to="/category/$slug"
      params={{ slug: category.slug }}
      className={`flex flex-col items-center gap-2 rounded-2xl border p-4 text-center transition-all active:scale-[0.96] cat-lift ${category.border} bg-card`}
    >
      <span className={`flex size-10 items-center justify-center rounded-xl text-xl ${category.bg}`}>
        {category.emoji}
      </span>

      <p className={`font-display text-sm font-bold ${category.color}`}>{category.label}</p>

      {liveCount > 0 ? (
        <span
          className={`rounded-full px-2 py-0.5 text-[10px] font-bold tabular ${category.bg} ${category.color}`}
        >
          {liveCount} live
        </span>
      ) : (
        <span className="rounded-full bg-muted/30 px-2 py-0.5 text-[10px] text-muted-foreground/60">
          Coming soon
        </span>
      )}
    </Link>
  );
}
