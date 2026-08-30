import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { startWalletAuth, completeWalletAuth } from "@/lib/auth.functions";
import { useNimiq } from "./useNimiq";

type WalletContextValue = {
  address: string | null;
  signedIn: boolean;
  connecting: boolean;
  providerState: "loading" | "ready" | "unavailable";
  connect: () => Promise<void>;
  signOut: () => Promise<void>;
  sendStake: (params: { recipient: string; valueLuna: number; memo: string }) => Promise<string>;
};

const WalletContext = createContext<WalletContextValue | null>(null);

export function WalletProvider({ children }: { children: ReactNode }) {
  const nimiq = useNimiq();
  const queryClient = useQueryClient();
  const [address, setAddress] = useState<string | null>(null);
  const [signedIn, setSignedIn] = useState(false);
  const [connecting, setConnecting] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) return;
      setSignedIn(true);
      const wallet = data.session.user.user_metadata?.["wallet_address"];
      if (typeof wallet === "string") setAddress(wallet);
    });
  }, []);

  const connect = useCallback(async () => {
    setConnecting(true);
    try {
      const accounts = await nimiq.listAccounts();
      const walletAddress = accounts[0];
      if (!walletAddress) throw new Error("No Nimiq account was shared.");

      const challenge = await startWalletAuth({ data: { address: walletAddress } });
      const signature = await nimiq.signMessage(challenge.message);
      const session = await completeWalletAuth({
        data: {
          address: walletAddress,
          publicKey: signature.publicKey,
          signature: signature.signature,
        },
      });
      const { error } = await supabase.auth.setSession({
        access_token: session.accessToken,
        refresh_token: session.refreshToken,
      });
      if (error) throw new Error("Could not start your session.");
      setAddress(session.address);
      setSignedIn(true);
      await queryClient.invalidateQueries();
      toast.success("Wallet connected");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not connect your wallet");
    } finally {
      setConnecting(false);
    }
  }, [nimiq, queryClient]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setSignedIn(false);
    setAddress(null);
    queryClient.clear();
  }, [queryClient]);

  const value = useMemo<WalletContextValue>(
    () => ({
      address,
      signedIn,
      connecting,
      providerState: nimiq.state,
      connect,
      signOut,
      sendStake: nimiq.sendStake,
    }),
    [address, signedIn, connecting, nimiq.state, nimiq.sendStake, connect, signOut],
  );

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

export function useWallet() {
  const context = useContext(WalletContext);
  if (!context) throw new Error("useWallet must be used inside WalletProvider");
  return context;
}
