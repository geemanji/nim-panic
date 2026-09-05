import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const outcomeSchema = z.object({ key: z.string().min(1).max(24), label: z.string().min(1).max(48) });

async function assertAdmin(userId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { getAdminAddresses } = await import("./nimiq-rpc.server");

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("wallet_address")
    .eq("id", userId)
    .maybeSingle();
  const { data: role } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();

  const allowlisted = profile ? getAdminAddresses().includes(profile.wallet_address) : false;
  if (!role && !allowlisted) throw new Error("Admins only.");
  return supabaseAdmin;
}

export const adminListPredictions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const supabaseAdmin = await assertAdmin(context.userId);
    const { data } = await supabaseAdmin
      .from("predictions")
      .select(
        "id, question, category, status, outcomes, lock_time, resolution_time, winning_outcome, is_demo, participants_count, total_staked_nim",
      )
      .order("created_at", { ascending: false })
      .limit(100);
    return data ?? [];
  });

export const adminCreatePrediction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        question: z.string().min(8).max(200),
        description: z.string().max(500).optional(),
        category: z.string().min(2).max(24),
        outcomes: z.array(outcomeSchema).min(2).max(4),
        lockMinutes: z.number().int().min(1).max(20160),
        resolutionMinutes: z.number().int().min(2).max(40320),
        minStakeNim: z.number().positive().max(10000),
        maxStakeNim: z.number().positive().max(100000),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const supabaseAdmin = await assertAdmin(context.userId);
    const now = Date.now();
    const { data: created, error } = await supabaseAdmin
      .from("predictions")
      .insert({
        question: data.question,
        description: data.description ?? null,
        category: data.category.toUpperCase(),
        outcomes: data.outcomes,
        lock_time: new Date(now + data.lockMinutes * 60_000).toISOString(),
        resolution_time: new Date(now + data.resolutionMinutes * 60_000).toISOString(),
        min_stake_nim: data.minStakeNim,
        max_stake_nim: data.maxStakeNim,
        status: "OPEN",
        outcome_totals: {},
      })
      .select("id")
      .maybeSingle();
    if (error || !created) throw new Error("Could not create the prediction.");
    return created;
  });

export const adminResolvePrediction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ predictionId: z.string().uuid(), winningOutcome: z.string().min(1) }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const supabaseAdmin = await assertAdmin(context.userId);
    const { data: prediction } = await supabaseAdmin
      .from("predictions")
      .select("id, status, outcomes")
      .eq("id", data.predictionId)
      .maybeSingle();
    if (!prediction) throw new Error("Prediction not found.");
    if (prediction.status === "SETTLED") throw new Error("Already settled.");

    const outcomes = (prediction.outcomes as { key: string }[]) ?? [];
    if (!outcomes.some((o) => o.key === data.winningOutcome)) throw new Error("Unknown outcome.");

    await supabaseAdmin
      .from("predictions")
      .update({ status: "RESOLVED", winning_outcome: data.winningOutcome })
      .eq("id", data.predictionId);

    await supabaseAdmin
      .from("prediction_entries")
      .update({ status: "LOCKED" })
      .eq("prediction_id", data.predictionId)
      .eq("status", "CONFIRMED");

    return { ok: true };
  });

/** Computes payouts, writes settlements, pays winners via the settlement driver. */
export const adminSettlePrediction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ predictionId: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const supabaseAdmin = await assertAdmin(context.userId);
    const { payoutMultiplier } = await import("./nim");
    const { payout, refreshPlayerStats, settlementDriver } = await import("./settlement.server");

    const { data: prediction } = await supabaseAdmin
      .from("predictions")
      .select("id, status, winning_outcome, outcomes, outcome_totals, question")
      .eq("id", data.predictionId)
      .maybeSingle();
    if (!prediction) throw new Error("Prediction not found.");
    if (prediction.status !== "RESOLVED") throw new Error("Resolve the prediction first.");
    const winning = prediction.winning_outcome;
    if (!winning) throw new Error("No winning outcome recorded.");

    const { data: entries } = await supabaseAdmin
      .from("prediction_entries")
      .select("id, user_id, outcome, stake_nim, status")
      .eq("prediction_id", data.predictionId)
      .in("status", ["CONFIRMED", "LOCKED"]);

    const multiplier = payoutMultiplier(
      (prediction.outcome_totals as Record<string, number>) ?? {},
      winning,
      (prediction.outcomes as { key: string; label: string }[]) ?? [],
    );

    const touchedUsers = new Set<string>();
    let paid = 0;
    let pending = 0;

    for (const entry of entries ?? []) {
      touchedUsers.add(entry.user_id);
      const won = entry.outcome === winning;

      const { data: alreadySettled } = await supabaseAdmin
        .from("settlements")
        .select("id")
        .eq("prediction_entry_id", entry.id)
        .maybeSingle();

      await supabaseAdmin
        .from("prediction_entries")
        .update({ status: won ? "WON" : "LOST", result: won ? "WON" : "LOST" })
        .eq("id", entry.id);

      if (alreadySettled) continue;

      if (!won) {
        await supabaseAdmin.from("settlements").insert({
          prediction_entry_id: entry.id,
          payout_nim: 0,
          status: "NO_PAYOUT",
        });
        continue;
      }

      const amountNim = Math.round(Number(entry.stake_nim) * multiplier * 1e5) / 1e5;
      const { data: winnerProfile } = await supabaseAdmin
        .from("profiles")
        .select("wallet_address")
        .eq("id", entry.user_id)
        .maybeSingle();

      const result = winnerProfile
        ? await payout({
            recipient: winnerProfile.wallet_address,
            amountNim,
            reference: entry.id.slice(0, 8),
          })
        : ({ status: "FAILED", reason: "No wallet on file" } as const);

      await supabaseAdmin.from("settlements").insert({
        prediction_entry_id: entry.id,
        payout_nim: amountNim,
        status: result.status,
        transaction_hash: result.status === "SENT" ? result.transactionHash : null,
        error_message: result.status === "SENT" ? null : result.reason,
        paid_at: result.status === "SENT" ? new Date().toISOString() : null,
      });

      if (result.status === "SENT") paid += 1;
      else pending += 1;
    }

    await supabaseAdmin
      .from("predictions")
      .update({ status: "SETTLED" })
      .eq("id", data.predictionId);

    for (const userId of touchedUsers) await refreshPlayerStats(supabaseAdmin, userId);

    return { paid, pending, multiplier, driver: settlementDriver() };
  });

/** Retries payouts that are still pending (e.g. after payouts get configured). */
export const adminRetryPayouts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const supabaseAdmin = await assertAdmin(context.userId);
    const { payout, refreshPlayerStats } = await import("./settlement.server");

    const { data: rows } = await supabaseAdmin
      .from("settlements")
      .select("id, payout_nim, prediction_entry_id, prediction_entries!inner(user_id)")
      .in("status", ["PENDING_PAYOUT", "FAILED"])
      .limit(50);

    let sent = 0;
    for (const row of rows ?? []) {
      const userId = (row.prediction_entries as unknown as { user_id: string }).user_id;
      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("wallet_address")
        .eq("id", userId)
        .maybeSingle();
      if (!profile) continue;

      const result = await payout({
        recipient: profile.wallet_address,
        amountNim: Number(row.payout_nim),
        reference: row.prediction_entry_id.slice(0, 8),
      });
      await supabaseAdmin
        .from("settlements")
        .update({
          status: result.status,
          transaction_hash: result.status === "SENT" ? result.transactionHash : null,
          error_message: result.status === "SENT" ? null : result.reason,
          paid_at: result.status === "SENT" ? new Date().toISOString() : null,
        })
        .eq("id", row.id);
      if (result.status === "SENT") {
        sent += 1;
        await refreshPlayerStats(supabaseAdmin, userId);
      }
    }
    return { sent };
  });

/** Tells the console whether this wallet is an admin, and whether bootstrap is still open. */
export const adminAccess = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { getAdminAddresses } = await import("./nimiq-rpc.server");

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("wallet_address")
      .eq("id", context.userId)
      .maybeSingle();
    const { data: role } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId)
      .eq("role", "admin")
      .maybeSingle();
    const { count } = await supabaseAdmin
      .from("user_roles")
      .select("user_id", { count: "exact", head: true })
      .eq("role", "admin");

    const allowlist = getAdminAddresses();
    const allowlisted = profile ? allowlist.includes(profile.wallet_address) : false;

    return {
      isAdmin: Boolean(role) || allowlisted,
      canBootstrap: (count ?? 0) === 0 && allowlist.length === 0,
      wallet: profile?.wallet_address ?? null,
    };
  });

/** First operator claims the console while no admin exists and no allowlist is set. */
export const adminClaim = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { getAdminAddresses } = await import("./nimiq-rpc.server");
    if (getAdminAddresses().length > 0) throw new Error("Admin allowlist is configured.");

    const { count } = await supabaseAdmin
      .from("user_roles")
      .select("user_id", { count: "exact", head: true })
      .eq("role", "admin");
    if ((count ?? 0) > 0) throw new Error("An admin already exists.");

    const { error } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: context.userId, role: "admin" });
    if (error) throw new Error("Could not claim admin access.");
    return { ok: true };
  });

/** Closes entries immediately so the market can be resolved. */
export const adminLockPrediction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ predictionId: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const supabaseAdmin = await assertAdmin(context.userId);
    const now = new Date().toISOString();
    const { error } = await supabaseAdmin
      .from("predictions")
      .update({ status: "LOCKED", lock_time: now })
      .eq("id", data.predictionId)
      .in("status", ["OPEN", "LOCKED"]);
    if (error) throw new Error("Could not lock the market.");
    await supabaseAdmin
      .from("prediction_entries")
      .update({ status: "LOCKED" })
      .eq("prediction_id", data.predictionId)
      .eq("status", "CONFIRMED");
    return { ok: true };
  });

/** Puts a market live now: OPEN with fresh lock/resolution windows. */
export const adminOpenMarket = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        predictionId: z.string().uuid(),
        lockMinutes: z.number().int().min(1).max(20160),
        resolutionMinutes: z.number().int().min(2).max(40320),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const supabaseAdmin = await assertAdmin(context.userId);
    if (data.resolutionMinutes <= data.lockMinutes)
      throw new Error("Resolution must come after the lock time.");
    const now = Date.now();
    const { error } = await supabaseAdmin
      .from("predictions")
      .update({
        status: "OPEN",
        winning_outcome: null,
        lock_time: new Date(now + data.lockMinutes * 60_000).toISOString(),
        resolution_time: new Date(now + data.resolutionMinutes * 60_000).toISOString(),
      })
      .eq("id", data.predictionId)
      .neq("status", "SETTLED");
    if (error) throw new Error("Could not open the market.");
    return { ok: true };
  });
