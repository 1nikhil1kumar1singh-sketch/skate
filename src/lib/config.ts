export const config = {
  appName: process.env.NEXT_PUBLIC_APP_NAME ?? "Skate",
  // Explicit DEMO_MODE=false wins (live wallet without Privy still works via demo JWT).
  demoMode: (() => {
    const demo = process.env.DEMO_MODE;
    const pub = process.env.NEXT_PUBLIC_DEMO_MODE;
    if (demo === "false" || pub === "false") return false;
    if (demo === "true" || pub === "true") return true;
    return !process.env.NEXT_PUBLIC_PRIVY_APP_ID;
  })(),
  privyAppId: process.env.NEXT_PUBLIC_PRIVY_APP_ID ?? "",
  privyAppSecret: process.env.PRIVY_APP_SECRET ?? "",
  sessionSecret: process.env.SESSION_SECRET ?? "skate-dev-session",
  solana: {
    cluster: (process.env.NEXT_PUBLIC_SOLANA_CLUSTER ?? "devnet") as
      | "devnet"
      | "mainnet-beta",
    rpcUrl:
      process.env.NEXT_PUBLIC_SOLANA_RPC_URL ??
      "https://api.devnet.solana.com",
    usdcMint:
      process.env.NEXT_PUBLIC_USDC_MINT ??
      "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU",
    /** Solana USDT (Tether). Empty string disables USDT deposits. */
    usdtMint:
      process.env.NEXT_PUBLIC_USDT_MINT ??
      (process.env.NEXT_PUBLIC_SOLANA_CLUSTER === "mainnet-beta"
        ? "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB"
        : ""),
    treasuryAddress: process.env.NEXT_PUBLIC_TREASURY_ADDRESS ?? "",
    treasurySecretKey: process.env.TREASURY_SECRET_KEY ?? "",
  },
  /** Starting demo balance: 100 USDC */
  demoStartingBalance: BigInt(100_000_000),

  /**
   * Platform take — raise this for more profit.
   * 0.20 = 20% house edge on fair odds (RTP ≈ 80%).
   */
  houseEdge: Number(process.env.HOUSE_EDGE ?? "0.20"),

  /** Mines edge in basis points (2000 = 20%). */
  minesHouseEdgeBp: Number(process.env.MINES_HOUSE_EDGE_BP ?? "2000"),

  /** Hard caps protect treasury from whale luck. */
  maxBetUsdc: Number(process.env.MAX_BET_USDC ?? "25"),
  maxWinUsdc: Number(process.env.MAX_WIN_USDC ?? "150"),
  maxPayoutMult: Number(process.env.MAX_PAYOUT_MULT ?? "50"),

  /** Cut on every withdrawal (extra profit on cash-outs). */
  withdrawFeeBps: Number(process.env.WITHDRAW_FEE_BPS ?? "300"), // 3%
} as const;

/** USDC + Solana USDT both use 6 decimals. */
export const USDC_DECIMALS = 6;
export const STABLE_DECIMALS = 6;

export type StableSymbol = "USDC" | "USDT";

export function getAcceptedStables(): { symbol: StableSymbol; mint: string }[] {
  const list: { symbol: StableSymbol; mint: string }[] = [
    { symbol: "USDC", mint: config.solana.usdcMint },
  ];
  if (config.solana.usdtMint) {
    list.push({ symbol: "USDT", mint: config.solana.usdtMint });
  }
  return list;
}

/** Client-safe mirror for UI math (set NEXT_PUBLIC_HOUSE_EDGE to match). */
export const PUBLIC_HOUSE_EDGE = Number(
  process.env.NEXT_PUBLIC_HOUSE_EDGE ?? process.env.HOUSE_EDGE ?? "0.20",
);
