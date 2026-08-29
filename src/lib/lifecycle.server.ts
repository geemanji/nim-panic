/**
 * The backend is the only authority for prediction state. This promotes
 * OPEN → LOCKED once the lock time has passed (server clock only) and expires
 * entries that never got a verified payment.
 */
type AdminClient = Awaited<
  typeof import("@/integrations/supabase/client.server")
>["supabaseAdmin"];

export async function syncPredictionStates(supabaseAdmin: AdminClient): Promise<void> {
  const now = new Date().toISOString();

  const { data: locked } = await supabaseAdmin
    .from("predictions")
    .update({ status: "LOCKED" })
    .eq("status", "OPEN")
    .lte("lock_time", now)
    .select("id");

  const lockedIds = (locked ?? []).map((row) => row.id);
  if (lockedIds.length > 0) {
    await supabaseAdmin
      .from("prediction_entries")
      .update({ status: "LOCKED" })
      .in("prediction_id", lockedIds)
      .eq("status", "CONFIRMED");

    await supabaseAdmin
      .from("prediction_entries")
      .update({ status: "EXPIRED" })
      .in("prediction_id", lockedIds)
      .eq("status", "PENDING_PAYMENT");
  }
}
