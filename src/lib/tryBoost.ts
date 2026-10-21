/**
 * Try / practice mode: freer wins so people can explore games.
 * ~2.5× payout on wins, and many losses flip into a 2–3× hit.
 */
export const TRY_PAYOUT_MULT = 2.5;
export const TRY_FORCE_WIN_CHANCE = 0.62;
export const TRY_FORCE_MULT_MIN = 2;
export const TRY_FORCE_MULT_MAX = 3;

export type TryEval = {
  won: boolean;
  multiplier: number;
  result: Record<string, unknown>;
  payoutOverride?: bigint;
};

function randBetween(min: number, max: number) {
  return min + Math.random() * (max - min);
}

/** Boost a settled evaluation for try mode (not used for live money). */
export function applyTryBoost(ev: TryEval): TryEval {
  if (ev.won) {
    if (ev.payoutOverride != null) {
      const boosted = BigInt(
        Math.floor(Number(ev.payoutOverride) * TRY_PAYOUT_MULT),
      );
      return {
        ...ev,
        multiplier: ev.multiplier * TRY_PAYOUT_MULT,
        payoutOverride: boosted,
        result: { ...ev.result, tryMode: true },
      };
    }
    const mult = Math.max(TRY_FORCE_MULT_MIN, ev.multiplier * TRY_PAYOUT_MULT);
    return {
      ...ev,
      multiplier: Math.round(mult * 100) / 100,
      result: { ...ev.result, tryMode: true },
    };
  }

  if (Math.random() < TRY_FORCE_WIN_CHANCE) {
    const mult =
      Math.round(randBetween(TRY_FORCE_MULT_MIN, TRY_FORCE_MULT_MAX) * 100) /
      100;
    return {
      won: true,
      multiplier: mult,
      result: { ...ev.result, tryMode: true, tryBoost: true },
    };
  }

  return { ...ev, result: { ...ev.result, tryMode: true } };
}

/** Mines ladder multipliers × try boost (player-facing cashout). */
export function tryBoostLadder(ladder: number[]): number[] {
  return ladder.map(
    (m) => Math.round(m * TRY_PAYOUT_MULT * 100) / 100,
  );
}

/** Soften mine hits in try mode — often treat as a gem instead. */
export function trySoftMineHit(): boolean {
  return Math.random() < TRY_FORCE_WIN_CHANCE;
}
