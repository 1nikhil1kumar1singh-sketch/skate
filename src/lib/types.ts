export type BalanceView = {
  available: string;
  locked: string;
  bonus: string;
  availableDisplay: string;
  bonusDisplay: string;
  hasBonus: boolean;
};

export type FirstDepositOffer = {
  eligible: boolean;
  matchPercent: number;
  minDepositUsd: number;
  maxBonusUsd: number;
};

export type UserView = {
  id: string;
  displayName: string | null;
  /** True for browse-as-guest sessions (no email / wallet account). */
  isGuest?: boolean;
  walletAddress?: string | null;
  depositPath?: string | null;
  depositAddress?: string | null;
  depositUrl?: string | null;
  clientSeed: string;
  serverSeedHash: string;
  nonce: number;
  balance: BalanceView;
  firstDepositOffer?: FirstDepositOffer | null;
};

export type MeResponse = {
  user: UserView | null;
  demoMode: boolean;
  liveWallet?: boolean;
  privyConfigured?: boolean;
  solana?: {
    cluster: string;
    usdcMint: string;
    usdtMint?: string | null;
    acceptedStables?: string[];
    treasuryAddress: string | null;
    rpcUrl: string;
  };
  wallet?: {
    maxBetUsdc: number;
    maxWinUsdc: number;
    withdrawFeeBps: number;
    houseEdge: number;
  };
};

export type BetResult = {
  bet: {
    id: string;
    game: string;
    amount: string;
    payout: string;
    profit: string;
    won: boolean;
    choice: unknown;
    result: Record<string, unknown>;
    multiplier: number;
    serverSeed: string;
    serverSeedHash: string;
    clientSeed: string;
    nonce: number;
  };
  balance: BalanceView;
};
