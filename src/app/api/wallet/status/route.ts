import { NextResponse } from "next/server";
import { config, getAcceptedStables } from "@/lib/config";
import {
  getTreasuryKeypair,
  getTokenBalance,
  isLiveWalletReady,
} from "@/lib/solana";

export async function GET() {
  const treasury = getTreasuryKeypair();
  const live = isLiveWalletReady();
  let treasuryUsdc = "0";
  let treasuryUsdt = "0";
  const accepted = getAcceptedStables();

  if (treasury) {
    const addr = treasury.publicKey.toBase58();
    try {
      treasuryUsdc = (
        await getTokenBalance(addr, config.solana.usdcMint)
      ).toString();
    } catch {
      treasuryUsdc = "0";
    }
    if (config.solana.usdtMint) {
      try {
        treasuryUsdt = (
          await getTokenBalance(addr, config.solana.usdtMint)
        ).toString();
      } catch {
        treasuryUsdt = "0";
      }
    }
  }

  return NextResponse.json({
    live,
    demoMode: config.demoMode,
    cluster: config.solana.cluster,
    usdcMint: config.solana.usdcMint,
    usdtMint: config.solana.usdtMint || null,
    acceptedStables: accepted.map((s) => s.symbol),
    treasuryAddress: config.solana.treasuryAddress || null,
    treasuryConfigured: Boolean(treasury),
    treasuryUsdc,
    treasuryUsdt,
    withdrawFeeBps: config.withdrawFeeBps,
    readyMessage: live
      ? `Live wallet active — accept & withdraw ${accepted.map((s) => s.symbol).join("/")}.`
      : config.demoMode
        ? "Demo mode on. Run: npm run setup:treasury"
        : "Set NEXT_PUBLIC_TREASURY_ADDRESS + TREASURY_SECRET_KEY, then restart.",
  });
}
