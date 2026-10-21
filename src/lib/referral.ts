import type { Prisma, PrismaClient } from "@prisma/client";
import { toMicroUsdc, fromMicroUsdc, formatUsdc } from "./money";

export const REFERRAL_REWARD_USD = 5;
export const REFERRAL_UNLOCK_DAYS = 30;
export const REFERRAL_STORAGE_KEY = "klasshi_ref";

export const REFERRAL_REWARD_MICRO = toMicroUsdc(REFERRAL_REWARD_USD);

export const REFERRAL_RULES = [
  `$${REFERRAL_REWARD_USD} credit when a referred friend plays any game.`,
  `Credit unlocks ${REFERRAL_UNLOCK_DAYS} days after it is earned.`,
  "Self-referrals and multi-accounts are void.",
  "Offers may be changed or ended at any time.",
] as const;

export type ReferralStatus = "joined" | "pending" | "settled" | "void";

export type ReferralRowView = {
  id: string;
  displayName: string;
  joinedAt: string;
  status: ReferralStatus;
  rewardUsd: number;
  rewardDisplay: string;
  unlockAt: string | null;
  settledAt: string | null;
  daysLeft: number | null;
};

export type ReferralSummaryView = {
  invites: number;
  pendingCount: number;
  pendingUsd: number;
  pendingDisplay: string;
  settledUsd: number;
  settledDisplay: string;
  nextUnlockAt: string | null;
  nextUnlockDaysLeft: number | null;
};

type Tx = Prisma.TransactionClient;
type Db = Tx | PrismaClient;

export function referralCodeFor(user: {
  depositPath?: string | null;
  id: string;
}) {
  return (user.depositPath || user.id.slice(0, 8)).toLowerCase();
}

export function unlockDateFrom(qualifiedAt: Date) {
  const d = new Date(qualifiedAt);
  d.setUTCDate(d.getUTCDate() + REFERRAL_UNLOCK_DAYS);
  return d;
}

export function daysLeftUntil(unlockAt: Date, now = new Date()) {
  const ms = unlockAt.getTime() - now.getTime();
  if (ms <= 0) return 0;
  return Math.ceil(ms / (24 * 60 * 60 * 1000));
}

/** Resolve invite code → referrer user id (depositPath or id prefix). */
export async function findReferrerIdByCode(
  db: Db,
  code: string,
  excludeUserId?: string,
): Promise<string | null> {
  const c = code.trim().toLowerCase();
  if (!c || c.length < 3) return null;

  const byPath = await db.user.findFirst({
    where: { depositPath: c },
    select: { id: true },
  });
  if (byPath && byPath.id !== excludeUserId) return byPath.id;

  const byId = await db.user.findFirst({
    where: { id: { startsWith: c } },
    select: { id: true },
  });
  if (byId && byId.id !== excludeUserId) return byId.id;

  return null;
}

/**
 * After a referred player places any real bet / starts mines:
 * create pending $5 reward for their referrer (once).
 */
export async function maybeQualifyReferral(tx: Tx, refereeId: string) {
  const referee = await tx.user.findUnique({
    where: { id: refereeId },
    select: { id: true, referredById: true },
  });
  if (!referee?.referredById) return null;
  if (referee.referredById === refereeId) return null;

  const existing = await tx.referralReward.findUnique({
    where: { refereeId },
  });
  if (existing) return existing;

  const now = new Date();
  return tx.referralReward.create({
    data: {
      referrerId: referee.referredById,
      refereeId,
      amount: REFERRAL_REWARD_MICRO,
      status: "pending",
      qualifiedAt: now,
      unlockAt: unlockDateFrom(now),
    },
  });
}

/** Move unlocked pending rewards into available balance. */
export async function settleDueReferralRewards(
  tx: Tx,
  referrerId: string,
  now = new Date(),
) {
  const due = await tx.referralReward.findMany({
    where: {
      referrerId,
      status: "pending",
      unlockAt: { lte: now },
    },
  });
  if (due.length === 0) return { settled: 0, amount: BigInt(0) };

  let total = BigInt(0);
  for (const row of due) {
    await tx.referralReward.update({
      where: { id: row.id },
      data: { status: "settled", settledAt: now },
    });
    await tx.balance.update({
      where: { userId: referrerId },
      data: { available: { increment: row.amount } },
    });
    total += row.amount;
  }
  return { settled: due.length, amount: total };
}

export function buildReferralViews(
  invites: Array<{
    id: string;
    displayName: string | null;
    createdAt: Date;
    reward: {
      amount: bigint;
      status: string;
      unlockAt: Date;
      settledAt: Date | null;
    } | null;
  }>,
  now = new Date(),
): { rows: ReferralRowView[]; summary: ReferralSummaryView } {
  let pendingUsd = 0;
  let settledUsd = 0;
  let pendingCount = 0;
  const pendingUnlocks: Date[] = [];

  const rows: ReferralRowView[] = invites.map((u) => {
    let status: ReferralStatus = "joined";
    let unlockAt: string | null = null;
    let settledAt: string | null = null;
    let daysLeft: number | null = null;
    let rewardUsd = REFERRAL_REWARD_USD;

    if (u.reward) {
      rewardUsd = fromMicroUsdc(u.reward.amount);
      if (u.reward.status === "settled") {
        status = "settled";
        settledAt = u.reward.settledAt?.toISOString() ?? null;
        settledUsd += rewardUsd;
      } else if (u.reward.status === "void") {
        status = "void";
      } else {
        status = "pending";
        unlockAt = u.reward.unlockAt.toISOString();
        daysLeft = daysLeftUntil(u.reward.unlockAt, now);
        pendingUsd += rewardUsd;
        pendingCount += 1;
        pendingUnlocks.push(u.reward.unlockAt);
      }
    }

    return {
      id: u.id,
      displayName: u.displayName?.trim() || "Player",
      joinedAt: u.createdAt.toISOString(),
      status,
      rewardUsd,
      rewardDisplay: formatUsdc(toMicroUsdc(rewardUsd)),
      unlockAt,
      settledAt,
      daysLeft,
    };
  });

  const nextUnlockAt =
    pendingUnlocks.length > 0
      ? pendingUnlocks.reduce((a, b) => (a < b ? a : b))
      : null;

  return {
    rows,
    summary: {
      invites: invites.length,
      pendingCount,
      pendingUsd,
      pendingDisplay: formatUsdc(toMicroUsdc(pendingUsd)),
      settledUsd,
      settledDisplay: formatUsdc(toMicroUsdc(settledUsd)),
      nextUnlockAt: nextUnlockAt ? nextUnlockAt.toISOString() : null,
      nextUnlockDaysLeft: nextUnlockAt
        ? daysLeftUntil(nextUnlockAt, now)
        : null,
    },
  };
}
