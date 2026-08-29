/**
 * Settlement is isolated behind one driver so the payout mechanism can be
 * upgraded without touching game logic.
 *
 * - "rpc-wallet": the configured Nimiq node signs and sends the payout from the
 *   treasury wallet. No key material ever lives in app code or the browser.
 * - "manual": no payout-capable node is configured, so payouts are recorded as
 *   PENDING_PAYOUT. They are never reported to the user as paid.
 */
import { getNimiqConfig, sendFromTreasury } from "./nimiq-rpc.server";
import { nimToLuna } from "./nim";
import { currentWeekPeriod } from "./period";

export type PayoutResult =
  | { status: "SENT"; transactionHash: string }
  | { status: "PENDING_PAYOUT"; reason: string }
  | { status: "FAILED"; reason: string };

export function settlementDriver(): "rpc-wallet" | "manual" {
  return getNimiqConfig().payoutsEnabled ? "rpc-wallet" : "manual";
}

export async function payout(params: {
  recipient: string;
  amountNim: number;
  reference: string;
}): Promise<PayoutResult> {
  if (settlementDriver() === "manual") {
    return { status: "PENDING_PAYOUT", reason: "Automated payouts are not configured yet" };
  }
  try {
    const transactionHash = await sendFromTreasury({
      recipient: params.recipient,
      valueLuna: nimToLuna(params.amountNim),
      data: `NP-WIN:${params.reference}`.slice(0, 64),
    });
    return { status: "SENT", transactionHash };
  } catch (error) {
    return { status: "FAILED", reason: error instanceof Error ? error.message : String(error) };
  }
}

type AdminClient = Awaited<
  typeof import("@/integrations/supabase/client.server")
>["supabaseAdmin"];

/** Recomputes profile aggregates + the weekly leaderboard row for one player. */
export async function refreshPlayerStats(supabaseAdmin: AdminClient, userId: string): Promise<void> {
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("id, username")
    .eq("id", userId)
    .maybeSingle();
  if (!profile) return;

  const { data: entries } = await supabaseAdmin
    .from("prediction_entries")
    .select("status, stake_nim, created_at")
    .eq("user_id", userId)
    .in("status", ["CONFIRMED", "LOCKED", "WON", "LOST"])
    .order("created_at", { ascending: true });

  const rows = entries ?? [];
  const decided = rows.filter((row) => row.status === "WON" || row.status === "LOST");
  const wins = decided.filter((row) => row.status === "WON").length;
  const accuracy = decided.length > 0 ? (wins / decided.length) * 100 : 0;

  let streak = 0;
  for (let i = decided.length - 1; i >= 0; i--) {
    if (decided[i]!.status === "WON") streak += 1;
    else break;
  }

  const { data: settlements } = await supabaseAdmin
    .from("settlements")
    .select("payout_nim, prediction_entry_id, prediction_entries!inner(user_id)")
    .eq("prediction_entries.user_id", userId);
  const nimWon = (settlements ?? []).reduce((sum, row) => sum + Number(row.payout_nim ?? 0), 0);
  const nimStaked = rows.reduce((sum, row) => sum + Number(row.stake_nim ?? 0), 0);

  const { data: current } = await supabaseAdmin
    .from("profiles")
    .select("best_streak")
    .eq("id", userId)
    .maybeSingle();

  await supabaseAdmin
    .from("profiles")
    .update({
      predictions_count: rows.length,
      wins_count: wins,
      streak,
      best_streak: Math.max(streak, Number(current?.best_streak ?? 0)),
      nim_won: nimWon,
      nim_staked: nimStaked,
    })
    .eq("id", userId);

  // Simple MVP score: 10 per correct pick, 3 per streak step, 1 per participation.
  const points = wins * 10 + streak * 3 + rows.length;
  await supabaseAdmin.from("leaderboard_stats").upsert(
    {
      user_id: userId,
      period: currentWeekPeriod(),
      username: profile.username,
      points,
      accuracy: Math.round(accuracy * 100) / 100,
      wins,
      predictions: rows.length,
      streak,
      nim_won: nimWon,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,period" },
  );
}
