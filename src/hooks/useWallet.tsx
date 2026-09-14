import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { startWalletAuth, completeWalletAuth } from "@/lib/auth.functions";
import { useNimiq, type NimiqBackend } from "./useNimiq";

type WalletContextValue = {
  address: string | null;
  signedIn: boolean;
  connecting: boolean;
  backend: NimiqBackend;
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

  // Used for the two-phase Hub flow: store the address obtained from
  // chooseAddress so signMessage can use it without another popup.
  const pendingAddressRef = useRef<string | null>(null);

  // Restore an existing Supabase session on mount.
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) return;
      setSignedIn(true);
      const wallet = data.session.user.user_metadata?.["wallet_address"];
      if (typeof wallet === "string") setAddress(wallet);
    });
  }, []);

  // ---------------------------------------------------------------------------
  // connect
  //
  // For the mini-app backend this is a single async chain (the provider handles
  // popup management internally).
  //
  // For the Hub backend each popup (chooseAddress, signMessage) must be
  // triggered synchronously from a user-action — so this function performs
  // both steps inside a single call that is invoked directly from the button
  // onClick. We avoid any await before the hub calls by fetching the nonce
  // first (server call) and then making the two Hub popup calls back-to-back.
  // ---------------------------------------------------------------------------
  const connect = useCallback(async () => {
    setConnecting(true);
    try {
      // ---- Mini-app path (unchanged) ----------------------------------------
      if (nimiq.backend === "mini-app" || nimiq.backend === null) {
        const accounts = await nimiq.listAccounts();
        const walletAddress = accounts[0];
        if (!walletAddress) throw new Error("No Nimiq account was shared.");

        const challenge = await startWalletAuth({ data: { address: walletAddress } });
        const sig = await nimiq.signMessage(challenge.message);
        const session = await completeWalletAuth({
          data: {
            address: walletAddress,
            publicKey: sig.publicKey,
            signature: sig.signature,
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
        return;
      }

      // ---- Hub (web browser) path -------------------------------------------
      //
      // Hub popups must be triggered synchronously from within a user action.
      // We do the following in a single connect() call that is invoked directly
      // from the button click:
      //
      //   1. chooseAddress popup → get address
      //   2. Fetch nonce from server (async, but between two popup calls is OK
      //      because the browser already "consumed" the gesture for step 1)
      //   3. signMessage popup → get signature
      //   4. Verify + create session on server
      //
      // Note: step 3's popup opens as a result of step 1 completing, which
      // keeps it within the same user-initiated async chain. All major browsers
      // allow subsequent popups in the same async chain started by a click.

      // Step 1: address selection popup
      const accounts = await nimiq.listAccounts();
      const walletAddress = accounts[0];
      if (!walletAddress) throw new Error("No Nimiq account was selected.");
      pendingAddressRef.current = walletAddress;

      // Step 2: server nonce
      const challenge = await startWalletAuth({ data: { address: walletAddress } });

      // Step 3: sign popup (still in the same click-triggered promise chain)
      const sig = await nimiq.signMessage(challenge.message);

      // Step 4: server verification + session
      const session = await completeWalletAuth({
        data: {
          address: walletAddress,
          publicKey: sig.publicKey,
          signature: sig.signature,
        },
      });
      const { error } = await supabase.auth.setSession({
        access_token: session.accessToken,
        refresh_token: session.refreshToken,
      });
      if (error) throw new Error("Could not start your session.");
      pendingAddressRef.current = null;
      setAddress(session.address);
      setSignedIn(true);
      await queryClient.invalidateQueries();
      toast.success("Wallet connected");
    } catch (error) {
      pendingAddressRef.current = null;
      // Hub request cancelled by user — don't show an error toast
      const msg = error instanceof Error ? error.message : String(error);
      if (/cancel/i.test(msg) || /request was cancelled/i.test(msg)) {
        // silently ignore
      } else {
        toast.error(msg || "Could not connect your wallet");
      }
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
      backend: nimiq.backend,
      connect,
      signOut,
      sendStake: nimiq.sendStake,
    }),
    [address, signedIn, connecting, nimiq.backend, nimiq.sendStake, connect, signOut],
  );

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

export function useWallet() {
  const context = useContext(WalletContext);
  if (!context) throw new Error("useWallet must be used inside WalletProvider");
  return context;
}
