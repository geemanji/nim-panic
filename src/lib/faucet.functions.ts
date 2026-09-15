import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const FAUCET_URL = "https://faucet.pos.nimiq-testnet.com/tapit";

type FaucetResponse = {
  success: boolean;
  msg: string;
  expectedBlocks?: number;
};

/**
 * Requests testnet NIM from the public Nimiq PoS testnet faucet.
 *
 * - Only callable when the app is on testnet (always true here, but checked defensively).
 * - Proxied server-side to avoid CORS issues and so the user's wallet address is
 *   taken from their verified session, not from untrusted client input.
 * - The faucet is rate-limited per IP; the server IP will be the one making the request.
 *   This is intentional for a testnet helper — not suitable for production use.
 */
export const requestFaucetDrop = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { getNimiqConfig } = await import("./nimiq-rpc.server");

    // Only available on testnet
    const config = getNimiqConfig();
    if (config.network !== "test") {
      throw new Error("Faucet is only available on testnet.");
    }

    // Get the authenticated user's wallet address from their profile
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("wallet_address")
      .eq("id", context.userId)
      .maybeSingle();

    if (!profile?.wallet_address) {
      throw new Error("No wallet address found for your account.");
    }

    let response: Response;
    try {
      response = await fetch(FAUCET_URL, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ address: profile.wallet_address }),
        signal: AbortSignal.timeout(15_000),
      });
    } catch (error) {
      throw new Error(
        `Faucet unreachable: ${error instanceof Error ? error.message : "network error"}`,
      );
    }

    if (!response.ok) {
      // The faucet returns 4xx/5xx with a plain-text or JSON error body
      const text = await response.text().catch(() => response.statusText);
      throw new Error(`Faucet declined the request: ${text}`);
    }

    const result = (await response.json()) as FaucetResponse;

    if (!result.success) {
      throw new Error(result.msg || "Faucet request was not successful.");
    }

    return {
      ok: true,
      message: result.msg,
      expectedBlocks: result.expectedBlocks ?? 1,
    };
  });
