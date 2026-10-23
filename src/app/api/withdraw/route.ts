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

class InsufficientBalanceError extends Error {
  constructor() {
    super("Insufficient balance");
    this.name = "InsufficientBalanceError";
  }
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
    if (!config.demoMode) {
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

    try {
      const updated = await prisma.$transaction(async (tx) => {
        const locked = await tx.balance.updateMany({
          where: { userId: session.userId, available: { gte: amount } },
          data: { available: { decrement: amount } },
        });
        if (locked.count !== 1) {
          throw new InsufficientBalanceError();
        }
        await tx.withdrawal.create({
          data: {
            userId: session.userId,
            amount: sendAmount,
            toAddress: parsed.data.toAddress,
            signature: `demo-wd-${asset}-${Date.now()}`,
            status: `demo:${asset}`,
          },
        });
        return tx.balance.findUniqueOrThrow({
          where: { userId: session.userId },
        });
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
    } catch (error) {
      if (error instanceof InsufficientBalanceError) {
        return NextResponse.json(
          { error: "Insufficient balance" },
          { status: 400 },
        );
      }
      throw error;
    }
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
    return NextResponse.json(
      { error: "Amount too small after fee" },
      { status: 400 },
    );
  }

  // 1) Atomically lock funds + create pending withdrawal (before any broadcast)
  let pendingId: string;
  try {
    const pending = await prisma.$transaction(async (tx) => {
      const locked = await tx.balance.updateMany({
        where: { userId: session.userId, available: { gte: amount } },
        data: {
          available: { decrement: amount },
          locked: { increment: amount },
        },
      });
      if (locked.count !== 1) {
        throw new InsufficientBalanceError();
      }
      return tx.withdrawal.create({
        data: {
          userId: session.userId,
          amount: sendAmount,
          toAddress: toPubkey.toBase58(),
          signature: null,
          status: `pending:${asset}`,
        },
      });
    });
    pendingId = pending.id;
  } catch (error) {
    if (error instanceof InsufficientBalanceError) {
      return NextResponse.json(
        { error: "Insufficient balance" },
        { status: 400 },
      );
    }
    throw error;
  }

  // 2) Broadcast on-chain
  let signature: string;
  try {
    signature = await sendStableWithdrawal(
      toPubkey.toBase58(),
      sendAmount,
      asset,
    );
  } catch (error) {
    // Send never landed — safe to refund ledger
    await prisma.$transaction(async (tx) => {
      await tx.balance.update({
        where: { userId: session.userId },
        data: {
          available: { increment: amount },
          locked: { decrement: amount },
        },
      });
      await tx.withdrawal.update({
        where: { id: pendingId },
        data: { status: `failed:${asset}` },
      });
    });
    const message = error instanceof Error ? error.message : "Withdraw failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  // 3) Send succeeded — NEVER restore available. Finalize DB.
  try {
    const updated = await prisma.$transaction(async (tx) => {
      await tx.withdrawal.update({
        where: { id: pendingId },
        data: {
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
  } catch {
    // On-chain paid; keep funds deducted. Persist signature for ops.
    await prisma.withdrawal
      .update({
        where: { id: pendingId },
        data: {
          signature,
          status: `sent_unconfirmed:${asset}`,
        },
      })
      .catch(() => {
        /* best effort */
      });

    const balance = await prisma.balance.findUniqueOrThrow({
      where: { userId: session.userId },
    });

    return NextResponse.json({
      ok: true,
      mode: "onchain",
      asset,
      signature,
      fee: fee.toString(),
      sent: sendAmount.toString(),
      warning:
        "Withdrawal sent on-chain; ledger finalize lagged. Keep this signature for support.",
      balance: serializeBalance(
        balance.available,
        balance.locked,
        balance.bonus,
      ),
    });
  }
}
