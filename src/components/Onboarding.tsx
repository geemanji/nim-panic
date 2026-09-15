import { useState, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Flame, ChevronRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CategoryCard } from "@/components/CategoryCard";
import { CATEGORIES } from "@/lib/categories";
import { saveUserPreferences } from "@/lib/preferences.functions";
import { useWallet } from "@/hooks/useWallet";

type Step = "welcome" | "connect" | "categories" | "done";

type Props = {
  onComplete: () => void;
};

export function Onboarding({ onComplete }: Props) {
  const wallet = useWallet();
  const queryClient = useQueryClient();
  const [step, setStep] = useState<Step>("welcome");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  const toggleCategory = useCallback((key: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const handleConnect = useCallback(async () => {
    await wallet.connect();
    // connect() itself shows error toasts on failure — if it succeeds, advance
    if (wallet.signedIn) setStep("categories");
  }, [wallet]);

  // Watch for sign-in completing via the wallet hook (it's async internally)
  const handleConnectAndAdvance = useCallback(async () => {
    if (wallet.signedIn) {
      setStep("categories");
      return;
    }
    await wallet.connect();
    // connect sets signedIn via context — we advance on the next render via useEffect below
  }, [wallet]);

  // Advance to categories once wallet is connected
  if (step === "connect" && wallet.signedIn) {
    setStep("categories");
  }

  const handleSave = useCallback(async () => {
    if (selected.size === 0) {
      toast.error("Pick at least one category first.");
      return;
    }
    setSaving(true);
    try {
      await saveUserPreferences({
        data: { preferredCategories: [...selected] as never[], onboardingComplete: true },
      });
      await queryClient.invalidateQueries({ queryKey: ["preferences"] });
      setStep("done");
      setTimeout(onComplete, 900);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save preferences.");
    } finally {
      setSaving(false);
    }
  }, [selected, queryClient, onComplete]);

  // ── Welcome ──────────────────────────────────────────────────────────────
  if (step === "welcome") {
    return (
      <OnboardingShell>
        <div className="flex flex-col items-center text-center slide-up">
          <div className="flex size-20 items-center justify-center rounded-3xl bg-primary/15 panic-glow">
            <Flame className="size-10 text-primary" />
          </div>
          <h1 className="mt-6 font-display text-3xl font-bold leading-tight">
            Welcome to<br />
            <span className="text-primary">NIM PANIC</span>
          </h1>
          <p className="mt-3 max-w-xs text-sm text-muted-foreground leading-relaxed">
            Fast, social predictions on Nimiq. Call outcomes before the clock locks, stake NIM and climb the leaderboard.
          </p>
          <div className="mt-6 flex flex-col gap-2 w-full">
            <div className="flex items-center gap-3 rounded-xl bg-surface px-4 py-3 text-left">
              <span className="text-xl">⚡</span>
              <div>
                <p className="text-sm font-semibold">Beat the clock</p>
                <p className="text-xs text-muted-foreground">Markets lock without warning</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-xl bg-surface px-4 py-3 text-left">
              <span className="text-xl">🔥</span>
              <div>
                <p className="text-sm font-semibold">Build your streak</p>
                <p className="text-xs text-muted-foreground">Consecutive wins earn bonus XP</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-xl bg-surface px-4 py-3 text-left">
              <span className="text-xl">🏆</span>
              <div>
                <p className="text-sm font-semibold">Climb the ranks</p>
                <p className="text-xs text-muted-foreground">Weekly leaderboard resets every Monday</p>
              </div>
            </div>
          </div>
          <Button
            className="mt-8 h-12 w-full text-base font-bold"
            onClick={() => setStep("connect")}
          >
            Let's go <ChevronRight className="size-4" />
          </Button>
        </div>
      </OnboardingShell>
    );
  }

  // ── Connect wallet ────────────────────────────────────────────────────────
  if (step === "connect") {
    return (
      <OnboardingShell>
        <div className="flex flex-col items-center text-center slide-up">
          <div className="flex size-16 items-center justify-center rounded-2xl bg-primary/15">
            <span className="text-3xl">👛</span>
          </div>
          <h2 className="mt-5 font-display text-2xl font-bold">Connect your wallet</h2>
          <p className="mt-2 text-sm text-muted-foreground leading-relaxed max-w-xs">
            NIM Panic uses your Nimiq wallet for identity and staking. No account creation needed.
          </p>
          <div className="mt-6 w-full rounded-2xl border border-border bg-card p-4 text-left">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">How it works</p>
            {[
              ["1", "Choose a Nimiq address"],
              ["2", "Sign a one-time message"],
              ["3", "You're in — no passwords"],
            ].map(([n, label]) => (
              <div key={n} className="flex items-center gap-3 py-1.5">
                <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/20 text-[10px] font-bold text-primary">
                  {n}
                </span>
                <p className="text-sm">{label}</p>
              </div>
            ))}
          </div>
          <Button
            className="mt-6 h-12 w-full text-base font-bold"
            onClick={handleConnectAndAdvance}
            disabled={wallet.connecting}
          >
            {wallet.connecting ? "Connecting…" : "Connect Nimiq Wallet"}
          </Button>
          {wallet.providerState === "unavailable" && (
            <p className="mt-3 text-xs text-muted-foreground">
              Open NIM Panic inside <span className="text-primary font-semibold">Nimiq Pay</span> to connect your wallet.
            </p>
          )}
        </div>
      </OnboardingShell>
    );
  }

  // ── Category selection ────────────────────────────────────────────────────
  if (step === "categories") {
    return (
      <OnboardingShell>
        <div className="slide-up">
          <h2 className="font-display text-2xl font-bold text-center">
            What are you into?
          </h2>
          <p className="mt-2 text-sm text-muted-foreground text-center">
            Pick your categories. Your feed will be tailored to these.
          </p>

          <div className="mt-5 grid grid-cols-2 gap-3">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.key}
                onClick={() => toggleCategory(cat.key)}
                className={`relative flex flex-col items-center gap-2 rounded-2xl border p-4 text-center transition-all active:scale-[0.96] ${
                  selected.has(cat.key)
                    ? `${cat.border} ${cat.bg}`
                    : "border-border bg-card"
                }`}
              >
                {selected.has(cat.key) && (
                  <span className="absolute right-2 top-2 flex size-4 items-center justify-center rounded-full bg-primary">
                    <Check className="size-2.5 text-primary-foreground" />
                  </span>
                )}
                <span className="text-2xl">{cat.emoji}</span>
                <p className={`font-display text-sm font-bold ${selected.has(cat.key) ? cat.color : ""}`}>
                  {cat.label}
                </p>
                <p className="text-[10px] text-muted-foreground">{cat.description}</p>
              </button>
            ))}
          </div>

          <Button
            className="mt-6 h-12 w-full text-base font-bold"
            onClick={handleSave}
            disabled={saving || selected.size === 0}
          >
            {saving ? "Saving…" : `Start playing${selected.size > 0 ? ` (${selected.size} selected)` : ""}`}
          </Button>
          <button
            className="mt-3 w-full text-center text-xs text-muted-foreground underline-offset-4 hover:underline"
            onClick={handleSave}
            disabled={saving}
          >
            Skip — show me everything
          </button>
        </div>
      </OnboardingShell>
    );
  }

  // ── Done ─────────────────────────────────────────────────────────────────
  return (
    <OnboardingShell>
      <div className="flex flex-col items-center text-center slide-up">
        <div className="flex size-20 items-center justify-center rounded-3xl bg-success/20 score-pop">
          <span className="text-4xl">🎉</span>
        </div>
        <h2 className="mt-5 font-display text-2xl font-bold">You're all set!</h2>
        <p className="mt-2 text-sm text-muted-foreground">Loading your personalized feed…</p>
        <div className="mt-6 flex gap-1">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="size-2 rounded-full bg-primary"
              style={{ animationDelay: `${i * 0.15}s` }}
            />
          ))}
        </div>
      </div>
    </OnboardingShell>
  );
}

function OnboardingShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">{children}</div>
    </div>
  );
}
