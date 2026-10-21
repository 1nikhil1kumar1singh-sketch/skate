import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { readSession } from "@/lib/session";
import { config, getAcceptedStables } from "@/lib/config";
import { serializeBalance, toMicroUsdc } from "@/lib/money";
import {
  isLiveWalletReady,
  sweepAllStablesToTreasury,
  verifyStableDepositToOwner,
} from "@/lib/solana";
import { ensureDepositPath } from "@/lib/users";
import { grantFirstDepositBonus } from "@/lib/grantBonus";

const schema = z.object({
  signature: z.string().min(32).optional(),
  amount: z.number().positive().max(100_000).optional(),
  demo: z.boolean().optional(),
});

export async function POST(req: NextRequest) {
  const session = await readSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { signature, amount, demo } = parsed.data;
  const live = isLiveWalletReady();

  // Demo top-up only when explicitly allowed (demo mode or ?demo while not live)
  if (demo && !live) {
    const credit = toMicroUsdc(amount ?? 50);
    const { balance, bonusGranted } = await prisma.$transaction(async (tx) => {
      await tx.deposit.create({
        data: {
          userId: session.userId,
          amount: credit,
          signature: `demo-${Date.now()}-${Math.random().toString(16).slice(2)}`,
          status: "demo",
        },
      });
      await tx.balance.update({
        where: { userId: session.userId },
        data: { available: { increment: credit } },
      });
      const bonusGranted = await grantFirstDepositBonus(
        tx,
        session.userId,
        credit,
      );
      const balance = await tx.balance.findUniqueOrThrow({
        where: { userId: session.userId },
      });
      return { balance, bonusGranted };
    });

    return NextResponse.json({
      ok: true,
      mode: "demo",
      credited: credit.toString(),
      bonusGranted: bonusGranted.toString(),
      balance: serializeBalance(
        balance.available,
        balance.locked,
        balance.bonus,
      ),
    });
  }

  if (!live) {
    return NextResponse.json(
      {
        error:
          "Live wallet not configured. Run: npm run setup:treasury (and restart)",
      },
      { status: 503 },
    );
  }

  if (!signature) {
    const assets = getAcceptedStables()
      .map((s) => s.symbol)
      .join("/");
    return NextResponse.json(
      {
        error: `Send ${assets} to your personal deposit address, then use Sync — or paste a tx signature here`,
      },
      { status: 400 },
    );
  }

  const existing = await prisma.deposit.findUnique({ where: { signature } });
  if (existing) {
    return NextResponse.json({ error: "Deposit already credited" }, { status: 409 });
  }

  const user = await ensureDepositPath(session.userId);
  if (!user?.depositAddress || !user.depositSecret) {
    return NextResponse.json({ error: "Deposit address missing" }, { status: 400 });
  }

  try {
    const minAmount = toMicroUsdc(amount ?? 0.01);
    // Accept USDC or USDT to personal address (preferred) or treasury fallback
    let credited: bigint;
    let symbol = "USDC";
    try {
      const hit = await verifyStableDepositToOwner(
        signature,
        user.depositAddress,
        minAmount,
      );
      credited = hit.credited;
      symbol = hit.symbol;
    } catch {
      if (!config.solana.treasuryAddress) throw new Error("Deposit not found");
      const hit = await verifyStableDepositToOwner(
        signature,
        config.solana.treasuryAddress,
        minAmount,
      );
      credited = hit.credited;
      symbol = hit.symbol;
    }

    const { updated, bonusGranted } = await prisma.$transaction(async (tx) => {
      await tx.deposit.create({
        data: {
          userId: session.userId,
          amount: credited,
          signature,
          status: `confirmed:${symbol}`,
        },
      });
      await tx.balance.update({
        where: { userId: session.userId },
        data: { available: { increment: credited } },
      });
      const bonusGranted = await grantFirstDepositBonus(
        tx,
        session.userId,
        credited,
      );
      const updated = await tx.balance.findUniqueOrThrow({
        where: { userId: session.userId },
      });
      return { updated, bonusGranted };
    });

    // Best-effort sweep personal wallet → treasury (USDC + USDT)
    let sweepSignature: string | null = null;
    try {
      const sweep = await sweepAllStablesToTreasury(
        user.depositSecret,
        user.depositAddress,
      );
      sweepSignature = sweep.signatures[0] ?? null;
    } catch {
      // credit already applied; sweep can retry via /api/deposit/sync
    }

    return NextResponse.json({
      ok: true,
      mode: "onchain",
      symbol,
      credited: credited.toString(),
      bonusGranted: bonusGranted.toString(),
      sweepSignature,
      balance: serializeBalance(
        updated.available,
        updated.locked,
        updated.bonus,
      ),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Deposit failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
