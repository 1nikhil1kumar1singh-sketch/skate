import { NextResponse } from "next/server";
import { readSession } from "@/lib/session";
import { getUserWithBalance } from "@/lib/users";
import { serializeBalance } from "@/lib/money";
import { config, getAcceptedStables } from "@/lib/config";
import { isLiveWalletReady } from "@/lib/solana";
import { prisma } from "@/lib/prisma";
import {
  BONUS_MATCH_BPS,
  BONUS_MAX_USDC,
  BONUS_MIN_DEPOSIT_USDC,
} from "@/lib/bonus";

export async function GET() {
  const live = isLiveWalletReady();
  const session = await readSession();
  if (!session) {
    return NextResponse.json({
      user: null,
      demoMode: config.demoMode,
      liveWallet: live,
    });
  }

  const user = await getUserWithBalance(session.userId);
  if (!user || !user.balance) {
    return NextResponse.json({
      user: null,
      demoMode: config.demoMode,
      liveWallet: live,
    });
  }

  const firstUser = await prisma.user.findFirst({
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });
  const firstDepositEligible =
    firstUser?.id === user.id && !user.firstDepositBonusClaimed;

  return NextResponse.json({
    demoMode: config.demoMode,
    liveWallet: live,
    privyConfigured: Boolean(config.privyAppId),
    user: {
      id: user.id,
      displayName: user.displayName,
      walletAddress: user.walletAddress,
      depositPath: user.depositPath,
      depositAddress: user.depositAddress,
      depositUrl: user.depositPath ? `/pay/${user.depositPath}` : null,
      clientSeed: user.clientSeed,
      serverSeedHash: user.serverSeedHash,
      nonce: user.nonce,
      balance: serializeBalance(
        user.balance.available,
        user.balance.locked,
        user.balance.bonus,
      ),
      firstDepositOffer: firstDepositEligible
        ? {
            eligible: true,
            matchPercent: BONUS_MATCH_BPS / 100,
            minDepositUsd: BONUS_MIN_DEPOSIT_USDC,
            maxBonusUsd: BONUS_MAX_USDC,
          }
        : null,
    },
    solana: {
      cluster: config.solana.cluster,
      usdcMint: config.solana.usdcMint,
      usdtMint: config.solana.usdtMint || null,
      acceptedStables: getAcceptedStables().map((s) => s.symbol),
      treasuryAddress: config.solana.treasuryAddress || null,
      rpcUrl: config.solana.rpcUrl,
    },
    wallet: {
      maxBetUsdc: config.maxBetUsdc,
      maxWinUsdc: config.maxWinUsdc,
      withdrawFeeBps: config.withdrawFeeBps,
      houseEdge: config.houseEdge,
    },
  });
}
