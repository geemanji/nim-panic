import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Flame, LogOut, ShieldCheck } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { useWallet } from "@/hooks/useWallet";
import { getMyProfile, getWalletBalance } from "@/lib/game.functions";
import { formatNim, shortenAddress } from "@/lib/nim";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "Your Profile — NIM Panic" },
      {
        name: "description",
        content: "Your NIM Panic stats: streak, accuracy, wins, NIM staked and NIM won.",
      },
      { property: "og:title", content: "Your Profile — NIM Panic" },
      {
        property: "og:description",
        content: "Streak, accuracy and NIM won — your NIM Panic player card.",
      },
      { property: "og:type", content: "profile" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const wallet = useWallet();
  const profile = useQuery({
    queryKey: ["my-profile"],
    queryFn: () => getMyProfile(),
    enabled: wallet.signedIn,
  });
  const balance = useQuery({
    queryKey: ["wallet-balance"],
    queryFn: () => getWalletBalance(),
    enabled: wallet.signedIn,
    retry: false,
  });

  if (!wallet.signedIn) {
    return (
      <AppShell>
        <div className="mt-8 rounded-2xl border border-border bg-card p-6 text-center">
          <h1 className="font-display text-base font-bold">No wallet connected</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Connect your Nimiq wallet to see your streak, accuracy and winnings.
          </p>
          <div className="mt-4 flex justify-center">
            <Button onClick={wallet.connect} disabled={wallet.connecting}>
              {wallet.connecting ? "Connecting…" : "Connect wallet"}
            </Button>
          </div>
        </div>
      </AppShell>
    );
  }

  const data = profile.data;
  const balanceNim = balance.data?.nim ?? null;

  return (
    <AppShell>
      <section className="rounded-2xl border border-border bg-card p-4">
        <h1 className="font-display text-xl font-bold">{data?.username ?? "Player"}</h1>
        <p className="mt-1 text-xs text-muted-foreground tabular">
          {wallet.address ? shortenAddress(wallet.address) : "—"}
        </p>
        <p className="mt-3 flex items-center gap-1.5 text-sm">
          <Flame className="size-4 text-panic" />
          <span className="font-semibold">{data?.streak ?? 0}</span>
          <span className="text-muted-foreground">day streak · best {data?.best_streak ?? 0}</span>
        </p>
        <p className="mt-2 text-xs text-muted-foreground">
          On-chain balance:{" "}
          {balance.isLoading
            ? "loading…"
            : typeof balanceNim === "number"
              ? `${formatNim(balanceNim)} NIM`
              : "unavailable"}
        </p>
      </section>

      <section className="mt-4 grid grid-cols-2 gap-3">
        <Stat label="Accuracy" value={`${data?.accuracy ?? 0}%`} />
        <Stat label="Predictions" value={String(data?.predictions_count ?? 0)} />
        <Stat label="Wins" value={String(data?.wins_count ?? 0)} />
        <Stat label="NIM won" value={formatNim(data?.nim_won ?? 0)} />
        <Stat label="NIM staked" value={formatNim(data?.nim_staked ?? 0)} />
        <Stat label="Best streak" value={String(data?.best_streak ?? 0)} />
      </section>

      {data?.isAdmin && (
        <Button asChild variant="secondary" className="mt-4 w-full">
          <Link to="/admin">
            <ShieldCheck className="size-4" /> Admin console
          </Link>
        </Button>
      )}

      <Button variant="ghost" className="mt-2 w-full text-muted-foreground" onClick={wallet.signOut}>
        <LogOut className="size-4" /> Sign out
      </Button>
    </AppShell>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-3">
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 font-display text-lg font-bold tabular">{value}</p>
    </div>
  );
}
