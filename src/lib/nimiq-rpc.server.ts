/**
 * Server-only Nimiq JSON-RPC client + game configuration.
 *
 * Configuration comes from environment variables and defaults to testnet:
 *   NIMIQ_NETWORK              "test" (default) | "main"
 *   NIMIQ_RPC_URL_TEST         RPC endpoint used when network = test
 *   NIMIQ_RPC_URL_MAIN         RPC endpoint used when network = main
 *   NIMIQ_RPC_AUTH             optional "user:password" for basic auth
 *   NIM_PANIC_TREASURY_ADDRESS NQ address that receives stakes
 *   NIM_PANIC_TREASURY_WALLET_PASSPHRASE  optional; enables automated payouts
 *   NIM_PANIC_ADMIN_ADDRESSES  comma separated NQ addresses allowed to admin
 */
import { normalizeAddress, isValidNimiqAddress } from "./nimiq-crypto.server";

const PLACEHOLDER_TREASURY = "NQ07000000000000000000000000000000000";

/** Public fallback endpoints so on-chain verification works without a private node. */
const DEFAULT_RPC_URL = {
  test: "https://rpc-testnet.nimiqwatch.com",
  main: "https://rpc.nimiqwatch.com",
} as const;

export type NimiqConfig = {
  network: "test" | "main";
  rpcUrl: string | null;
  rpcAuth: string | null;
  treasuryAddress: string | null;
  treasuryConfigured: boolean;
  payoutsEnabled: boolean;
};

export function getNimiqConfig(): NimiqConfig {
  const network = (process.env["NIMIQ_NETWORK"] ?? "test").toLowerCase() === "main" ? "main" : "test";
  const rpcUrl =
    (network === "main" ? process.env["NIMIQ_RPC_URL_MAIN"] : process.env["NIMIQ_RPC_URL_TEST"]) ??
    DEFAULT_RPC_URL[network];
  const rawTreasury = process.env["NIM_PANIC_TREASURY_ADDRESS"] ?? "";
  const treasury = normalizeAddress(rawTreasury);
  const treasuryConfigured =
    treasury.length > 0 && treasury !== PLACEHOLDER_TREASURY && isValidNimiqAddress(treasury);

  return {
    network,
    rpcUrl: rpcUrl && rpcUrl.trim().length > 0 ? rpcUrl.trim() : null,
    rpcAuth: process.env["NIMIQ_RPC_AUTH"] ?? null,
    treasuryAddress: treasuryConfigured ? treasury : null,
    treasuryConfigured,
    payoutsEnabled: Boolean(
      rpcUrl && treasuryConfigured && process.env["NIM_PANIC_TREASURY_WALLET_PASSPHRASE"],
    ),
  };
}

export function getAdminAddresses(): string[] {
  return (process.env["NIM_PANIC_ADMIN_ADDRESSES"] ?? "")
    .split(",")
    .map((value) => normalizeAddress(value))
    .filter((value) => value.length > 0);
}

export class RpcUnavailableError extends Error {}

async function rpc<T>(method: string, params: unknown[] = []): Promise<T> {
  const config = getNimiqConfig();
  if (!config.rpcUrl) throw new RpcUnavailableError("No Nimiq RPC endpoint configured");

  const headers: Record<string, string> = { "content-type": "application/json" };
  if (config.rpcAuth) headers["authorization"] = `Basic ${btoa(config.rpcAuth)}`;

  let response: Response;
  try {
    response = await fetch(config.rpcUrl, {
      method: "POST",
      headers,
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
      signal: AbortSignal.timeout(12_000),
    });
  } catch (error) {
    throw new RpcUnavailableError(
      `Nimiq node unreachable: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  if (!response.ok) throw new RpcUnavailableError(`Nimiq node returned ${response.status}`);
  const payload = (await response.json()) as {
    result?: { data?: unknown } | unknown;
    error?: { message?: string };
  };
  if (payload.error) throw new Error(payload.error.message ?? "Nimiq RPC error");
  const result = payload.result as { data?: unknown } | undefined;
  if (result && typeof result === "object" && "data" in result) return result.data as T;
  return result as T;
}

export type ChainTransaction = {
  hash: string;
  from: string;
  to: string;
  value: number;
  fee: number;
  data?: string | undefined;
  blockNumber?: number | undefined;
  confirmations?: number | undefined;
  timestamp?: number | undefined;
  executionResult?: boolean | undefined;
};

/** Reads a transaction from the chain. Returns null when it is not (yet) known. */
export async function getTransaction(hash: string): Promise<ChainTransaction | null> {
  try {
    const tx = await rpc<Record<string, unknown> | null>("getTransactionByHash", [hash]);
    if (!tx) return null;
    const senderData = (tx["data"] ?? tx["senderData"] ?? tx["recipientData"]) as string | undefined;
    return {
      hash: String(tx["hash"] ?? hash),
      from: String(tx["from"] ?? ""),
      to: String(tx["to"] ?? ""),
      value: Number(tx["value"] ?? 0),
      fee: Number(tx["fee"] ?? 0),
      data: typeof senderData === "string" ? senderData : undefined,
      blockNumber: tx["blockNumber"] == null ? undefined : Number(tx["blockNumber"]),
      confirmations: tx["confirmations"] == null ? undefined : Number(tx["confirmations"]),
      timestamp: tx["timestamp"] == null ? undefined : Number(tx["timestamp"]),
      executionResult: tx["executionResult"] == null ? undefined : Boolean(tx["executionResult"]),
    };
  } catch (error) {
    if (error instanceof RpcUnavailableError) throw error;
    return null;
  }
}

export async function getBalanceLuna(address: string): Promise<number> {
  const account = await rpc<{ balance?: number }>("getAccountByAddress", [address]);
  return Number(account?.balance ?? 0);
}

/** Sends NIM from the treasury wallet held by the configured node. */
export async function sendFromTreasury(params: {
  recipient: string;
  valueLuna: number;
  data?: string;
}): Promise<string> {
  const config = getNimiqConfig();
  const passphrase = process.env["NIM_PANIC_TREASURY_WALLET_PASSPHRASE"];
  if (!config.rpcUrl || !config.treasuryAddress || !passphrase) {
    throw new RpcUnavailableError("Automated payouts are not configured");
  }

  await rpc("unlockAccount", [config.treasuryAddress, passphrase, 60]);

  if (params.data) {
    return rpc<string>("sendBasicTransactionWithData", [
      config.treasuryAddress,
      params.recipient,
      params.data,
      params.valueLuna,
      0,
      "+0",
    ]);
  }
  return rpc<string>("sendBasicTransaction", [
    config.treasuryAddress,
    params.recipient,
    params.valueLuna,
    0,
    "+0",
  ]);
}

/** Text data attached to a stake payment, used to match payment → entry. */
export function memoForEntry(memo: string): string {
  return `NP:${memo}`;
}

/** Hex-decodes RPC transaction data when the node returns it as hex. */
export function decodeTxData(data: string | undefined): string {
  if (!data) return "";
  if (/^[0-9a-f]+$/i.test(data) && data.length % 2 === 0) {
    try {
      const bytes = new Uint8Array(data.length / 2);
      for (let i = 0; i < bytes.length; i++) {
        bytes[i] = Number.parseInt(data.slice(i * 2, i * 2 + 2), 16);
      }
      const decoded = new TextDecoder().decode(bytes);
      if (/^[\x20-\x7e]*$/.test(decoded)) return decoded;
    } catch {
      // fall through to raw
    }
  }
  return data;
}
