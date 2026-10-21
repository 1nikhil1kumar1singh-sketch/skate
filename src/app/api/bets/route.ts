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
  const [total, bets] = await Promise.all([
    prisma.bet.count({ where }),
    prisma.bet.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
  ]);

  return NextResponse.json({
    page,
    limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / limit)),
    bets: bets.map((b) => ({
      id: b.id,
      game: b.game,
      amount: formatUsdc(b.amount),
      payout: formatUsdc(b.payout),
      profit: formatUsdc(b.profit),
      won: b.won,
      choice: JSON.parse(b.choice),
      result: JSON.parse(b.result),
      serverSeed: b.serverSeed,
      serverSeedHash: b.serverSeedHash,
      clientSeed: b.clientSeed,
      nonce: b.nonce,
      createdAt: b.createdAt.toISOString(),
    })),
  });
}
