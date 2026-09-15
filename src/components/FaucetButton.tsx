import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Droplets } from "lucide-react";
import { requestFaucetDrop } from "@/lib/faucet.functions";

type Props = {
  /** Current on-chain NIM balance. Null = unavailable, 0 = empty. */
  balanceNim: number | null;
  /** Whether the app is on testnet — button only shows when true. */
  isTestnet: boolean;
};

/**
 * Shows a "Get test NIM" button when:
 *  - app is on testnet
 *  - balance is known (not null) AND is zero (or effectively zero: < 0.1 NIM)
 *
 * Calls the server-side faucet proxy so the user's address is taken from
 * their verified session rather than being supplied by the client.
 */
export function FaucetButton({ balanceNim, isTestnet }: Props) {
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [used, setUsed] = useState(false);

  // Only show on testnet when the balance is known and essentially zero
  if (!isTestnet || balanceNim === null || balanceNim >= 0.1) return null;
  // Hide after a successful drop (balance will refresh shortly anyway)
  if (used) return null;

  const handleRequest = async () => {
    setLoading(true);
    try {
      const result = await requestFaucetDrop();
      toast.success(`${result.message} (~${result.expectedBlocks} block${result.expectedBlocks !== 1 ? "s" : ""} to confirm)`);
      setUsed(true);
      // Refresh balance after a short delay to give the transaction time to appear
      setTimeout(() => {
        void queryClient.invalidateQueries({ queryKey: ["wallet-balance"] });
      }, 8_000);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Faucet request failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleRequest}
      disabled={loading}
      className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl border border-primary/30 bg-primary/10 px-3 py-2.5 text-xs font-bold text-primary transition-colors hover:bg-primary/20 disabled:opacity-60"
    >
      <Droplets className="size-3.5" />
      {loading ? "Requesting testnet NIM…" : "Get test NIM from faucet"}
    </button>
  );
}
