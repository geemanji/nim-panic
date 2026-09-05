import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useWallet } from "@/hooks/useWallet";
import {
  adminAccess,
  adminClaim,
  adminCreatePrediction,
  adminListPredictions,
  adminLockPrediction,
  adminOpenMarket,
  adminResolvePrediction,
  adminRetryPayouts,
  adminSettlePrediction,
} from "@/lib/admin.functions";
import { formatNim, shortenAddress } from "@/lib/nim";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Admin Console — NIM Panic" },
      {
        name: "description",
        content: "Create markets, resolve winning outcomes and run NIM payouts for NIM Panic.",
      },
      { property: "og:title", content: "Admin Console — NIM Panic" },
      {
        property: "og:description",
        content: "Market creation, resolution and settlement controls for NIM Panic operators.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminPage,
});

/** One-tap real market templates. */
const TEMPLATES: {
  label: string;
  question: string;
  description: string;
  category: string;
  outcomes: string;
  lockMinutes: string;
  resolutionMinutes: string;
}[] = [
  {
    label: "BTC 24h close",
    question: "Will Bitcoin close higher 24 hours from now?",
    description: "Settled on the BTC/USD price 24 hours after this market opens.",
    category: "CRYPTO",
    outcomes: "UP|Higher\nDOWN|Lower",
    lockMinutes: "60",
    resolutionMinutes: "1440",
  },
  {
    label: "NIM price move",
    question: "Will NIM move more than 3% in either direction today?",
    description: "Measured against the NIM/USD price at market open.",
    category: "NIMIQ",
    outcomes: "YES|Yes, over 3%\nNO|No, flat-ish",
    lockMinutes: "120",
    resolutionMinutes: "1440",
  },
  {
    label: "Premier League match",
    question: "Who wins the next Premier League fixture of the weekend?",
    description: "Regular time result only. Edit the question with the exact fixture.",
    category: "SPORTS",
    outcomes: "HOME|Home win\nDRAW|Draw\nAWAY|Away win",
    lockMinutes: "180",
    resolutionMinutes: "420",
  },
  {
    label: "ETH vs BTC week",
    question: "Will ETH outperform BTC over the next 7 days?",
    description: "Compares the 7-day percentage change of ETH and BTC.",
    category: "CRYPTO",
    outcomes: "ETH|ETH wins\nBTC|BTC wins",
    lockMinutes: "720",
    resolutionMinutes: "10080",
  },
];

function AdminPage() {
  const wallet = useWallet();
  const queryClient = useQueryClient();

  const access = useQuery({
    queryKey: ["admin-access"],
    queryFn: () => adminAccess(),
    enabled: wallet.signedIn,
    retry: false,
  });

  const list = useQuery({
    queryKey: ["admin-predictions"],
    queryFn: () => adminListPredictions(),
    enabled: Boolean(access.data?.isAdmin),
    retry: false,
  });

  const [preset, setPreset] = useState<(typeof TEMPLATES)[number] | null>(null);

  const refresh = () => queryClient.invalidateQueries();

  const claim = useMutation({
    mutationFn: () => adminClaim(),
    onSuccess: () => {
      toast.success("Admin access granted to this wallet");
      refresh();
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Could not claim"),
  });

  const retry = useMutation({
    mutationFn: () => adminRetryPayouts(),
    onSuccess: (result) => {
      toast.success(`Retried payouts — ${result.sent} sent`);
      refresh();
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Retry failed"),
  });

  if (!wallet.signedIn) {
    return (
      <AppShell>
        <Locked
          body="Connect an admin wallet to manage markets."
          action={
            <Button onClick={wallet.connect} disabled={wallet.connecting}>
              {wallet.connecting ? "Connecting…" : "Connect wallet"}
            </Button>
          }
        />
      </AppShell>
    );
  }

  if (access.isLoading) {
    return (
      <AppShell>
        <p className="mt-8 text-center text-sm text-muted-foreground">Checking access…</p>
      </AppShell>
    );
  }

  if (!access.data?.isAdmin) {
    return (
      <AppShell>
        <Locked
          body={
            access.data?.canBootstrap
              ? "No operator has claimed this console yet. Claim it with this wallet to run the game."
              : "This wallet is not an admin. Add it to the admin allowlist to unlock this console."
          }
          action={
            access.data?.canBootstrap ? (
              <Button onClick={() => claim.mutate()} disabled={claim.isPending}>
                {claim.isPending ? "Claiming…" : "Claim admin access"}
              </Button>
            ) : undefined
          }
        />
      </AppShell>
    );
  }

  return (
    <AppShell>
      <h1 className="font-display text-xl font-bold">Admin console</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Create markets, open them live, resolve outcomes and settle payouts.
        {access.data.wallet ? ` Signed in as ${shortenAddress(access.data.wallet)}.` : ""}
      </p>

      <section className="mt-5">
        <h2 className="mb-2 font-display text-sm font-bold uppercase tracking-wide">
          Question templates
        </h2>
        <div className="flex flex-wrap gap-2">
          {TEMPLATES.map((template) => (
            <Button
              key={template.label}
              size="sm"
              variant="secondary"
              onClick={() => {
                setPreset(template);
                toast.success(`Loaded "${template.label}" — review and create`);
              }}
            >
              {template.label}
            </Button>
          ))}
        </div>
      </section>

      <CreateForm preset={preset} onDone={refresh} />

      <section className="mt-6">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="font-display text-sm font-bold uppercase tracking-wide">Markets</h2>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => retry.mutate()}
            disabled={retry.isPending}
          >
            {retry.isPending ? "Retrying…" : "Retry payouts"}
          </Button>
        </div>
        {list.isLoading && <p className="text-sm text-muted-foreground">Loading markets…</p>}
        <div className="space-y-3">
          {(list.data ?? []).map((row) => (
            <AdminRow key={row.id} row={row} onDone={refresh} />
          ))}
        </div>
        {!list.isLoading && (list.data ?? []).length === 0 && (
          <p className="rounded-2xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">
            No markets yet. Create the first one above.
          </p>
        )}
      </section>
    </AppShell>
  );
}

type AdminPrediction = Awaited<ReturnType<typeof adminListPredictions>>[number];

function AdminRow({ row, onDone }: { row: AdminPrediction; onDone: () => void }) {
  const outcomes = (row.outcomes as unknown as { key: string; label: string }[]) ?? [];
  const [lockMinutes, setLockMinutes] = useState("120");
  const [resolutionMinutes, setResolutionMinutes] = useState("240");

  const openMarket = useMutation({
    mutationFn: () =>
      adminOpenMarket({
        data: {
          predictionId: row.id,
          lockMinutes: Number(lockMinutes),
          resolutionMinutes: Number(resolutionMinutes),
        },
      }),
    onSuccess: () => {
      toast.success("Market is live");
      onDone();
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Could not open"),
  });

  const lock = useMutation({
    mutationFn: () => adminLockPrediction({ data: { predictionId: row.id } }),
    onSuccess: () => {
      toast.success("Entries closed");
      onDone();
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Could not lock"),
  });

  const resolve = useMutation({
    mutationFn: (winningOutcome: string) =>
      adminResolvePrediction({ data: { predictionId: row.id, winningOutcome } }),
    onSuccess: () => {
      toast.success("Resolved");
      onDone();
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Could not resolve"),
  });

  const settle = useMutation({
    mutationFn: () => adminSettlePrediction({ data: { predictionId: row.id } }),
    onSuccess: (result) => {
      toast.success(`Settled — ${result.paid} paid, ${result.pending} pending`);
      onDone();
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Could not settle"),
  });

  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wide">
        <span className="rounded-full bg-surface-2 px-2 py-0.5 text-muted-foreground">
          {row.category}
        </span>
        <span className="ml-auto rounded-full bg-surface-2 px-2 py-0.5 text-muted-foreground">
          {row.status}
        </span>
      </div>
      <h3 className="mt-2 font-display text-sm font-bold leading-snug">{row.question}</h3>
      <p className="mt-1 text-[11px] text-muted-foreground tabular">
        {row.participants_count} players · {formatNim(row.total_staked_nim)} NIM staked · locks{" "}
        {new Date(row.lock_time).toLocaleString()}
      </p>

      {row.status !== "SETTLED" && (
        <div className="mt-3 rounded-xl bg-surface p-3">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
            Go live from now
          </p>
          <div className="mt-2 flex items-center gap-2">
            <Input
              value={lockMinutes}
              onChange={(e) => setLockMinutes(e.target.value)}
              inputMode="numeric"
              aria-label="Locks in minutes"
              className="h-9"
            />
            <Input
              value={resolutionMinutes}
              onChange={(e) => setResolutionMinutes(e.target.value)}
              inputMode="numeric"
              aria-label="Resolves in minutes"
              className="h-9"
            />
            <Button size="sm" disabled={openMarket.isPending} onClick={() => openMarket.mutate()}>
              {openMarket.isPending ? "Opening…" : "Open"}
            </Button>
          </div>
          <p className="mt-1 text-[10px] text-muted-foreground">
            Minutes until entries close / until the result is expected.
          </p>
        </div>
      )}

      {row.status === "OPEN" && (
        <Button
          size="sm"
          variant="secondary"
          className="mt-3 w-full"
          disabled={lock.isPending}
          onClick={() => lock.mutate()}
        >
          {lock.isPending ? "Closing…" : "Close entries now"}
        </Button>
      )}

      {row.status !== "SETTLED" && !row.winning_outcome && (
        <div className="mt-3 flex flex-wrap gap-2">
          {outcomes.map((outcome) => (
            <Button
              key={outcome.key}
              size="sm"
              variant="secondary"
              disabled={resolve.isPending}
              onClick={() => resolve.mutate(outcome.key)}
            >
              Resolve: {outcome.label}
            </Button>
          ))}
        </div>
      )}

      {row.status === "RESOLVED" && (
        <Button
          size="sm"
          className="mt-3 w-full"
          disabled={settle.isPending}
          onClick={() => settle.mutate()}
        >
          {settle.isPending ? "Settling…" : "Settle & pay winners"}
        </Button>
      )}

      {row.status === "SETTLED" && (
        <p className="mt-3 text-xs text-success">Settled · winner {row.winning_outcome}</p>
      )}
    </div>
  );
}

function CreateForm({
  preset,
  onDone,
}: {
  preset: {
    question: string;
    description: string;
    category: string;
    outcomes: string;
    lockMinutes: string;
    resolutionMinutes: string;
  } | null;
  onDone: () => void;
}) {
  const [question, setQuestion] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("CRYPTO");
  const [outcomes, setOutcomes] = useState("YES|Yes\nNO|No");
  const [lockMinutes, setLockMinutes] = useState("120");
  const [resolutionMinutes, setResolutionMinutes] = useState("180");
  const [minStake, setMinStake] = useState("5");
  const [maxStake, setMaxStake] = useState("500");
  const [appliedPreset, setAppliedPreset] = useState<string | null>(null);

  // Fill the form when a template is picked (render-time sync, no effect needed).
  if (preset && preset.question !== appliedPreset) {
    setAppliedPreset(preset.question);
    setQuestion(preset.question);
    setDescription(preset.description);
    setCategory(preset.category);
    setOutcomes(preset.outcomes);
    setLockMinutes(preset.lockMinutes);
    setResolutionMinutes(preset.resolutionMinutes);
  }

  const create = useMutation({
    mutationFn: async () => {
      const parsed = outcomes
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => {
          const [key, label] = line.split("|");
          if (!key || !label) throw new Error('Use "KEY|Label" on each outcome line.');
          return { key: key.trim(), label: label.trim() };
        });
      return adminCreatePrediction({
        data: {
          question,
          description: description || undefined,
          category,
          outcomes: parsed,
          lockMinutes: Number(lockMinutes),
          resolutionMinutes: Number(resolutionMinutes),
          minStakeNim: Number(minStake),
          maxStakeNim: Number(maxStake),
        },
      });
    },
    onSuccess: () => {
      toast.success("Market created and live");
      setQuestion("");
      setDescription("");
      onDone();
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Could not create"),
  });

  return (
    <section className="mt-5 rounded-2xl border border-border bg-card p-4">
      <h2 className="font-display text-sm font-bold uppercase tracking-wide">New market</h2>
      <div className="mt-3 space-y-3">
        <Field label="Question">
          <Input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Will BTC close above $120K on Friday?"
          />
        </Field>
        <Field label="Description (optional)">
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
          />
        </Field>
        <Field label="Category">
          <Input value={category} onChange={(e) => setCategory(e.target.value)} />
        </Field>
        <Field label="Outcomes (KEY|Label per line)">
          <Textarea value={outcomes} onChange={(e) => setOutcomes(e.target.value)} rows={3} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Locks in (min)">
            <Input
              value={lockMinutes}
              onChange={(e) => setLockMinutes(e.target.value)}
              inputMode="numeric"
            />
          </Field>
          <Field label="Resolves in (min)">
            <Input
              value={resolutionMinutes}
              onChange={(e) => setResolutionMinutes(e.target.value)}
              inputMode="numeric"
            />
          </Field>
          <Field label="Min stake (NIM)">
            <Input
              value={minStake}
              onChange={(e) => setMinStake(e.target.value)}
              inputMode="decimal"
            />
          </Field>
          <Field label="Max stake (NIM)">
            <Input
              value={maxStake}
              onChange={(e) => setMaxStake(e.target.value)}
              inputMode="decimal"
            />
          </Field>
        </div>
        <Button className="w-full" disabled={create.isPending} onClick={() => create.mutate()}>
          {create.isPending ? "Creating…" : "Create live market"}
        </Button>
      </div>
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      {children}
    </label>
  );
}

function Locked({ body, action }: { body: string; action?: React.ReactNode }) {
  return (
    <div className="mt-8 rounded-2xl border border-border bg-card p-6 text-center">
      <h1 className="font-display text-base font-bold">Admin only</h1>
      <p className="mt-2 text-sm text-muted-foreground">{body}</p>
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
}
