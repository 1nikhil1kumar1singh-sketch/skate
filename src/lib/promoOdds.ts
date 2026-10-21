/**
 * Promo originals — Spin uses pickable prize targets with platform house edge.
 */

import { config } from "./config";

export const SPIN_STAKE_USDC = 1;
export const MYSTERY_STAKE_USDC = 1;

/** Prize targets the player can choose. */
export const SPIN_PRIZES_USDC = [5, 10, 50] as const;
export type SpinPrizeTarget = (typeof SPIN_PRIZES_USDC)[number];

export const SPIN_WEIGHT_TOTAL = 10_000;

/**
 * Spin uses a softer edge than the main book so players don’t bleed out:
 * 10% house edge → RTP 90%. EV ≈ $0.90 per $1 spin on every prize tier.
 */
const SPIN_HOUSE_EDGE = Math.min(0.1, config.houseEdge);

export function spinWinWeight(prizeUsd: SpinPrizeTarget): number {
  const rtp = Math.max(0.05, Math.min(0.95, 1 - SPIN_HOUSE_EDGE));
  const p = (rtp * SPIN_STAKE_USDC) / prizeUsd;
  return Math.max(
    1,
    Math.min(SPIN_WEIGHT_TOTAL - 1, Math.round(p * SPIN_WEIGHT_TOTAL)),
  );
}

export function spinWinChancePct(prizeUsd: SpinPrizeTarget): number {
  return (spinWinWeight(prizeUsd) / SPIN_WEIGHT_TOTAL) * 100;
}

export function isSpinPrizeTarget(n: unknown): n is SpinPrizeTarget {
  return n === 5 || n === 10 || n === 50;
}

/** Roll win/lose for a chosen prize target. */
export function rollSpinPrize(
  roll: number,
  prizeUsd: SpinPrizeTarget,
): number {
  const n =
    ((Math.trunc(roll) % SPIN_WEIGHT_TOTAL) + SPIN_WEIGHT_TOTAL) %
    SPIN_WEIGHT_TOTAL;
  return n < spinWinWeight(prizeUsd) ? prizeUsd : 0;
}

/**
 * Mystery EV ≈ (4500*0 + 3800*1 + 1500*2 + 200*3) / 10000 = 0.74
 * → ~26% edge on $1 boxes.
 */
export const MYSTERY_BOX_PRIZES = [
  { usd: 0, weight: 4500 },
  { usd: 1, weight: 3800 },
  { usd: 2, weight: 1500 },
  { usd: 3, weight: 200 },
] as const;

export const MYSTERY_BOX_WEIGHT_TOTAL = MYSTERY_BOX_PRIZES.reduce(
  (sum, row) => sum + row.weight,
  0,
);

export const MYSTERY_BOX_PRIZE_MIN = 0;
export const MYSTERY_BOX_PRIZE_MAX = 3;

const MYSTERY_FIT_OPTIONS = [3, 2, 1, 0] as const;

export function rollMysteryBoxPrize(roll: number): number {
  const n =
    ((Math.trunc(roll) % MYSTERY_BOX_WEIGHT_TOTAL) + MYSTERY_BOX_WEIGHT_TOTAL) %
    MYSTERY_BOX_WEIGHT_TOTAL;
  let cursor = 0;
  for (const row of MYSTERY_BOX_PRIZES) {
    cursor += row.weight;
    if (n < cursor) return row.usd;
  }
  return 0;
}

function fitPrizeToRemaining(
  prize: number,
  remainingUsd: number,
  options: readonly number[],
): number | null {
  if (remainingUsd < 0) return null;
  if (prize === 0) return 0;
  if (remainingUsd < 1 && prize > 0) return 0;
  const fits = options.filter((usd) => usd <= prize && usd <= remainingUsd);
  return fits[0] ?? 0;
}

export function fitSpinPrizeToRemaining(
  prize: number,
  remainingUsd: number,
): number | null {
  return fitPrizeToRemaining(prize, remainingUsd, [50, 10, 5, 0]);
}

export function fitMysteryBoxPrizeToRemaining(
  prize: number,
  remainingUsd: number,
): number | null {
  return fitPrizeToRemaining(prize, remainingUsd, MYSTERY_FIT_OPTIONS);
}

/**
 * Wheel layout for a chosen target — win slices roughly match chance,
 * rest are miss ($0).
 */
export function spinWheelSegments(prizeUsd: SpinPrizeTarget): number[] {
  const winSlots = Math.max(1, Math.round(spinWinChancePct(prizeUsd) / 10));
  const total = 10;
  const segs: number[] = [];
  for (let i = 0; i < total; i++) {
    segs.push(i < winSlots ? prizeUsd : 0);
  }
  // Spread wins around the wheel for a clearer look
  const out: number[] = new Array(total).fill(0);
  const step = total / winSlots;
  for (let w = 0; w < winSlots; w++) {
    out[Math.floor(w * step) % total] = prizeUsd;
  }
  return out;
}

/** @deprecated Prefer spinWheelSegments(target) */
export const SPIN_WHEEL_SEGMENTS = [5, 0, 10, 0, 5, 0, 50, 0, 10, 0] as const;

/** Legacy multi-prize table (unused by new spin). Kept for any old imports. */
export const PROMO_MINI_GAME_PRIZES = [
  { usd: 0, weight: 8400 },
  { usd: 5, weight: 1600 },
  { usd: 10, weight: 0 },
  { usd: 50, weight: 0 },
] as const;

export const PROMO_MINI_GAME_WEIGHT_TOTAL = SPIN_WEIGHT_TOTAL;

export function rollPromoMiniGamePrize(roll: number): number {
  return rollSpinPrize(roll, 5);
}
