import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const startSchema = z.object({ address: z.string().min(30).max(60) });
const completeSchema = z.object({
  address: z.string().min(30).max(60),
  publicKey: z.string().regex(/^[0-9a-fA-F]{64}$/),
  signature: z.string().regex(/^[0-9a-fA-F]{128}$/),
});

/** Step 1 of wallet auth: the backend issues a single-use challenge. */
export const startWalletAuth = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => startSchema.parse(data))
  .handler(async ({ data }) => {
    const { normalizeAddress, isValidNimiqAddress } = await import("./nimiq-crypto.server");
    const address = normalizeAddress(data.address);
    if (!isValidNimiqAddress(address)) throw new Error("That does not look like a Nimiq address.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const nonce = crypto.randomUUID().replace(/-/g, "");
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

    const { error } = await supabaseAdmin
      .from("auth_nonces")
      .insert({ wallet_address: address, nonce, expires_at: expiresAt });
    if (error) throw new Error("Could not start sign-in. Please try again.");

    return {
      nonce,
      message: `NIM PANIC sign-in\nAddress: ${address}\nNonce: ${nonce}`,
    };
  });

/** Step 2: verify the signature server-side, then issue a session. */
export const completeWalletAuth = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => completeSchema.parse(data))
  .handler(async ({ data }) => {
    const { normalizeAddress, addressFromPublicKey, verifyNimiqSignature } = await import(
      "./nimiq-crypto.server"
    );
    const address = normalizeAddress(data.address);
    const derived = normalizeAddress(addressFromPublicKey(data.publicKey));
    if (derived !== address) {
      throw new Error("The signature does not belong to that address.");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: nonceRows } = await supabaseAdmin
      .from("auth_nonces")
      .select("id, nonce, expires_at, used_at")
      .eq("wallet_address", address)
      .is("used_at", null)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(10);

    let matched: { id: string; nonce: string } | null = null;
    for (const row of nonceRows ?? []) {
      const message = `NIM PANIC sign-in\nAddress: ${address}\nNonce: ${row.nonce}`;
      if (
        await verifyNimiqSignature({
          message,
          publicKey: data.publicKey,
          signature: data.signature,
        })
      ) {
        matched = { id: row.id, nonce: row.nonce };
        break;
      }
    }
    if (!matched) throw new Error("Signature could not be verified. Please try signing in again.");

    const { data: consumed } = await supabaseAdmin
      .from("auth_nonces")
      .update({ used_at: new Date().toISOString() })
      .eq("id", matched.id)
      .is("used_at", null)
      .select("id");
    if (!consumed || consumed.length === 0) throw new Error("That challenge was already used.");

    const { deriveWalletPassword } = await import("./wallet-account.server");
    const email = `${address.toLowerCase()}@wallet.nimpanic.app`;
    const password = await deriveWalletPassword(address);

    const { data: existingProfile } = await supabaseAdmin
      .from("profiles")
      .select("id, username")
      .eq("wallet_address", address)
      .maybeSingle();

    if (!existingProfile) {
      const created = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { wallet_address: address },
      });
      if (created.error && !/already/i.test(created.error.message)) {
        throw new Error("Could not create your player account.");
      }
      const userId = created.data?.user?.id;
      if (userId) {
        const username = `@${address.slice(4, 10).toLowerCase()}`;
        await supabaseAdmin
          .from("profiles")
          .insert({ id: userId, wallet_address: address, username });
        await supabaseAdmin.from("user_roles").insert({ user_id: userId, role: "user" });
      }
    }

    const { createPublishableClient } = await import("./supabase-public.server");
    const publicClient = createPublishableClient();
    const signIn = await publicClient.auth.signInWithPassword({ email, password });
    if (signIn.error || !signIn.data.session) {
      throw new Error("Could not sign you in. Please try again.");
    }

    return {
      address,
      accessToken: signIn.data.session.access_token,
      refreshToken: signIn.data.session.refresh_token,
    };
  });
