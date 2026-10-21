import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { readSession } from "@/lib/session";
import {
  buildReferralViews,
  referralCodeFor,
  settleDueReferralRewards,
} from "@/lib/referral";
import { serializeBalance } from "@/lib/money";

export async function GET() {
  const session = await readSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const settled = await prisma.$transaction(async (tx) => {
    const result = await settleDueReferralRewards(tx, session.userId);
    const balance = await tx.balance.findUnique({
      where: { userId: session.userId },
    });
    return { ...result, balance };
  });

  const me = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, depositPath: true, displayName: true },
  });
  if (!me) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const invites = await prisma.user.findMany({
    where: { referredById: session.userId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      displayName: true,
      createdAt: true,
      referralRewardEarned: {
        select: {
          amount: true,
          status: true,
          unlockAt: true,
          settledAt: true,
        },
      },
    },
  });

  const { rows, summary } = buildReferralViews(
    invites.map((u) => ({
      id: u.id,
      displayName: u.displayName,
      createdAt: u.createdAt,
      reward: u.referralRewardEarned,
    })),
  );

  const pendingRows = rows.filter((r) => r.status === "pending");
  const code = referralCodeFor(me);

  return NextResponse.json({
    code,
    linkPath: `/?ref=${encodeURIComponent(code)}`,
    summary,
    referrals: rows,
    pendingSettlement: {
      count: summary.pendingCount,
      totalDisplay: summary.pendingDisplay,
      totalUsd: summary.pendingUsd,
      nextUnlockAt: summary.nextUnlockAt,
      nextUnlockDaysLeft: summary.nextUnlockDaysLeft,
      items: pendingRows,
    },
    justSettledCount: settled.settled,
    balance: settled.balance
      ? serializeBalance(
          settled.balance.available,
          settled.balance.locked,
          settled.balance.bonus,
        )
      : null,
  });
}
