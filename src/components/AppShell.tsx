import { Link, useRouterState } from "@tanstack/react-router";
import { Home, ListChecks, Play, Trophy, User } from "lucide-react";
import { NimPanicIcon } from "./NimPanicIcon";
import type { ReactNode } from "react";
import { shortenAddress } from "@/lib/nim";
import { useWallet } from "@/hooks/useWallet";
import { Button } from "@/components/ui/button";

const PLAY_STORE = "https://play.google.com/store/apps/details?id=com.nimiq.pay";
const APP_STORE = "https://apps.apple.com/us/app/nimiq-pay/id6471844738";

function getPlatform(): "android" | "ios" | "desktop" {
  if (typeof navigator === "undefined") return "desktop";
  const ua = navigator.userAgent;
  if (/android/i.test(ua)) return "android";
  if (/iphone|ipad|ipod/i.test(ua)) return "ios";
  return "desktop";
}

const TABS = [
  { to: "/", label: "Home", icon: Home },
  { to: "/play", label: "Play", icon: Play },
  { to: "/picks", label: "My Picks", icon: ListChecks },
  { to: "/leaderboard", label: "Ranks", icon: Trophy },
  { to: "/profile", label: "Profile", icon: User },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { address, signedIn, connecting, connect, providerState } = useWallet();

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col bg-background">
      {/* ── Header ── */}
      <header className="sticky top-0 z-20 border-b border-border bg-background/90 px-4 py-3 backdrop-blur">
        <div className="flex items-center justify-between gap-3">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <span
              className="flex size-8 items-center justify-center rounded-[9px] shadow-[0_0_12px_-2px_var(--color-primary)]"
              style={{ background: "#0F1B3E" }}
            >
              <NimPanicIcon size={24} />
            </span>
            <span className="font-display text-lg font-bold leading-none tracking-tight">
              NIM <span className="text-primary">PANIC</span>
            </span>
          </Link>

          {/* Wallet area */}
          {signedIn && address ? (
            <Link
              to="/profile"
              className="flex items-center gap-1.5 rounded-full bg-surface px-3 py-1.5 text-xs text-muted-foreground tabular transition-colors hover:bg-surface-2"
            >
              <span className="size-1.5 rounded-full bg-success" />
              {shortenAddress(address)}
            </Link>
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

        {/* Nimiq Pay unavailable banner */}
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

      {/* ── Page content ── */}
      <main className="flex-1 px-4 pb-28 pt-4">{children}</main>

      {/* ── Bottom nav ── */}
      <nav className="fixed bottom-0 left-1/2 z-20 w-full max-w-md -translate-x-1/2 border-t border-border bg-background/95 backdrop-blur">
        <ul className="grid grid-cols-5">
          {TABS.map((tab) => {
            const active = tab.to === "/" ? pathname === "/" : pathname.startsWith(tab.to);
            const Icon = tab.icon;
            return (
              <li key={tab.to}>
                <Link
                  to={tab.to}
                  className={`flex flex-col items-center gap-0.5 py-3 text-[10px] font-semibold transition-colors ${
                    active ? "text-primary" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <span
                    className={`flex size-7 items-center justify-center rounded-xl transition-colors ${active ? "bg-primary/15" : ""}`}
                  >
                    <Icon className="size-4" />
                  </span>
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
