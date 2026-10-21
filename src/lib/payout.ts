import { config } from "./config";
import { toMicroUsdc } from "./money";

/** Clamp multiplier to platform max. */
export function clampMultiplier(mult: number): number {
  if (!Number.isFinite(mult) || mult <= 0) return 0;
  return Math.min(mult, config.maxPayoutMult);
}

/**
 * Final USDC micro payout from stake + multiplier, with max-win clamp.
 */
export function settlePayout(amountMicro: bigint, multiplier: number): bigint {
  const cappedMult = clampMultiplier(multiplier);
  if (cappedMult <= 0) return BigInt(0);
  const raw = BigInt(Math.floor(Number(amountMicro) * cappedMult));
  const maxWin = toMicroUsdc(config.maxWinUsdc);
  return raw > maxWin ? maxWin : raw;
}

export function assertBetAmount(amountUsdc: number) {
  if (!(amountUsdc > 0)) throw new Error("Invalid amount");
  if (amountUsdc > config.maxBetUsdc) {
    throw new Error(`Max bet is ${config.maxBetUsdc} USDC`);
  }
}
