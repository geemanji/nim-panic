/**
 * NIM Panic — Category definitions.
 * Six canonical prediction categories, each with a slug, display name,
 * icon name (Lucide), accent colour token, and a short description.
 *
 * The `category` column in the `predictions` table stores the slug in
 * UPPERCASE (e.g. "CRYPTO"), matching what already exists in demo data.
 */

export type CategorySlug = "sports" | "crypto" | "esports" | "tech" | "culture" | "world";

export type Category = {
  slug: CategorySlug;
  /** DB value — stored uppercase. */
  key: string;
  label: string;
  /** Lucide icon name */
  icon: string;
  /** Tailwind color class used for the category accent. */
  color: string;
  /** Subtle bg used for category card/badge surfaces. */
  bg: string;
  /** Border color variant. */
  border: string;
  description: string;
  emoji: string;
};

export const CATEGORIES: Category[] = [
  {
    slug: "sports",
    key: "SPORTS",
    label: "Sports",
    icon: "Trophy",
    color: "text-cat-sports",
    bg: "bg-cat-sports/15",
    border: "border-cat-sports/40",
    description: "Football, basketball, F1 and more",
    emoji: "🏆",
  },
  {
    slug: "crypto",
    key: "CRYPTO",
    label: "Crypto",
    icon: "TrendingUp",
    color: "text-cat-crypto",
    bg: "bg-cat-crypto/15",
    border: "border-cat-crypto/40",
    description: "BTC, ETH, NIM price calls",
    emoji: "📈",
  },
  {
    slug: "esports",
    key: "ESPORTS",
    label: "Esports",
    icon: "Gamepad2",
    color: "text-cat-esports",
    bg: "bg-cat-esports/15",
    border: "border-cat-esports/40",
    description: "Tournaments, match outcomes",
    emoji: "🎮",
  },
  {
    slug: "tech",
    key: "TECH",
    label: "Tech",
    icon: "Cpu",
    color: "text-cat-tech",
    bg: "bg-cat-tech/15",
    border: "border-cat-tech/40",
    description: "Launches, metrics, milestones",
    emoji: "💻",
  },
  {
    slug: "culture",
    key: "CULTURE",
    label: "Culture",
    icon: "Sparkles",
    color: "text-cat-culture",
    bg: "bg-cat-culture/15",
    border: "border-cat-culture/40",
    description: "Music, film, pop moments",
    emoji: "✨",
  },
  {
    slug: "world",
    key: "WORLD",
    label: "World",
    icon: "Globe",
    color: "text-cat-world",
    bg: "bg-cat-world/15",
    border: "border-cat-world/40",
    description: "Global events and outcomes",
    emoji: "🌍",
  },
];

/** Map DB key → Category */
export const CATEGORY_BY_KEY: Record<string, Category> = Object.fromEntries(
  CATEGORIES.map((c) => [c.key, c]),
);

/** Map slug → Category */
export const CATEGORY_BY_SLUG: Record<string, Category> = Object.fromEntries(
  CATEGORIES.map((c) => [c.slug, c]),
);

/** Get a category by its DB key (case-insensitive, returns undefined if not found). */
export function getCategoryByKey(key: string): Category | undefined {
  return CATEGORY_BY_KEY[key.toUpperCase()];
}

/** Normalise a raw prediction category string to the nearest known slug. */
export function normaliseCategoryKey(raw: string): string {
  const upper = raw.toUpperCase();
  // Map legacy keys to canonical ones
  const aliases: Record<string, string> = {
    GENERAL: "WORLD",
    NIMIQ: "CRYPTO",
    WEATHER: "WORLD",
  };
  return aliases[upper] ?? upper;
}
