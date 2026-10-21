import { config } from "./config";
import { fairFloat, makePrng } from "./fair";
import {
  KENO_DRAW,
  KENO_POOL,
  SLOT_SYMBOLS,
  WHEEL_SEGMENTS,
  type RpsMove,
} from "./gameConstants";

export {
  KENO_DRAW,
  KENO_POOL,
  SLOT_SYMBOLS,
  WHEEL_SEGMENTS,
  type RpsMove,
} from "./gameConstants";

function applyHouseEdge(raw: number): number {
  // Do not floor at 1.01 — that overpays easy bets and can flip EV to the player.
  const edged = raw * (1 - config.houseEdge);
  return Math.max(0, Math.floor(edged * 1e6) / 1e6);
}

function round2(n: number): number {
  return Math.floor(n * 100) / 100;
}

/**
 * Limbo / Crash multiplier from float ∈ [0, 1).
 *
 * Bustabit-style: ~houseEdge of rounds are instant 1.00x busts (the edge).
 * Remaining rounds use a fair 1/u curve so P(crash ≥ T) = (1 − edge) / T
 * and EV at any cash-out target stays 1 − edge.
 *
 * Old formula `(1−e)/float` with clamp looked “broken” at high edge because
 * many rounds printed exactly 1.00x without a clear instant-bust meaning.
 */
export function limboResult(float: number): number {
  const edge = Math.min(0.5, Math.max(0, config.houseEdge));
  if (float < edge) return 1;
  const u = (float - edge) / (1 - edge);
  if (u <= 0) return 1_000_000;
  return Math.max(1, round2(1 / u));
}

export function evaluateLimbo(
  target: number,
  serverSeed: string,
  clientSeed: string,
  nonce: number,
) {
  if (target < 1.01 || target > 1_000_000) {
    throw new Error("Target must be between 1.01 and 1000000");
  }
  const result = limboResult(fairFloat(serverSeed, clientSeed, nonce));
  const won = result >= target;
  return {
    result,
    won,
    multiplier: won ? target : 0,
    resultPayload: { result, target },
  };
}

/** Crash point — same curve as limbo; cash out before it hits. */
export function evaluateCrash(
  cashoutAt: number,
  serverSeed: string,
  clientSeed: string,
  nonce: number,
) {
  if (cashoutAt < 1.01 || cashoutAt > 1_000_000) {
    throw new Error("Cashout must be between 1.01 and 1000000");
  }
  const crashPoint = limboResult(fairFloat(serverSeed, clientSeed, nonce));
  const won = crashPoint >= cashoutAt;
  return {
    crashPoint,
    won,
    multiplier: won ? cashoutAt : 0,
    resultPayload: { crashPoint, cashoutAt },
  };
}

/**
 * Keno paytable — hypergeometric EV already house-heavy (~37–88% edge).
 * Multipliers are final (no extra applyHouseEdge); keep tops under maxPayoutMult.
 */
export const KENO_PAYTABLE: Record<number, Record<number, number>> = {
  1: { 1: 2.5 },
  2: { 2: 8 },
  3: { 2: 1.4, 3: 20 },
  4: { 2: 1.2, 3: 4, 4: 40 },
  5: { 3: 2, 4: 8, 5: 50 },
  6: { 3: 1.4, 4: 4, 5: 20, 6: 50 },
  7: { 4: 2.5, 5: 10, 6: 40, 7: 50 },
  8: { 4: 1.8, 5: 5, 6: 20, 7: 40, 8: 50 },
  9: { 5: 3, 6: 10, 7: 30, 8: 45, 9: 50 },
  10: { 5: 2, 6: 6, 7: 15, 8: 30, 9: 45, 10: 50 },
};

export function evaluateKeno(
  picks: number[],
  serverSeed: string,
  clientSeed: string,
  nonce: number,
) {
  const unique = [...new Set(picks)].filter((n) => n >= 1 && n <= KENO_POOL);
  if (unique.length < 1 || unique.length > 10) {
    throw new Error("Pick 1 to 10 unique numbers (1–40)");
  }

  const next = makePrng(serverSeed, clientSeed, nonce);
  const bag = Array.from({ length: KENO_POOL }, (_, i) => i + 1);
  for (let i = bag.length - 1; i > 0; i--) {
    const j = next() % (i + 1);
    const tmp = bag[i]!;
    bag[i] = bag[j]!;
    bag[j] = tmp;
  }
  const drawn = bag.slice(0, KENO_DRAW).sort((a, b) => a - b);
  const hits = unique.filter((p) => drawn.includes(p)).length;
  const table = KENO_PAYTABLE[unique.length] ?? {};
  const multiplier = table[hits] ?? 0;
  const won = multiplier > 0;
  return {
    drawn,
    hits,
    won,
    multiplier,
    resultPayload: { drawn, hits, picks: unique, multiplier },
  };
}

const ROULETTE_RED = new Set([
  1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36,
]);

export type RouletteBet =
  | { kind: "color"; color: "red" | "black" }
  | { kind: "parity"; parity: "odd" | "even" }
  | { kind: "number"; number: number };

export function evaluateRoulette(
  bet: RouletteBet,
  serverSeed: string,
  clientSeed: string,
  nonce: number,
) {
  const pocket = Math.floor(fairFloat(serverSeed, clientSeed, nonce) * 37); // 0–36
  const isRed = ROULETTE_RED.has(pocket);
  const color = pocket === 0 ? "green" : isRed ? "red" : "black";

  let won = false;
  let multiplier = 0;

  if (bet.kind === "color") {
    won = color === bet.color;
    multiplier = applyHouseEdge(2);
  } else if (bet.kind === "parity") {
    if (pocket === 0) {
      won = false;
    } else {
      const odd = pocket % 2 === 1;
      won =
        (bet.parity === "odd" && odd) || (bet.parity === "even" && !odd);
    }
    multiplier = applyHouseEdge(2);
  } else {
    if (bet.number < 0 || bet.number > 36) {
      throw new Error("Number must be 0–36");
    }
    won = pocket === bet.number;
    multiplier = applyHouseEdge(36);
  }

  return {
    pocket,
    color,
    won,
    multiplier: won ? multiplier : 0,
    resultPayload: { pocket, color, bet },
  };
}

const RANKS = [
  "A",
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "10",
  "J",
  "Q",
  "K",
] as const;

export function evaluateHiLo(
  guess: "higher" | "lower" | "same",
  serverSeed: string,
  clientSeed: string,
  nonce: number,
) {
  const floatA = fairFloat(serverSeed, clientSeed, nonce);
  const floatB = fairFloat(serverSeed, `${clientSeed}:b`, nonce);
  const start = Math.floor(floatA * 13);
  const next = Math.floor(floatB * 13);

  let won = false;
  if (guess === "higher") won = next > start;
  else if (guess === "lower") won = next < start;
  else won = next === start;

  /**
   * True odds from the revealed start rank (13 faces, with replacement).
   * P(higher)=(12−start)/13, P(lower)=start/13, P(same)=1/13.
   * Flat 2x was exploitable if the UI ever shows the start card first.
   */
  let pWin = 0;
  if (guess === "higher") pWin = (12 - start) / 13;
  else if (guess === "lower") pWin = start / 13;
  else pWin = 1 / 13;

  if (pWin <= 0) {
    return {
      startRank: RANKS[start],
      nextRank: RANKS[next],
      start,
      next,
      won: false,
      multiplier: 0,
      resultPayload: {
        startRank: RANKS[start],
        nextRank: RANKS[next],
        guess,
        impossible: true,
      },
    };
  }

  const multiplier = won ? applyHouseEdge(1 / pWin) : 0;

  return {
    startRank: RANKS[start],
    nextRank: RANKS[next],
    start,
    next,
    won,
    multiplier,
    resultPayload: {
      startRank: RANKS[start],
      nextRank: RANKS[next],
      guess,
      fairChance: round2(pWin * 100),
    },
  };
}

export function evaluateWheel(
  serverSeed: string,
  clientSeed: string,
  nonce: number,
) {
  const idx = Math.floor(
    fairFloat(serverSeed, clientSeed, nonce) * WHEEL_SEGMENTS.length,
  );
  const seg = WHEEL_SEGMENTS[idx]!;
  const won = seg.mult > 0;
  return {
    index: idx,
    label: seg.label,
    won,
    multiplier: seg.mult,
    resultPayload: { index: idx, label: seg.label, multiplier: seg.mult },
  };
}

export function evaluateRps(
  move: RpsMove,
  serverSeed: string,
  clientSeed: string,
  nonce: number,
) {
  const moves: RpsMove[] = ["rock", "paper", "scissors"];
  const house = moves[Math.floor(fairFloat(serverSeed, clientSeed, nonce) * 3)]!;
  let outcome: "win" | "lose" | "draw" = "draw";
  if (move === house) outcome = "draw";
  else if (
    (move === "rock" && house === "scissors") ||
    (move === "paper" && house === "rock") ||
    (move === "scissors" && house === "paper")
  ) {
    outcome = "win";
  } else outcome = "lose";

  // Draw returns (1 − edge) so overall RTP ≈ 1 − edge (was ~5% with full push).
  const drawMult = round2(1 - config.houseEdge);
  const multiplier =
    outcome === "draw"
      ? drawMult
      : outcome === "win"
        ? applyHouseEdge(2)
        : 0;

  return {
    house,
    outcome,
    won: outcome !== "lose",
    multiplier,
    resultPayload: { move, house, outcome },
  };
}

/**
 * Slots: 5 equal symbols × 3 reels.
 * Only 3-of-a-kind pays — pair pays (~48% of spins) made EV ≈ 1.55 (player edge).
 * Target RTP ≈ 0.90: (1/125)*apply(75) + (4/125)*apply(12) ≈ 0.905.
 */
export function evaluateSlots(
  serverSeed: string,
  clientSeed: string,
  nonce: number,
) {
  const next = makePrng(serverSeed, clientSeed, nonce);
  const reels = [0, 1, 2].map(
    () => SLOT_SYMBOLS[next() % SLOT_SYMBOLS.length]!,
  );

  let multiplier = 0;
  if (reels[0] === reels[1] && reels[1] === reels[2]) {
    multiplier =
      reels[0] === "7" ? applyHouseEdge(75) : applyHouseEdge(12);
  }

  const won = multiplier > 0;
  return {
    reels,
    won,
    multiplier,
    resultPayload: { reels, multiplier },
  };
}
