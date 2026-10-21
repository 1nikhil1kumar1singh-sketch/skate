"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { BetResult, MeResponse, UserView } from "@/lib/types";

type SkateContextValue = {
  user: UserView | null;
  demoMode: boolean;
  liveWallet: boolean;
  privyConfigured: boolean;
  loading: boolean;
  useBonus: boolean;
  setUseBonus: (v: boolean) => void;
  /** Stake-style Fun Play — practice, no wallet / balance */
  funPlay: boolean;
  setFunPlay: (v: boolean) => void;
  solana: MeResponse["solana"];
  wallet: MeResponse["wallet"];
  refresh: () => Promise<void>;
  loginDemo: () => Promise<void>;
  logout: () => Promise<void>;
  placeBet: (body: Record<string, unknown>) => Promise<BetResult>;
  demoDeposit: (amount?: number) => Promise<void>;
  deposit: (input: {
    amount?: number;
    signature?: string;
    demo?: boolean;
  }) => Promise<{ bonusGranted?: string }>;
  withdraw: (input: {
    amount: number;
    toAddress: string;
    asset?: "USDC" | "USDT";
    demo?: boolean;
  }) => Promise<{
    fee?: string;
    sent?: string;
    mode?: string;
    signature?: string;
    asset?: string;
  }>;
  syncDeposits: () => Promise<{
    credited?: string;
    swept?: string;
    mode?: string;
    message?: string;
  }>;
  updateProfile: (input: {
    displayName?: string;
    walletAddress?: string;
  }) => Promise<void>;
  setUserBalance: (balance: UserView["balance"]) => void;
};

const SkateContext = createContext<SkateContextValue | null>(null);

export function SkateProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserView | null>(null);
  const [demoMode, setDemoMode] = useState(true);
  const [liveWallet, setLiveWallet] = useState(false);
  const [privyConfigured, setPrivyConfigured] = useState(false);
  const [solana, setSolana] = useState<MeResponse["solana"]>();
  const [wallet, setWallet] = useState<MeResponse["wallet"]>();
  const [loading, setLoading] = useState(true);
  const [useBonus, setUseBonus] = useState(false);
  const [funPlay, setFunPlay] = useState(false);

  const refresh = useCallback(async () => {
    const res = await fetch("/api/me", { cache: "no-store" });
    const data = (await res.json()) as MeResponse;
    setUser(data.user);
    setDemoMode(data.demoMode);
    setLiveWallet(Boolean(data.liveWallet));
    setPrivyConfigured(Boolean(data.privyConfigured));
    setSolana(data.solana);
    setWallet(data.wallet);
    if (!data.user?.balance?.hasBonus) setUseBonus(false);
    setLoading(false);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const loginDemo = useCallback(async () => {
    let ref: string | undefined;
    try {
      ref = localStorage.getItem("skate_ref") ?? undefined;
    } catch {
      /* ignore */
    }
    const res = await fetch("/api/auth/demo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(ref ? { ref } : {}),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error ?? "Demo login failed");
    }
    try {
      localStorage.removeItem("skate_ref");
    } catch {
      /* ignore */
    }
    await refresh();
  }, [refresh]);

  const logout = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
  }, []);

  const placeBet = useCallback(
    async (body: Record<string, unknown>) => {
      if (funPlay) {
        const res = await fetch("/api/bet/try", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Fun play bet failed");
        return data as BetResult;
      }

      const res = await fetch("/api/bet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...body,
          useBonus: Boolean(useBonus && user?.balance?.hasBonus),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Bet failed");
      const result = data as BetResult;
      setUser((prev) =>
        prev
          ? { ...prev, balance: result.balance, nonce: prev.nonce + 1 }
          : prev,
      );
      if (!result.balance.hasBonus) setUseBonus(false);
      return result;
    },
    [funPlay, useBonus, user?.balance?.hasBonus],
  );

  const deposit = useCallback(
    async (input: { amount?: number; signature?: string; demo?: boolean }) => {
      const res = await fetch("/api/deposit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Deposit failed");
      setUser((prev) => (prev ? { ...prev, balance: data.balance } : prev));
      return { bonusGranted: data.bonusGranted as string | undefined };
    },
    [],
  );

  const demoDeposit = useCallback(
    async (amount = 50) => {
      await deposit({ demo: true, amount });
    },
    [deposit],
  );

  const withdraw = useCallback(
    async (input: {
      amount: number;
      toAddress: string;
      asset?: "USDC" | "USDT";
      demo?: boolean;
    }) => {
      const res = await fetch("/api/withdraw", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Withdraw failed");
      setUser((prev) => (prev ? { ...prev, balance: data.balance } : prev));
      return {
        fee: data.fee as string | undefined,
        sent: data.sent as string | undefined,
        mode: data.mode as string | undefined,
        signature: data.signature as string | undefined,
        asset: data.asset as string | undefined,
      };
    },
    [],
  );

  const syncDeposits = useCallback(async () => {
    const res = await fetch("/api/deposit/sync", { method: "POST" });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "Sync failed");
    if (data.balance) {
      setUser((prev) => (prev ? { ...prev, balance: data.balance } : prev));
    }
    return data as {
      credited?: string;
      swept?: string;
      mode?: string;
      message?: string;
    };
  }, []);

  const updateProfile = useCallback(
    async (input: { displayName?: string; walletAddress?: string }) => {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Update failed");
      setUser((prev) =>
        prev
          ? {
              ...prev,
              displayName: data.user.displayName,
              walletAddress: data.user.walletAddress,
            }
          : prev,
      );
    },
    [],
  );

  const setUserBalance = useCallback((balance: UserView["balance"]) => {
    setUser((prev) => (prev ? { ...prev, balance } : prev));
  }, []);

  return (
    <SkateContext.Provider
      value={{
        user,
        demoMode,
        liveWallet,
        privyConfigured,
        loading,
        useBonus,
        setUseBonus,
        funPlay,
        setFunPlay,
        solana,
        wallet,
        refresh,
        loginDemo,
        logout,
        placeBet,
        demoDeposit,
        deposit,
        withdraw,
        syncDeposits,
        updateProfile,
        setUserBalance,
      }}
    >
      {children}
    </SkateContext.Provider>
  );
}

export function useSkate() {
  const ctx = useContext(SkateContext);
  if (!ctx) throw new Error("useSkate must be used within SkateProvider");
  return ctx;
}
