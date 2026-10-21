import { USDC_DECIMALS } from "./config";

export function toMicroUsdc(amount: number | string): bigint {
  const n = typeof amount === "string" ? Number(amount) : amount;
  if (!Number.isFinite(n) || n < 0) {
    throw new Error("Invalid amount");
  }
  return BigInt(Math.round(n * 10 ** USDC_DECIMALS));
}

export function fromMicroUsdc(micro: bigint | number | string): number {
  const value = typeof micro === "bigint" ? micro : BigInt(micro);
  return Number(value) / 10 ** USDC_DECIMALS;
}

/** Ledger is USD-denominated (USDC or USDT) — always show $. */
export function formatUsdc(micro: bigint | number | string): string {
  const n = fromMicroUsdc(micro).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 6,
  });
  return `$${n}`;
}

export function serializeBalance(
  available: bigint,
  locked: bigint = BigInt(0),
  bonus: bigint = BigInt(0),
) {
  return {
    available: available.toString(),
    locked: locked.toString(),
    bonus: bonus.toString(),
    availableDisplay: formatUsdc(available),
    bonusDisplay: formatUsdc(bonus),
    hasBonus: bonus > BigInt(0),
  };
}
