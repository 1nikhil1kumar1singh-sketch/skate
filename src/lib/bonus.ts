import { toMicroUsdc } from "./money";

/** First-deposit match: 100%, min deposit $10, max bonus $100. */
export const BONUS_MIN_DEPOSIT_USDC = 10;
export const BONUS_MAX_USDC = 100;
export const BONUS_MATCH_BPS = 10_000; // 100%

/** Soft cap: at most this fraction of bonus balance may fund one bet (not shown in UI). */
export const BONUS_USE_FRACTION = 0.1;

export function maxBonusFromDeposit(depositMicro: bigint): bigint {
  const minDep = toMicroUsdc(BONUS_MIN_DEPOSIT_USDC);
  if (depositMicro < minDep) return BigInt(0);
  const matched =
    (depositMicro * BigInt(BONUS_MATCH_BPS)) / BigInt(10_000);
  const cap = toMicroUsdc(BONUS_MAX_USDC);
  return matched > cap ? cap : matched;
}

/**
 * Split a stake between real balance and bonus.
 * When useBonus is on, up to 10% of current bonus can cover the bet (silently).
 */
export function splitStakeWithBonus(
  stakeMicro: bigint,
  bonusBalance: bigint,
  useBonus: boolean,
): { fromReal: bigint; fromBonus: bigint } {
  if (!useBonus || bonusBalance <= BigInt(0) || stakeMicro <= BigInt(0)) {
    return { fromReal: stakeMicro, fromBonus: BigInt(0) };
  }
  const maxFromBonus =
    (bonusBalance * BigInt(Math.round(BONUS_USE_FRACTION * 1000))) /
    BigInt(1000);
  const fromBonus = stakeMicro < maxFromBonus ? stakeMicro : maxFromBonus;
  return { fromReal: stakeMicro - fromBonus, fromBonus };
}
