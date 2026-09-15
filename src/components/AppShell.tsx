import { Link, useRouterState } from "@tanstack/react-router";
import { Flame, Home, LayoutDashboard, ListChecks, Trophy, User, Wallet } from "lucide-react";
import type { ReactNode } from "react";
import { shortenAddress } from "@/lib/nim";
import { useWallet } from "@/hooks/useWallet";
import { Button } from "@/components/ui/button";

const PLAY_STORE = "https://play.google.com/store/apps/details?id=com.nimiq.pay";
const APP_STORE = "https://apps.apple.com/us/app/nimiq-pay/id6471844738";

/** Detect the user's platform to surface the right store link. */
function getPlatform(): "android" | "ios" | "desktop" {
  if (typeof navigator === "undefined") return "desktop";
  const ua = navigator.userAgent;
  if (/android/i.test(ua)) return "android";
  if (/iphone|ipad|ipod/i.test(ua)) return "ios";
  return "desktop";
}

const TABS = [
  { to: "/", label: "Home", icon: Home },
  { to: "/dashboard", label: "Dash", icon: LayoutDashboard },
  { to: "/picks", label: "Picks", icon: ListChecks },
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
            <Button
              size="sm"
              onClick={connect}
              disabled={connecting || providerState === "loading"}
            >
              {connecting ? "Connecting…" : "Connect"}
            </Button>
          )}
        </div>

        {providerState === "unavailable" && (
          <div className="mt-2 rounded-lg bg-surface px-3 py-3 text-[11px] leading-snug">
            <p className="font-medium text-foreground">NIM Panic runs inside Nimiq Pay.</p>
            <p className="mt-0.5 text-muted-foreground">
              Download the app, open NIM Panic from the mini-apps tab, and stake NIM.
            </p>
            {(() => {
              const platform = getPlatform();
              return (
                <div className="mt-2 flex flex-wrap gap-2">
                  {(platform === "android" || platform === "desktop") && (
                    <a
                      href={PLAY_STORE}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-[11px] font-semibold text-primary-foreground"
                    >
                      Google Play
                    </a>
                  )}
                  {(platform === "ios" || platform === "desktop") && (
                    <a
                      href={APP_STORE}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-[11px] font-semibold text-primary-foreground"
                    >
                      App Store
                    </a>
                  )}
                </div>
              );
            })()}
          </div>
        )}
      </header>

      <main className="flex-1 px-4 pb-28 pt-4">{children}</main>

      <nav className="fixed bottom-0 left-1/2 z-20 w-full max-w-md -translate-x-1/2 border-t border-border bg-background/95 backdrop-blur">
        <ul className="grid grid-cols-5">
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
