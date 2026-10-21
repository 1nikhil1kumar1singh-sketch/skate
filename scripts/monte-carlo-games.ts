/**
 * Monte Carlo using the same evaluate* functions as the API.
 * Target: empirical RTP ≤ ~0.95 for fair-odds games (10% edge + sampling noise).
 */
import { randomBytes } from "crypto";
import {
  evaluateCoinFlip,
  evaluateDice,
} from "../src/lib/games";
import {
  evaluateCrash,
  evaluateHiLo,
  evaluateKeno,
  evaluateLimbo,
  evaluateRoulette,
  evaluateRps,
  evaluateSlots,
  evaluateWheel,
} from "../src/lib/moreGames";
import {
  evaluateMystery,
  evaluateSpin,
} from "../src/lib/games";
import { config } from "../src/lib/config";

const N = 40_000;
const HOUSE = config.houseEdge;

function seed() {
  return randomBytes(16).toString("hex");
}

function run(
  name: string,
  expected: number,
  fn: (i: number) => { won: boolean; multiplier: number },
  rounds = N,
) {
  let ret = 0;
  for (let i = 0; i < rounds; i++) {
    ret += fn(i).multiplier;
  }
  const rtp = ret / rounds;
  const edge = (1 - rtp) * 100;
  const delta = rtp - expected;
  const flag =
    rtp > 1.0 ? "FAIL" : Math.abs(delta) > 0.04 ? "WARN" : "ok";
  console.log(
    `${name.padEnd(22)} n=${String(rounds).padStart(6)}  RTP=${rtp.toFixed(4)}  edge=${edge.toFixed(1).padStart(5)}%  E[RTP]=${expected.toFixed(4)}  Δ=${delta >= 0 ? "+" : ""}${delta.toFixed(4)}  ${flag}`,
  );
  return { name, rtp, flag };
}

console.log(`Monte Carlo using config.houseEdge=${HOUSE}\n`);

const results = [
  run("coinflip", 1 - HOUSE, (i) => {
    const e = evaluateCoinFlip({ side: "heads" }, seed(), seed(), i);
    return { won: e.won, multiplier: e.won ? e.multiplier : 0 };
  }),
  run("dice under50", 1 - HOUSE, (i) => {
    const e = evaluateDice(
      { target: 50, condition: "under" },
      seed(),
      seed(),
      i,
    );
    return { won: e.won, multiplier: e.won ? e.multiplier : 0 };
  }),
  run("limbo 2x", 1 - HOUSE, (i) => {
    const e = evaluateLimbo(2, seed(), seed(), i);
    return { won: e.won, multiplier: e.won ? e.multiplier : 0 };
  }),
  run("crash 2x", 1 - HOUSE, (i) => {
    const e = evaluateCrash(2, seed(), seed(), i);
    return { won: e.won, multiplier: e.won ? e.multiplier : 0 };
  }),
  run("slots", 0.8856, (i) => {
    const e = evaluateSlots(seed(), seed(), i);
    return { won: e.won, multiplier: e.multiplier };
  }),
  run("wheel", 0.9, (i) => {
    const e = evaluateWheel(seed(), seed(), i);
    return { won: e.won, multiplier: e.multiplier };
  }),
  run("roulette red", (18 / 37) * (2 * (1 - HOUSE)), (i) => {
    const e = evaluateRoulette(
      { kind: "color", color: "red" },
      seed(),
      seed(),
      i,
    );
    return { won: e.won, multiplier: e.multiplier };
  }),
  run("rps", 1 - HOUSE, (i) => {
    const e = evaluateRps("rock", seed(), seed(), i);
    return { won: e.won, multiplier: e.multiplier };
  }),
  run("hilo higher", (12 / 13) * (1 - HOUSE), (i) => {
    const e = evaluateHiLo("higher", seed(), seed(), i);
    return { won: e.won, multiplier: e.multiplier };
  }),
  run(
    "keno 5",
    0.25,
    (i) => {
      const e = evaluateKeno([1, 2, 3, 4, 5], seed(), seed(), i);
      return { won: e.won, multiplier: e.multiplier };
    },
    20_000,
  ),
  run(
    "spin $1",
    0.28,
    (i) => {
      const roll = Math.floor(
        Number.parseInt(seed().slice(0, 8), 16) % 10000,
      );
      const e = evaluateSpin(roll);
      return { won: e.won, multiplier: e.prizeUsd };
    },
    20_000,
  ),
  run(
    "mystery $1",
    0.74,
    (i) => {
      const roll = Math.floor(
        Number.parseInt(seed().slice(0, 8), 16) % 10000,
      );
      const e = evaluateMystery(roll);
      return { won: e.won, multiplier: e.prizeUsd };
    },
    20_000,
  ),
];

const fails = results.filter((r) => r.flag === "FAIL" || r.rtp > 1);
if (fails.length) {
  console.error("\n❌ Player-edge detected in Monte Carlo:", fails);
  process.exit(1);
}
console.log("\n✅ Monte Carlo: no game exceeded RTP 1.0");
