import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import * as SecureStore from 'expo-secure-store';

const KEY_PK = 'seekermigrate.wallet.publicKey';
const KEY_AUTH = 'seekermigrate.wallet.authToken';

type WalletState = {
  publicKey: string | null;
  authToken: string | null;
  connected: boolean;
  setSession: (pk: string | null, authToken?: string | null) => Promise<void>;
  disconnect: () => Promise<void>;
};

const WalletCtx = createContext<WalletState | null>(null);

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [publicKey, setPk] = useState<string | null>(null);
  const [authToken, setAuthToken] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const storedPk = await SecureStore.getItemAsync(KEY_PK);
        const storedAuth = await SecureStore.getItemAsync(KEY_AUTH);
        if (storedPk) setPk(storedPk);
        if (storedAuth) setAuthToken(storedAuth);
      } catch {
        // ignore
      }
    })();
  }, []);

  const setSession = useCallback(async (pk: string | null, token?: string | null) => {
    setPk(pk);
    setAuthToken(token ?? null);
    try {
      if (pk) await SecureStore.setItemAsync(KEY_PK, pk);
      else await SecureStore.deleteItemAsync(KEY_PK);

      if (token) await SecureStore.setItemAsync(KEY_AUTH, token);
      else await SecureStore.deleteItemAsync(KEY_AUTH);
    } catch {
      // ignore
    }
  }, []);

  const disconnect = useCallback(async () => {
    await setSession(null, null);
  }, [setSession]);

  const value = useMemo(
    () => ({ publicKey, authToken, connected: !!publicKey, setSession, disconnect }),
    [publicKey, authToken, setSession, disconnect]
  );

  return <WalletCtx.Provider value={value}>{children}</WalletCtx.Provider>;
}

export function useWallet() {
  const ctx = useContext(WalletCtx);
  if (!ctx) throw new Error('WalletProvider missing');
  return ctx;
}

export function formatPk(pk: string) {
  if (pk.length <= 10) return pk;
  return `${pk.slice(0, 4)}…${pk.slice(-4)}`;
}
