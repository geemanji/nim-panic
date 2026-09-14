import { useCallback, useEffect, useRef, useState } from "react";
import type { NimiqProvider } from "@nimiq/mini-app-sdk/provider";
import type HubApi from "@nimiq/hub-api";

/**
 * Which wallet backend is powering the session.
 *
 * - "mini-app"  Nimiq Pay mini-app injected provider (Telegram / Nimiq Pay browser)
 * - "hub"       Nimiq Hub popup  (regular desktop/mobile web browser)
 * - null        Still detecting
 */
export type NimiqBackend = "mini-app" | "hub" | null;

type ProviderState = "loading" | "ready";

/** Hex-encode a Uint8Array (used to convert Hub API binary outputs). */
function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function isErrorResponse(value: unknown): value is { error: { message: string } } {
  return Boolean(value && typeof value === "object" && "error" in (value as object));
}

function unwrap<T>(value: T | { error: { type: string; message: string } }): T {
  if (isErrorResponse(value))
    throw new Error(value.error.message || "Nimiq Pay rejected the request");
  return value as T;
}

/**
 * Unified Nimiq wallet hook.
 *
 * Tries the @nimiq/mini-app-sdk provider first (Nimiq Pay environment).
 * If that isn't available within the timeout, falls back to the Nimiq Hub API
 * which works in any regular browser via a popup to Nimiq Safe.
 *
 * The hook is always in "ready" state — there is no longer an "unavailable"
 * state. When running on the web the backend is "hub".
 */
export function useNimiq() {
  const [state, setState] = useState<ProviderState>("loading");
  const [backend, setBackend] = useState<NimiqBackend>(null);
  const miniAppProviderRef = useRef<NimiqProvider | null>(null);
  const hubApiRef = useRef<HubApi | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      // 1. Try mini-app SDK first.
      try {
        const { init } = await import("@nimiq/mini-app-sdk");
        const provider = await init({ timeout: 3000 });
        if (cancelled) return;
        miniAppProviderRef.current = provider;
        setBackend("mini-app");
        setState("ready");
        return;
      } catch {
        // Not inside Nimiq Pay — fall through to Hub.
      }

      if (cancelled) return;

      // 2. Fall back to Hub API (works in any browser).
      try {
        const { getHubApi } = await import("@/lib/hub");
        const hub = await getHubApi();
        if (cancelled) return;
        hubApiRef.current = hub;
        setBackend("hub");
        setState("ready");
      } catch {
        if (!cancelled) {
          // Hub module failed to load (very unlikely), but we still mark ready
          // so the connect button shows — the error will surface on click.
          setBackend("hub");
          setState("ready");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // ---------------------------------------------------------------------------
  // listAccounts
  // ---------------------------------------------------------------------------
  const listAccounts = useCallback(async (): Promise<string[]> => {
    if (miniAppProviderRef.current) {
      return unwrap(await miniAppProviderRef.current.listAccounts());
    }
    // Hub: chooseAddress opens the Safe popup so the user picks an account.
    // IMPORTANT – this must be called synchronously inside a click handler.
    // The caller (useWallet connect()) is responsible for calling this directly
    // from the button-click event without an await before it.
    const { getHubApi } = await import("@/lib/hub");
    const { APP_NAME } = await import("@/lib/hub");
    const hub = await getHubApi();
    const result = await hub.chooseAddress({ appName: APP_NAME });
    return [result.address];
  }, []);

  // ---------------------------------------------------------------------------
  // signMessage
  // ---------------------------------------------------------------------------
  const signMessage = useCallback(
    async (message: string): Promise<{ publicKey: string; signature: string }> => {
      if (miniAppProviderRef.current) {
        return unwrap(await miniAppProviderRef.current.sign(message));
      }
      // Hub: signMessage popup.
      const { getHubApi, APP_NAME } = await import("@/lib/hub");
      const hub = await getHubApi();
      const result = await hub.signMessage({ appName: APP_NAME, message });
      return {
        publicKey: bytesToHex(result.signerPublicKey),
        signature: bytesToHex(result.signature),
      };
    },
    [],
  );

  // ---------------------------------------------------------------------------
  // sendStake  (mini-app only; Hub uses checkout instead — handled in useWallet)
  // ---------------------------------------------------------------------------
  const sendStake = useCallback(
    async (params: { recipient: string; valueLuna: number; memo: string }): Promise<string> => {
      if (miniAppProviderRef.current) {
        const result = unwrap(
          await miniAppProviderRef.current.sendBasicTransactionWithData({
            recipient: params.recipient,
            value: params.valueLuna,
            data: params.memo,
          }),
        );
        return String(result);
      }
      // Hub: use checkout for a NIM payment with extraData memo.
      const { getHubApi, APP_NAME } = await import("@/lib/hub");
      const hub = await getHubApi();
      const result = await hub.checkout({
        appName: APP_NAME,
        recipient: params.recipient,
        value: params.valueLuna,
        extraData: params.memo,
      });
      // checkout returns SignedTransaction
      const tx = result as { hash: string };
      return tx.hash;
    },
    [],
  );

  return {
    state,
    backend,
    /** Always true — web users connect via Hub popup instead of showing an error. */
    available: state === "ready",
    listAccounts,
    signMessage,
    sendStake,
  };
}
