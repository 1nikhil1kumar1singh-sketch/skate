import { config } from "./config";
import { fairCoin, fairRoll, type CoinSide } from "./fair";
import {
  fitMysteryBoxPrizeToRemaining,
  fitSpinPrizeToRemaining,
  isSpinPrizeTarget,
  rollMysteryBoxPrize,
  rollSpinPrize,
  type SpinPrizeTarget,
} from "./promoOdds";

export type DiceChoice = {
  target: number;
  condition: "over" | "under";
};

export type CoinFlipChoice = {
  side: CoinSide;
};

export {
  MINES_GRID,
  MINES_COLS,
  MINES_HOUSE_EDGE_BP,
  minesLadder,
} from "./minesMath";

function applyHouseEdge(rawMultiplier: number): number {
  // Do not floor at 1.01 — that overpays easy bets and can flip EV to the player.
  const edged = rawMultiplier * (1 - config.houseEdge);
  return Math.max(0, Math.floor(edged * 1e6) / 1e6);
}

export function diceWinChance(choice: DiceChoice): number {
  if (choice.condition === "over") {
    return (99.99 - choice.target) / 100;
  }
  return choice.target / 100;
}

export function diceMultiplier(choice: DiceChoice): number {
  const chance = diceWinChance(choice);
  if (chance <= 0 || chance >= 1) {
    throw new Error("Invalid dice target");
  }
  return applyHouseEdge(1 / chance);
}

export function evaluateDice(
  choice: DiceChoice,
  serverSeed: string,
  clientSeed: string,
  nonce: number,
) {
  if (choice.target < 2 || choice.target > 98) {
    throw new Error("Target must be between 2 and 98");
  }
  const roll = fairRoll(serverSeed, clientSeed, nonce);
  const won =
    choice.condition === "over" ? roll > choice.target : roll < choice.target;
  const multiplier = won ? diceMultiplier(choice) : 0;
  return { roll, won, multiplier, result: { roll } };
}

export function evaluateCoinFlip(
  choice: CoinFlipChoice,
  serverSeed: string,
  clientSeed: string,
  nonce: number,
) {
  const side = fairCoin(serverSeed, clientSeed, nonce);
  const won = side === choice.side;
  const multiplier = won ? applyHouseEdge(2) : 0;
  return { side, won, multiplier, result: { side } };
}

export function payoutMicro(
  amount: bigint,
  multiplier: number,
  won: boolean,
): bigint {
  if (!won) return BigInt(0);
  // Prefer settlePayout from @/lib/payout in API routes (applies caps).
  const scaled = Number(amount) * multiplier;
  return BigInt(Math.floor(scaled));
}

export function evaluateSpin(
  roll: number,
  targetPrize: SpinPrizeTarget = 5,
  poolRemainingUsd = 10_000,
) {
  const target = isSpinPrizeTarget(targetPrize) ? targetPrize : 5;
  const raw = rollSpinPrize(roll, target);
  const prize = fitSpinPrizeToRemaining(raw, poolRemainingUsd) ?? 0;
  return {
    raw,
    prizeUsd: prize,
    targetPrize: target,
    won: prize > 0,
    result: { prizeUsd: prize, targetPrize: target, raw },
  };
}

export function evaluateMystery(roll: number, poolRemainingUsd = 10_000) {
  const raw = rollMysteryBoxPrize(roll);
  const prize = fitMysteryBoxPrizeToRemaining(raw, poolRemainingUsd) ?? 0;
  return {
    raw,
    prizeUsd: prize,
    won: prize > 0,
    result: { prizeUsd: prize, raw },
  };
}
