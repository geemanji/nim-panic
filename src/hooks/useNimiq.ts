import { useCallback, useEffect, useRef, useState } from "react";
import type { NimiqProvider } from "@nimiq/mini-app-sdk/provider";

type ProviderState = "loading" | "ready" | "unavailable";

function isErrorResponse(value: unknown): value is { error: { message: string } } {
  return Boolean(value && typeof value === "object" && "error" in (value as object));
}

function unwrap<T>(value: T | { error: { type: string; message: string } }): T {
  if (isErrorResponse(value)) throw new Error(value.error.message || "Nimiq Pay rejected the request");
  return value as T;
}

/**
 * Browser-only access to the Nimiq Pay Mini App provider.
 * Outside Nimiq Pay the state becomes "unavailable" and the app stays browsable.
 */
export function useNimiq() {
  const [state, setState] = useState<ProviderState>("loading");
  const providerRef = useRef<NimiqProvider | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { init } = await import("@nimiq/mini-app-sdk");
        const provider = await init({ timeout: 3000 });
        if (cancelled) return;
        providerRef.current = provider;
        setState("ready");
      } catch {
        if (!cancelled) setState("unavailable");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const requireProvider = useCallback(() => {
    const provider = providerRef.current;
    if (!provider) throw new Error("Open this game inside Nimiq Pay to connect your wallet.");
    return provider;
  }, []);

  const listAccounts = useCallback(async () => {
    return unwrap(await requireProvider().listAccounts());
  }, [requireProvider]);

  const signMessage = useCallback(
    async (message: string) => unwrap(await requireProvider().sign(message)),
    [requireProvider],
  );

  const sendStake = useCallback(
    async (params: { recipient: string; valueLuna: number; memo: string }) => {
      const result = unwrap(
        await requireProvider().sendBasicTransactionWithData({
          recipient: params.recipient,
          value: params.valueLuna,
          data: params.memo,
        }),
      );
      return String(result);
    },
    [requireProvider],
  );

  return { state, available: state === "ready", listAccounts, signMessage, sendStake };
}
