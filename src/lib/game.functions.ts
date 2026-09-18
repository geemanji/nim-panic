import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { currentWeekPeriod } from "./period";
import { type FeedPrediction, type Outcome } from "./nim";

const PUBLIC_COLUMNS =
  "id, question, description, category, outcomes, lock_time, resolution_time, status, winning_outcome, is_demo, participants_count, total_staked_nim, outcome_totals, min_stake_nim, max_stake_nim";

function normalize(row: Record<string, unknown>): FeedPrediction {
  return {
    id: String(row["id"]),
    question: String(row["question"]),
    description: (row["description"] as string | null) ?? null,
    category: String(row["category"]),
    outcomes: (row["outcomes"] as Outcome[]) ?? [],
    lock_time: String(row["lock_time"]),
    resolution_time: String(row["resolution_time"]),
    status: row["status"] as FeedPrediction["status"],
    winning_outcome: (row["winning_outcome"] as string | null) ?? null,
    is_demo: Boolean(row["is_demo"]),
    participants_count: Number(row["participants_count"] ?? 0),
    total_staked_nim: Number(row["total_staked_nim"] ?? 0),
    outcome_totals: (row["outcome_totals"] as Record<string, number>) ?? {},
    min_stake_nim: Number(row["min_stake_nim"] ?? 1),
    max_stake_nim: Number(row["max_stake_nim"] ?? 500),
  };
}

/** Public game configuration — no secrets, only capability flags. */
export const getGameConfig = createServerFn({ method: "GET" }).handler(async () => {
  const { getNimiqConfig } = await import("./nimiq-rpc.server");
  const { settlementDriver } = await import("./settlement.server");
  const config = getNimiqConfig();
  return {
    network: config.network,
    stakingEnabled: config.treasuryConfigured,
    chainReadsEnabled: Boolean(config.rpcUrl),
    settlementDriver: settlementDriver(),
  };
});

export const getFeed = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { syncPredictionStates } = await import("./lifecycle.server");
  await syncPredictionStates(supabaseAdmin);

  const { data, error } = await supabaseAdmin
    .from("predictions")
    .select(PUBLIC_COLUMNS)
    .neq("status", "DRAFT")
    .order("lock_time", { ascending: true })
    .limit(50);
  if (error) throw new Error("Could not load predictions");
  return (data ?? []).map((row) => normalize(row as Record<string, unknown>));
});

/** Fetch predictions filtered by category key (e.g. "CRYPTO"). */
export const getFeedByCategory = createServerFn({ method: "GET" })
  .validator((data: unknown) => z.object({ category: z.string().min(1).max(32) }).parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { syncPredictionStates } = await import("./lifecycle.server");
    await syncPredictionStates(supabaseAdmin);

    const { data: rows, error } = await supabaseAdmin
      .from("predictions")
      .select(PUBLIC_COLUMNS)
      .neq("status", "DRAFT")
      .eq("category", data.category.toUpperCase())
      .order("lock_time", { ascending: true })
      .limit(50);
    if (error) throw new Error("Could not load predictions");
    return (rows ?? []).map((row) => normalize(row as Record<string, unknown>));
  });

/** Returns live (OPEN) prediction counts per category key. */
export const getCategoryCounts = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("predictions")
    .select("category")
    .eq("status", "OPEN")
    .gte("lock_time", new Date().toISOString());

  const counts: Record<string, number> = {};
  for (const row of data ?? []) {
    const cat = String(row.category);
    counts[cat] = (counts[cat] ?? 0) + 1;
  }
  return counts;
});

export const getPrediction = createServerFn({ method: "GET" })
  .validator((data: unknown) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { syncPredictionStates } = await import("./lifecycle.server");
    await syncPredictionStates(supabaseAdmin);

    const { data: row } = await supabaseAdmin
      .from("predictions")
      .select(PUBLIC_COLUMNS)
      .eq("id", data.id)
      .neq("status", "DRAFT")
      .maybeSingle();
    if (!row) return null;
    return normalize(row as Record<string, unknown>);
  });

export const getLeaderboard = createServerFn({ method: "GET" })
  .validator((data: unknown) =>
    z.object({ period: z.enum(["weekly", "alltime"]).optional() }).parse(data ?? {}),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const periodType = data?.period ?? "weekly";
    const period = periodType === "alltime" ? "alltime" : currentWeekPeriod();
    const { data: rows } = await supabaseAdmin
      .from("leaderboard_stats")
      .select("user_id, username, points, accuracy, wins, predictions, streak, nim_won")
      .eq("period", period)
      .order("points", { ascending: false })
      .order("wins", { ascending: false })
      .limit(50);
    return { period, periodType, rows: rows ?? [] };
  });

export const getMyProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select(
        "id, wallet_address, username, streak, best_streak, predictions_count, wins_count, nim_won, nim_staked, xp, panic_score, created_at",
      )
      .eq("id", context.userId)
      .maybeSingle();
    if (!profile) return null;

    const { data: role } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId)
      .eq("role", "admin")
      .maybeSingle();

    const accuracy =
      profile.predictions_count > 0
        ? Math.round((profile.wins_count / profile.predictions_count) * 100)
        : 0;

    return {
      ...profile,
      accuracy,
      isAdmin: Boolean(role),
    };
  });

export const getMyPicks = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { syncPredictionStates } = await import("./lifecycle.server");
    await syncPredictionStates(supabaseAdmin);

    const { data } = await supabaseAdmin
      .from("prediction_entries")
      .select(
        "id, prediction_id, outcome, stake_nim, status, transaction_hash, created_at, predictions(question, category, status, winning_outcome, lock_time, outcomes), settlements(payout_nim, status, transaction_hash)",
      )
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(100);
    return data ?? [];
  });

export const getWalletBalance = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("wallet_address")
      .eq("id", context.userId)
      .maybeSingle();
    if (!profile) return { nim: null, reason: "No wallet on file" };

    const { getBalanceLuna, getNimiqConfig } = await import("./nimiq-rpc.server");
    const { lunaToNim } = await import("./nim");
    if (!getNimiqConfig().rpcUrl) return { nim: null, reason: "Chain reads not configured" };
    try {
      const luna = await getBalanceLuna(profile.wallet_address);
      return { nim: lunaToNim(luna), reason: null };
    } catch (error) {
      return {
        nim: null,
        reason: error instanceof Error ? error.message : "Balance unavailable",
      };
    }
  });

/** Creates a PENDING_PAYMENT entry and returns the message the wallet must sign. */
export const createEntry = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) =>
    z
      .object({
        predictionId: z.string().uuid(),
        outcome: z.string().min(1).max(32),
        stakeNim: z.number().positive().max(100000),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: prediction } = await supabaseAdmin
      .from("predictions")
      .select("id, status, lock_time, outcomes, min_stake_nim, max_stake_nim")
      .eq("id", data.predictionId)
      .maybeSingle();
    if (!prediction) throw new Error("That prediction no longer exists.");
    if (prediction.status !== "OPEN") throw new Error("This prediction is already locked.");
    if (new Date(prediction.lock_time).getTime() <= Date.now()) {
      throw new Error("Too late — this prediction just locked.");
    }

    const outcomes = (prediction.outcomes as Outcome[]) ?? [];
    if (!outcomes.some((o) => o.key === data.outcome)) throw new Error("Unknown outcome.");
    if (
      data.stakeNim < Number(prediction.min_stake_nim) ||
      data.stakeNim > Number(prediction.max_stake_nim)
    ) {
      throw new Error(
        `Stake must be between ${prediction.min_stake_nim} and ${prediction.max_stake_nim} NIM.`,
      );
    }

    const { data: existing } = await supabaseAdmin
      .from("prediction_entries")
      .select("id, status, outcome, stake_nim, memo")
      .eq("prediction_id", data.predictionId)
      .eq("user_id", context.userId)
      .not("status", "in", "(EXPIRED,VOID)")
      .maybeSingle();

    if (existing && existing.status !== "PENDING_PAYMENT") {
      throw new Error("You already have a locked prediction here.");
    }

    const memo = crypto.randomUUID().replace(/-/g, "").slice(0, 10).toUpperCase();
    let entryId: string;

    if (existing) {
      const { data: updated, error } = await supabaseAdmin
        .from("prediction_entries")
        .update({ outcome: data.outcome, stake_nim: data.stakeNim, memo })
        .eq("id", existing.id)
        .eq("status", "PENDING_PAYMENT")
        .select("id")
        .maybeSingle();
      if (error || !updated) throw new Error("Could not update your prediction.");
      entryId = updated.id;
    } else {
      const { data: inserted, error } = await supabaseAdmin
        .from("prediction_entries")
        .insert({
          prediction_id: data.predictionId,
          user_id: context.userId,
          outcome: data.outcome,
          stake_nim: data.stakeNim,
          memo,
        })
        .select("id")
        .maybeSingle();
      if (error || !inserted) throw new Error("Could not create your prediction.");
      entryId = inserted.id;
    }

    // Build a deterministic message the wallet signs to authorise this entry.
    // Committing to entryId + memo + stakeNim prevents replay across entries.
    const messageToSign = `NIM PANIC prediction\nEntry: ${entryId}\nOutcome: ${data.outcome}\nStake: ${data.stakeNim} NIM\nNonce: ${memo}`;

    return {
      entryId,
      messageToSign,
      stakeNim: data.stakeNim,
      outcome: data.outcome,
    };
  });

/** Verifies the wallet signature and confirms the prediction entry. */
export const confirmEntry = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) =>
    z
      .object({
        entryId: z.string().uuid(),
        publicKey: z.string().regex(/^[0-9a-fA-F]{64}$/),
        signature: z.string().regex(/^[0-9a-fA-F]{128}$/),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: entry } = await supabaseAdmin
      .from("prediction_entries")
      .select("id, prediction_id, user_id, outcome, stake_nim, memo, status")
      .eq("id", data.entryId)
      .eq("user_id", context.userId)
      .maybeSingle();
    if (!entry) throw new Error("Prediction entry not found.");
    if (entry.status !== "PENDING_PAYMENT") {
      return { status: entry.status as string, verified: entry.status !== "PENDING_PAYMENT" };
    }

    // Verify the public key matches the user's registered wallet address.
    const { addressFromPublicKey, verifyNimiqSignature, normalizeAddress } =
      await import("./nimiq-crypto.server");
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("wallet_address")
      .eq("id", context.userId)
      .maybeSingle();

    if (profile) {
      const derivedAddress = normalizeAddress(addressFromPublicKey(data.publicKey));
      const profileAddress = normalizeAddress(profile.wallet_address);
      if (derivedAddress !== profileAddress) {
        throw new Error("Signature public key does not match your registered wallet.");
      }
    }

    // Reconstruct the exact message that was signed.
    const messageToSign = `NIM PANIC prediction\nEntry: ${entry.id}\nOutcome: ${entry.outcome}\nStake: ${entry.stake_nim} NIM\nNonce: ${entry.memo}`;

    const valid = await verifyNimiqSignature({
      message: messageToSign,
      publicKey: data.publicKey,
      signature: data.signature,
    });
    if (!valid) throw new Error("Signature is invalid. Please try again.");

    const { data: prediction } = await supabaseAdmin
      .from("predictions")
      .select("participants_count, total_staked_nim, outcome_totals, status, lock_time")
      .eq("id", entry.prediction_id)
      .maybeSingle();

    // Final lock-time guard — race condition protection.
    if (prediction && new Date(prediction.lock_time).getTime() <= Date.now()) {
      throw new Error("Too late — this prediction locked while you were signing.");
    }

    const { error: updateError } = await supabaseAdmin
      .from("prediction_entries")
      .update({
        // Re-use transaction_hash column to store the signature for audit.
        transaction_hash: data.signature,
        status: "CONFIRMED",
        confirmed_at: new Date().toISOString(),
      })
      .eq("id", entry.id)
      .eq("status", "PENDING_PAYMENT");
    if (updateError) throw new Error("Could not record your confirmed prediction.");

    if (prediction) {
      const totals = { ...((prediction.outcome_totals as Record<string, number>) ?? {}) };
      totals[entry.outcome] = Number(totals[entry.outcome] ?? 0) + Number(entry.stake_nim);
      await supabaseAdmin
        .from("predictions")
        .update({
          participants_count: Number(prediction.participants_count ?? 0) + 1,
          total_staked_nim: Number(prediction.total_staked_nim ?? 0) + Number(entry.stake_nim),
          outcome_totals: totals,
        })
        .eq("id", entry.prediction_id);
    }

    // Refresh the player's profile stats (nim_staked, predictions_count, etc.)
    // so they are current immediately after confirming, without waiting for settlement.
    const { refreshPlayerStats } = await import("./settlement.server");
    await refreshPlayerStats(supabaseAdmin, context.userId);

    return { status: "CONFIRMED", verified: true };
  });
