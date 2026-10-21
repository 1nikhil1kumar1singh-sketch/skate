import type { Prisma } from "@prisma/client";
import { maxBonusFromDeposit } from "./bonus";

type Tx = Prisma.TransactionClient;

/**
 * 100% match for the platform's first user only (min deposit $10, max bonus $100).
 * Idempotent via User.firstDepositBonusClaimed.
 */
export async function grantFirstDepositBonus(
  tx: Tx,
  userId: string,
  depositMicro: bigint,
): Promise<bigint> {
  const firstUser = await tx.user.findFirst({
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });
  if (!firstUser || firstUser.id !== userId) return BigInt(0);

  const user = await tx.user.findUnique({
    where: { id: userId },
    select: { firstDepositBonusClaimed: true },
  });
  if (!user || user.firstDepositBonusClaimed) return BigInt(0);

  const bonus = maxBonusFromDeposit(depositMicro);
  if (bonus <= BigInt(0)) return BigInt(0);

  await tx.user.update({
    where: { id: userId },
    data: { firstDepositBonusClaimed: true },
  });
  await tx.balance.update({
    where: { userId },
    data: { bonus: { increment: bonus } },
  });
  return bonus;
}
