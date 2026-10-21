import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { readSession } from "@/lib/session";
import { formatUsdc } from "@/lib/money";

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 50;

export async function GET(req: NextRequest) {
  const session = await readSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sp = req.nextUrl.searchParams;
  const page = Math.max(1, Number(sp.get("page") ?? "1") || 1);
  const limit = Math.min(
    MAX_LIMIT,
    Math.max(1, Number(sp.get("limit") ?? String(DEFAULT_LIMIT)) || DEFAULT_LIMIT),
  );
  const skip = (page - 1) * limit;
  const where = { userId: session.userId };

  // Unified activity feed (deposits + withdrawals), newest first
  const [depositsAll, withdrawalsAll] = await Promise.all([
    prisma.deposit.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 500,
    }),
    prisma.withdrawal.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 500,
    }),
  ]);

  const merged = [
    ...depositsAll.map((d) => ({
      id: d.id,
      kind: "deposit" as const,
      amount: formatUsdc(d.amount),
      amountMicro: d.amount.toString(),
      signature: d.signature,
      status: d.status,
      createdAt: d.createdAt,
      toAddress: null as string | null,
    })),
    ...withdrawalsAll.map((w) => ({
      id: w.id,
      kind: "withdrawal" as const,
      amount: formatUsdc(w.amount),
      amountMicro: w.amount.toString(),
      signature: w.signature,
      status: w.status,
      createdAt: w.createdAt,
      toAddress: w.toAddress,
    })),
  ].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  const total = merged.length;
  const items = merged.slice(skip, skip + limit);

  // Keep legacy arrays for any old clients (current page slice only)
  const deposits = items
    .filter((i) => i.kind === "deposit")
    .map(({ kind: _k, toAddress: _t, ...rest }) => rest);
  const withdrawals = items
    .filter((i) => i.kind === "withdrawal")
    .map(({ kind: _k, ...rest }) => rest);

  return NextResponse.json({
    page,
    limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / limit)),
    items,
    deposits,
    withdrawals,
  });
}
