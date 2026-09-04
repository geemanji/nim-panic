import { useEffect, useState } from "react";
import { Flame } from "lucide-react";
import { useWallet } from "@/hooks/useWallet";

const MIN_DISPLAY_MS = 1200;
const MAX_DISPLAY_MS = 2200;

/**
 * Branded splash shown on first load. Stays at least MIN_DISPLAY_MS and at
 * most MAX_DISPLAY_MS — fading once the Nimiq provider resolves or the cap
 * hits, whichever comes first. Never lingers longer than the hard cap, so
 * the app is always reachable even outside Nimiq Pay.
 */
export function Splash({ onDone }: { onDone: () => void }) {
  const { providerState } = useWallet();
  const [leaving, setLeaving] = useState(false);
  const [mountedAt] = useState(() => Date.now());

  useEffect(() => {
    if (leaving) return;
    const elapsed = Date.now() - mountedAt;
    // Hard cap guarantees fade no matter the provider state.
    const cap = window.setTimeout(() => setLeaving(true), Math.max(0, MAX_DISPLAY_MS - elapsed));
    let ready: number | undefined;
    if (providerState !== "loading") {
      const remaining = Math.max(0, MIN_DISPLAY_MS - elapsed);
      ready = window.setTimeout(() => setLeaving(true), remaining);
    }
    return () => {
      window.clearTimeout(cap);
      if (ready) window.clearTimeout(ready);
    };
  }, [providerState, leaving, mountedAt]);

  useEffect(() => {
    if (!leaving) return;
    const t = window.setTimeout(onDone, 450); // match fade-out duration
    return () => window.clearTimeout(t);
  }, [leaving, onDone]);

  return (
    <div
      aria-hidden={leaving}
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-background transition-opacity duration-500 ${
        leaving ? "pointer-events-none opacity-0" : "opacity-100"
      }`}
    >
      <div className="relative flex size-20 items-center justify-center">
        <span className="absolute inset-0 animate-[pulse-ring_1.6s_ease-out_infinite] rounded-3xl bg-primary/25" />
        <span className="absolute inset-0 animate-[pulse-ring_1.6s_ease-out_infinite_0.4s] rounded-3xl bg-primary/15" />
        <span className="relative flex size-16 items-center justify-center rounded-3xl bg-primary text-primary-foreground shadow-[0_0_40px_-8px_var(--color-primary)]">
          <Flame className="size-8" />
        </span>
      </div>

      <h1 className="mt-6 font-display text-3xl font-bold leading-none">
        NIM <span className="text-primary">PANIC</span>
      </h1>
      <p className="mt-2 text-xs font-medium uppercase tracking-[0.25em] text-muted-foreground">
        Predict · Stake · Win
      </p>

      <div className="mt-8 flex items-center gap-1.5">
        <span className="size-2 animate-[bounce-dot_1s_infinite] rounded-full bg-primary" />
        <span className="size-2 animate-[bounce-dot_1s_infinite_0.15s] rounded-full bg-primary" />
        <span className="size-2 animate-[bounce-dot_1s_infinite_0.3s] rounded-full bg-primary" />
      </div>

      <style>{`
        @keyframes pulse-ring {
          0% { transform: scale(0.85); opacity: 0.7; }
          70% { transform: scale(1.25); opacity: 0; }
          100% { transform: scale(1.25); opacity: 0; }
        }
        @keyframes bounce-dot {
          0%, 100% { transform: translateY(0); opacity: 0.4; }
          50% { transform: translateY(-6px); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
