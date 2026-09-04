import { useEffect, useState } from "react";
import { Flame } from "lucide-react";

const MIN_DISPLAY_MS = 1200;
const FADE_MS = 500;

/**
 * Branded splash shown on first load. Fades out after a fixed minimum
 * display time, then unmounts. No provider/route coupling, so it always
 * resolves deterministically regardless of Nimiq Pay availability.
 */
export function Splash({ onDone }: { onDone: () => void }) {
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    const leaveT = window.setTimeout(() => setLeaving(true), MIN_DISPLAY_MS);
    const doneT = window.setTimeout(onDone, MIN_DISPLAY_MS + FADE_MS);
    return () => {
      window.clearTimeout(leaveT);
      window.clearTimeout(doneT);
    };
  }, [onDone]);

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
