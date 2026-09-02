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
  adminCreatePrediction,
  adminListPredictions,
  adminResolvePrediction,
  adminRetryPayouts,
  adminSettlePrediction,
} from "@/lib/admin.functions";
import { formatNim } from "@/lib/nim";

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

function AdminPage() {
  const wallet = useWallet();
  const queryClient = useQueryClient();
  const list = useQuery({
    queryKey: ["admin-predictions"],
    queryFn: () => adminListPredictions(),
    enabled: wallet.signedIn,
    retry: false,
  });

  const refresh = () => queryClient.invalidateQueries();

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

  if (list.isError) {
    return (
      <AppShell>
        <Locked body="This wallet is not an admin. Add it to the admin allowlist to unlock this console." />
      </AppShell>
    );
  }

  return (
    <AppShell>
      <h1 className="font-display text-xl font-bold">Admin console</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Create markets, resolve outcomes and settle payouts.
      </p>

      <CreateForm onDone={refresh} />

      <section className="mt-6">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="font-display text-sm font-bold uppercase tracking-wide">Markets</h2>
          <Button size="sm" variant="ghost" onClick={() => retry.mutate()} disabled={retry.isPending}>
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

function CreateForm({ onDone }: { onDone: () => void }) {
  const [question, setQuestion] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("CRYPTO");
  const [outcomes, setOutcomes] = useState("YES|Yes\nNO|No");
  const [lockMinutes, setLockMinutes] = useState("120");
  const [resolutionMinutes, setResolutionMinutes] = useState("180");
  const [minStake, setMinStake] = useState("5");
  const [maxStake, setMaxStake] = useState("500");

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
      toast.success("Market created");
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
          <Input value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="Will BTC close above $120K on Friday?" />
        </Field>
        <Field label="Description (optional)">
          <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
        </Field>
        <Field label="Category">
          <Input value={category} onChange={(e) => setCategory(e.target.value)} />
        </Field>
        <Field label="Outcomes (KEY|Label per line)">
          <Textarea value={outcomes} onChange={(e) => setOutcomes(e.target.value)} rows={3} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Locks in (min)">
            <Input value={lockMinutes} onChange={(e) => setLockMinutes(e.target.value)} inputMode="numeric" />
          </Field>
          <Field label="Resolves in (min)">
            <Input value={resolutionMinutes} onChange={(e) => setResolutionMinutes(e.target.value)} inputMode="numeric" />
          </Field>
          <Field label="Min stake (NIM)">
            <Input value={minStake} onChange={(e) => setMinStake(e.target.value)} inputMode="decimal" />
          </Field>
          <Field label="Max stake (NIM)">
            <Input value={maxStake} onChange={(e) => setMaxStake(e.target.value)} inputMode="decimal" />
          </Field>
        </div>
        <Button className="w-full" disabled={create.isPending} onClick={() => create.mutate()}>
          {create.isPending ? "Creating…" : "Create market"}
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
