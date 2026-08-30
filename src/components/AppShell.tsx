import { Link, useRouterState } from "@tanstack/react-router";
import { Flame, Home, ListChecks, Trophy, User, Wallet } from "lucide-react";
import type { ReactNode } from "react";
import { shortenAddress } from "@/lib/nim";
import { useWallet } from "@/hooks/useWallet";
import { Button } from "@/components/ui/button";

const TABS = [
  { to: "/", label: "Home", icon: Home },
  { to: "/picks", label: "My Picks", icon: ListChecks },
  { to: "/leaderboard", label: "Ranks", icon: Trophy },
  { to: "/profile", label: "Profile", icon: User },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { address, signedIn, connecting, connect, providerState } = useWallet();

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col bg-background">
      <header className="sticky top-0 z-20 border-b border-border bg-background/90 px-4 py-3 backdrop-blur">
        <div className="flex items-center justify-between gap-3">
          <Link to="/" className="flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <Flame className="size-4" />
            </span>
            <span className="font-display text-lg font-bold leading-none">
              NIM <span className="text-primary">PANIC</span>
            </span>
          </Link>

          {signedIn && address ? (
            <span className="flex items-center gap-1.5 rounded-full bg-surface px-3 py-1.5 text-xs text-muted-foreground tabular">
              <Wallet className="size-3.5 text-primary" />
              {shortenAddress(address)}
            </span>
          ) : (
            <Button size="sm" onClick={connect} disabled={connecting || providerState === "loading"}>
              {connecting ? "Connecting…" : "Connect"}
            </Button>
          )}
        </div>
        {providerState === "unavailable" && (
          <p className="mt-2 rounded-lg bg-surface px-3 py-2 text-[11px] leading-snug text-muted-foreground">
            Browsing mode — open NIM Panic inside Nimiq Pay to connect your wallet and stake NIM.
          </p>
        )}
      </header>

      <main className="flex-1 px-4 pb-28 pt-4">{children}</main>

      <nav className="fixed bottom-0 left-1/2 z-20 w-full max-w-md -translate-x-1/2 border-t border-border bg-background/95 backdrop-blur">
        <ul className="grid grid-cols-4">
          {TABS.map((tab) => {
            const active = tab.to === "/" ? pathname === "/" : pathname.startsWith(tab.to);
            const Icon = tab.icon;
            return (
              <li key={tab.to}>
                <Link
                  to={tab.to}
                  className={`flex flex-col items-center gap-1 py-3 text-[11px] font-medium transition-colors ${
                    active ? "text-primary" : "text-muted-foreground"
                  }`}
                >
                  <Icon className="size-5" />
                  {tab.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
