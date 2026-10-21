import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { PublicKey } from "@solana/web3.js";
import { prisma } from "@/lib/prisma";
import { readSession } from "@/lib/session";
import { config, getAcceptedStables, type StableSymbol } from "@/lib/config";
import { serializeBalance, toMicroUsdc } from "@/lib/money";
import { isLiveWalletReady, sendStableWithdrawal } from "@/lib/solana";

const schema = z.object({
  amount: z.number().positive().max(100_000),
  toAddress: z.string().min(32).max(64),
  asset: z.enum(["USDC", "USDT"]).optional().default("USDC"),
  demo: z.boolean().optional(),
});

function resolveAsset(requested: "USDC" | "USDT"): StableSymbol {
  const accepted = getAcceptedStables();
  const hit = accepted.find((s) => s.symbol === requested);
  if (!hit) {
    throw new Error(
      requested === "USDT"
        ? "USDT withdrawals are not enabled on this cluster"
        : "USDC withdrawals are not enabled",
    );
  }
  return hit.symbol;
}

export async function POST(req: NextRequest) {
  const session = await readSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  let asset: StableSymbol;
  try {
    asset = resolveAsset(parsed.data.asset);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Invalid asset" },
      { status: 400 },
    );
  }

  const live = isLiveWalletReady();

  if (parsed.data.demo && live) {
    return NextResponse.json(
      { error: "Demo withdraw disabled — live wallet is active" },
      { status: 400 },
    );
  }

  if (!live) {
    if (!config.demoMode && !parsed.data.demo) {
      return NextResponse.json(
        {
          error: "Live wallet not configured. Run: npm run setup:treasury",
        },
        { status: 503 },
      );
    }

    const amount = toMicroUsdc(parsed.data.amount);
    const fee = (amount * BigInt(config.withdrawFeeBps)) / BigInt(10_000);
    const sendAmount = amount - fee;
    const balance = await prisma.balance.findUnique({
      where: { userId: session.userId },
    });
    if (!balance || balance.available < amount) {
      return NextResponse.json({ error: "Insufficient balance" }, { status: 400 });
    }

    const updated = await prisma.$transaction(async (tx) => {
      const next = await tx.balance.update({
        where: { userId: session.userId },
        data: { available: { decrement: amount } },
      });
      await tx.withdrawal.create({
        data: {
          userId: session.userId,
          amount: sendAmount,
          toAddress: parsed.data.toAddress,
          signature: `demo-wd-${asset}-${Date.now()}`,
          status: `demo:${asset}`,
        },
      });
      return next;
    });

    return NextResponse.json({
      ok: true,
      mode: "demo",
      asset,
      fee: fee.toString(),
      sent: sendAmount.toString(),
      balance: serializeBalance(
        updated.available,
        updated.locked,
        updated.bonus,
      ),
    });
  }

  let toPubkey: PublicKey;
  try {
    toPubkey = new PublicKey(parsed.data.toAddress);
  } catch {
    return NextResponse.json({ error: "Invalid Solana address" }, { status: 400 });
  }

  const amount = toMicroUsdc(parsed.data.amount);
  const fee = (amount * BigInt(config.withdrawFeeBps)) / BigInt(10_000);
  const sendAmount = amount - fee;
  if (sendAmount <= BigInt(0)) {
    return NextResponse.json({ error: "Amount too small after fee" }, { status: 400 });
  }

  const balance = await prisma.balance.findUnique({
    where: { userId: session.userId },
  });
  if (!balance || balance.available < amount) {
    return NextResponse.json({ error: "Insufficient balance" }, { status: 400 });
  }

  try {
    await prisma.balance.update({
      where: { userId: session.userId },
      data: {
        available: { decrement: amount },
        locked: { increment: amount },
      },
    });

    const signature = await sendStableWithdrawal(
      toPubkey.toBase58(),
      sendAmount,
      asset,
    );

    const updated = await prisma.$transaction(async (tx) => {
      await tx.withdrawal.create({
        data: {
          userId: session.userId,
          amount: sendAmount,
          toAddress: toPubkey.toBase58(),
          signature,
          status: `confirmed:${asset}`,
        },
      });
      return tx.balance.update({
        where: { userId: session.userId },
        data: { locked: { decrement: amount } },
      });
    });

    return NextResponse.json({
      ok: true,
      mode: "onchain",
      asset,
      signature,
      fee: fee.toString(),
      sent: sendAmount.toString(),
      balance: serializeBalance(
        updated.available,
        updated.locked,
        updated.bonus,
      ),
    });
  } catch (error) {
    await prisma.balance.update({
      where: { userId: session.userId },
      data: {
        available: { increment: amount },
        locked: { decrement: amount },
      },
    });
    const message = error instanceof Error ? error.message : "Withdraw failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
