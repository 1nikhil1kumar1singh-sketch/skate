import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { isAdminAuthorized } from "@/lib/adminAuth";
import { toMicroUsdc } from "@/lib/money";
import { config } from "@/lib/config";
import {
  getConnection,
  getTokenBalance,
  getTreasuryKeypair,
  isLiveWalletReady,
} from "@/lib/solana";

function micro(n: bigint | number | null | undefined) {
  return (n ?? BigInt(0)).toString();
}

export async function GET(req: NextRequest) {
  if (!isAdminAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const todayStart = new Date(new Date().toISOString().slice(0, 10));

  const [
    views7d,
    viewsToday,
    openTickets,
    topPaths,
    recentTickets,
    users,
    deposits,
    withdrawals,
    recentBets,
    userCount,
    bannedCount,
    depositAgg,
    withdrawalAgg,
    balanceAgg,
    betAgg,
  ] = await Promise.all([
    prisma.pageView.count({ where: { createdAt: { gte: since } } }),
    prisma.pageView.count({ where: { createdAt: { gte: todayStart } } }),
    prisma.supportTicket.count({ where: { status: "open" } }),
    prisma.pageView.groupBy({
      by: ["path"],
      where: { createdAt: { gte: since } },
      _count: { path: true },
      orderBy: { _count: { path: "desc" } },
      take: 12,
    }),
    prisma.supportTicket.findMany({
      orderBy: { createdAt: "desc" },
      take: 40,
    }),
    prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      take: 200,
      select: {
        id: true,
        email: true,
        displayName: true,
        walletAddress: true,
        depositAddress: true,
        depositPath: true,
        banned: true,
        firstDepositBonusClaimed: true,
        createdAt: true,
        updatedAt: true,
        balance: {
          select: { available: true, locked: true, bonus: true },
        },
        _count: {
          select: {
            bets: true,
            deposits: true,
            withdrawals: true,
          },
        },
      },
    }),
    prisma.deposit.findMany({
      orderBy: { createdAt: "desc" },
      take: 40,
      include: {
        user: { select: { id: true, email: true, displayName: true } },
      },
    }),
    prisma.withdrawal.findMany({
      orderBy: { createdAt: "desc" },
      take: 40,
      include: {
        user: { select: { id: true, email: true, displayName: true } },
      },
    }),
    prisma.bet.findMany({
      orderBy: { createdAt: "desc" },
      take: 40,
      include: {
        user: { select: { id: true, email: true, displayName: true } },
      },
    }),
    prisma.user.count(),
    prisma.user.count({ where: { banned: true } }),
    prisma.deposit.aggregate({ _sum: { amount: true }, _count: true }),
    prisma.withdrawal.aggregate({ _sum: { amount: true }, _count: true }),
    prisma.balance.aggregate({
      _sum: { available: true, locked: true, bonus: true },
    }),
    prisma.bet.aggregate({
      _sum: { amount: true, payout: true },
      _count: true,
    }),
  ]);

  let treasury: {
    address: string | null;
    sol: number | null;
    usdc: string | null;
    usdt: string | null;
    live: boolean;
  } = {
    address: config.solana.treasuryAddress || null,
    sol: null,
    usdc: null,
    usdt: null,
    live: isLiveWalletReady(),
  };

  try {
    const { PublicKey } = await import("@solana/web3.js");
    const address =
      getTreasuryKeypair()?.publicKey.toBase58() ??
      config.solana.treasuryAddress;
    if (address) {
      const connection = getConnection();
      const solLamports = await connection.getBalance(new PublicKey(address));
      const usdc = await getTokenBalance(address, config.solana.usdcMint);
      const usdt = config.solana.usdtMint
        ? await getTokenBalance(address, config.solana.usdtMint)
        : BigInt(0);
      treasury = {
        address,
        sol: solLamports / 1e9,
        usdc: usdc.toString(),
        usdt: usdt.toString(),
        live: isLiveWalletReady(),
      };
    }
  } catch {
    /* RPC optional */
  }

  return NextResponse.json({
    traffic: {
      viewsToday,
      views7d,
      topPaths: topPaths.map((r) => ({
        path: r.path,
        count: r._count.path,
      })),
    },
    support: {
      openTickets,
      tickets: recentTickets,
    },
    platform: {
      userCount,
      bannedCount,
      ledgerAvailable: micro(balanceAgg._sum.available),
      ledgerLocked: micro(balanceAgg._sum.locked),
      ledgerBonus: micro(balanceAgg._sum.bonus),
      depositsTotal: micro(depositAgg._sum.amount),
      depositsCount: depositAgg._count,
      withdrawalsTotal: micro(withdrawalAgg._sum.amount),
      withdrawalsCount: withdrawalAgg._count,
      betsCount: betAgg._count,
      wageredTotal: micro(betAgg._sum.amount),
      paidTotal: micro(betAgg._sum.payout),
    },
    treasury,
    users: users.map((u) => ({
      id: u.id,
      email: u.email,
      displayName: u.displayName,
      walletAddress: u.walletAddress,
      depositAddress: u.depositAddress,
      depositPath: u.depositPath,
      banned: u.banned,
      firstDepositBonusClaimed: u.firstDepositBonusClaimed,
      createdAt: u.createdAt,
      updatedAt: u.updatedAt,
      available: micro(u.balance?.available),
      locked: micro(u.balance?.locked),
      bonus: micro(u.balance?.bonus),
      bets: u._count.bets,
      deposits: u._count.deposits,
      withdrawals: u._count.withdrawals,
    })),
    deposits: deposits.map((d) => ({
      id: d.id,
      amount: micro(d.amount),
      status: d.status,
      signature: d.signature,
      createdAt: d.createdAt,
      userId: d.userId,
      email: d.user.email,
      displayName: d.user.displayName,
    })),
    withdrawals: withdrawals.map((w) => ({
      id: w.id,
      amount: micro(w.amount),
      status: w.status,
      signature: w.signature,
      toAddress: w.toAddress,
      createdAt: w.createdAt,
      userId: w.userId,
      email: w.user.email,
      displayName: w.user.displayName,
    })),
    bets: recentBets.map((b) => ({
      id: b.id,
      game: b.game,
      amount: micro(b.amount),
      payout: micro(b.payout),
      profit: micro(b.profit),
      won: b.won,
      createdAt: b.createdAt,
      userId: b.userId,
      email: b.user.email,
      displayName: b.user.displayName,
    })),
  });
}

const actionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("adjust"),
    userId: z.string().min(1),
    field: z.enum(["available", "bonus", "locked"]),
    /** Signed USD amount — positive credits, negative debits */
    amountUsd: z.number().refine((n) => n !== 0 && Number.isFinite(n)),
    note: z.string().max(200).optional(),
  }),
  z.object({
    action: z.literal("ban"),
    userId: z.string().min(1),
  }),
  z.object({
    action: z.literal("unban"),
    userId: z.string().min(1),
  }),
  z.object({
    action: z.literal("ticket"),
    id: z.string().min(1),
    status: z.enum(["open", "closed"]),
  }),
]);

export async function POST(req: NextRequest) {
  if (!isAdminAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = actionSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const body = parsed.data;

  if (body.action === "ticket") {
    await prisma.supportTicket.update({
      where: { id: body.id },
      data: { status: body.status },
    });
    return NextResponse.json({ ok: true });
  }

  if (body.action === "ban" || body.action === "unban") {
    await prisma.user.update({
      where: { id: body.userId },
      data: { banned: body.action === "ban" },
    });
    return NextResponse.json({ ok: true, banned: body.action === "ban" });
  }

  // adjust balance
  const delta = toMicroUsdc(Math.abs(body.amountUsd));
  const signed = body.amountUsd < 0 ? -delta : delta;

  const balance = await prisma.balance.findUnique({
    where: { userId: body.userId },
  });
  if (!balance) {
    return NextResponse.json({ error: "User has no balance row" }, { status: 404 });
  }

  const current = balance[body.field];
  const next = current + signed;
  if (next < BigInt(0)) {
    return NextResponse.json(
      { error: `Cannot set ${body.field} below zero` },
      { status: 400 },
    );
  }

  const updated = await prisma.balance.update({
    where: { userId: body.userId },
    data: { [body.field]: next },
  });

  // Audit trail as zero-chain deposit/withdrawal note when adjusting available
  if (body.field === "available" && signed > BigInt(0)) {
    await prisma.deposit
      .create({
        data: {
          userId: body.userId,
          amount: signed,
          signature: `admin-credit:${Date.now()}:${body.userId}`,
          status: `admin:${body.note?.slice(0, 80) || "credit"}`,
        },
      })
      .catch(() => {
        /* ignore */
      });
  } else if (body.field === "available" && signed < BigInt(0)) {
    await prisma.withdrawal
      .create({
        data: {
          userId: body.userId,
          amount: -signed,
          toAddress: "admin",
          signature: `admin-debit:${Date.now()}:${body.userId}`,
          status: `admin:${body.note?.slice(0, 80) || "debit"}`,
        },
      })
      .catch(() => {
        /* ignore */
      });
  }

  return NextResponse.json({
    ok: true,
    available: updated.available.toString(),
    locked: updated.locked.toString(),
    bonus: updated.bonus.toString(),
  });
}

export async function PATCH(req: NextRequest) {
  if (!isAdminAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = (await req.json()) as { id?: string; status?: string };
  if (!body.id || (body.status !== "open" && body.status !== "closed")) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  await prisma.supportTicket.update({
    where: { id: body.id },
    data: { status: body.status },
  });
  return NextResponse.json({ ok: true });
}
