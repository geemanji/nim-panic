/**
 * Derives the deterministic, server-only credential used to hold a wallet
 * player's session. The value never leaves the server and is not recoverable
 * without the service role key.
 */
export async function deriveWalletPassword(address: string): Promise<string> {
  const secret = process.env["SUPABASE_SERVICE_ROLE_KEY"];
  if (!secret) throw new Error("Server is not configured for wallet sign-in");

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(`nim-panic:${address}`),
  );
  return `np_${Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")}`;
}
