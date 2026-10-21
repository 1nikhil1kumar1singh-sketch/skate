import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  evaluateCoinFlip,
  evaluateDice,
  evaluateMystery,
  evaluateSpin,
  type CoinFlipChoice,
  type DiceChoice,
} from "@/lib/games";
import {
  evaluateCrash,
  evaluateHiLo,
  evaluateKeno,
  evaluateLimbo,
  evaluateRoulette,
  evaluateRps,
  evaluateSlots,
  evaluateWheel,
  type RouletteBet,
  type RpsMove,
} from "@/lib/moreGames";
import {
  fairFloat,
  generateClientSeed,
  generateServerSeed,
  hashServerSeed,
} from "@/lib/fair";
import { MYSTERY_STAKE_USDC, SPIN_STAKE_USDC } from "@/lib/promoOdds";
import { config } from "@/lib/config";
import { assertBetAmount, clampMultiplier, settlePayout } from "@/lib/payout";
import { formatUsdc, toMicroUsdc } from "@/lib/money";
import { applyTryBoost, type TryEval } from "@/lib/tryBoost";

const maxBet = config.maxBetUsdc;

const bodySchema = z.discriminatedUnion("game", [
  z.object({
    game: z.literal("dice"),
    amount: z.number().positive().max(maxBet),
    target: z.number().min(2).max(98),
    condition: z.enum(["over", "under"]),
  }),
  z.object({
    game: z.literal("coinflip"),
    amount: z.number().positive().max(maxBet),
    side: z.enum(["heads", "tails"]),
  }),
  z.object({
    game: z.literal("spin"),
    prize: z.union([z.literal(5), z.literal(10), z.literal(50)]).optional(),
  }),
  z.object({ game: z.literal("mystery") }),
  z.object({
    game: z.literal("limbo"),
    amount: z.number().positive().max(maxBet),
    target: z.number().min(1.01).max(config.maxPayoutMult),
  }),
  z.object({
    game: z.literal("crash"),
    amount: z.number().positive().max(maxBet),
    cashoutAt: z.number().min(1.01).max(config.maxPayoutMult),
  }),
  z.object({
    game: z.literal("keno"),
    amount: z.number().positive().max(maxBet),
    picks: z.array(z.number().int().min(1).max(40)).min(1).max(10),
  }),
  z.object({
    game: z.literal("roulette"),
    amount: z.number().positive().max(maxBet),
    kind: z.enum(["color", "parity", "number"]),
    color: z.enum(["red", "black"]).optional(),
    parity: z.enum(["odd", "even"]).optional(),
    number: z.number().int().min(0).max(36).optional(),
  }),
  z.object({
    game: z.literal("hilo"),
    amount: z.number().positive().max(maxBet),
    guess: z.enum(["higher", "lower", "same"]),
  }),
  z.object({
    game: z.literal("wheel"),
    amount: z.number().positive().max(maxBet),
  }),
  z.object({
    game: z.literal("rps"),
    amount: z.number().positive().max(maxBet),
    move: z.enum(["rock", "paper", "scissors"]),
  }),
  z.object({
    game: z.literal("slots"),
    amount: z.number().positive().max(maxBet),
  }),
]);

/** Practice bets — no wallet / balance; any stake within game limits. */
export async function POST(req: NextRequest) {
  const raw = (await req.json()) as Record<string, unknown>;
  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid bet" },
      { status: 400 },
    );
  }

  const input = parsed.data;
  const serverSeed = generateServerSeed();
  const clientSeed = generateClientSeed();
  const nonce = Math.floor(Math.random() * 1_000_000);
  const serverSeedHash = hashServerSeed(serverSeed);

  try {
    let amount: bigint;
    let evaluation: TryEval;
    let choice: Record<string, unknown>;

    switch (input.game) {
      case "dice": {
        amount = toMicroUsdc(input.amount);
        const diceChoice: DiceChoice = {
          target: input.target,
          condition: input.condition,
        };
        const ev = evaluateDice(diceChoice, serverSeed, clientSeed, nonce);
        evaluation = {
          won: ev.won,
          multiplier: ev.multiplier,
          result: ev.result,
        };
        choice = diceChoice;
        break;
      }
      case "coinflip": {
        amount = toMicroUsdc(input.amount);
        const flip: CoinFlipChoice = { side: input.side };
        const ev = evaluateCoinFlip(flip, serverSeed, clientSeed, nonce);
        evaluation = {
          won: ev.won,
          multiplier: ev.multiplier,
          result: ev.result,
        };
        choice = flip;
        break;
      }
      case "spin": {
        amount = toMicroUsdc(SPIN_STAKE_USDC);
        const roll = Math.floor(
          fairFloat(serverSeed, clientSeed, nonce) * 10000,
        );
        const prizeTarget = input.prize ?? 5;
        const ev = evaluateSpin(roll, prizeTarget);
        evaluation = {
          won: ev.won,
          multiplier: ev.prizeUsd / SPIN_STAKE_USDC,
          result: ev.result,
          payoutOverride: toMicroUsdc(ev.prizeUsd),
        };
        choice = { stake: SPIN_STAKE_USDC, prize: prizeTarget };
        break;
      }
      case "mystery": {
        amount = toMicroUsdc(MYSTERY_STAKE_USDC);
        const roll = Math.floor(
          fairFloat(serverSeed, clientSeed, nonce) * 10000,
        );
        const ev = evaluateMystery(roll);
        evaluation = {
          won: ev.won,
          multiplier: ev.prizeUsd / MYSTERY_STAKE_USDC,
          result: ev.result,
          payoutOverride: toMicroUsdc(ev.prizeUsd),
        };
        choice = { stake: MYSTERY_STAKE_USDC };
        break;
      }
      case "limbo": {
        amount = toMicroUsdc(input.amount);
        const ev = evaluateLimbo(input.target, serverSeed, clientSeed, nonce);
        evaluation = {
          won: ev.won,
          multiplier: ev.won ? ev.multiplier : 0,
          result: ev.resultPayload,
        };
        choice = { target: input.target };
        break;
      }
      case "crash": {
        amount = toMicroUsdc(input.amount);
        const ev = evaluateCrash(
          input.cashoutAt,
          serverSeed,
          clientSeed,
          nonce,
        );
        evaluation = {
          won: ev.won,
          multiplier: ev.won ? ev.multiplier : 0,
          result: ev.resultPayload,
        };
        choice = { cashoutAt: input.cashoutAt };
        break;
      }
      case "keno": {
        amount = toMicroUsdc(input.amount);
        const ev = evaluateKeno(input.picks, serverSeed, clientSeed, nonce);
        evaluation = {
          won: ev.won,
          multiplier: ev.multiplier,
          result: ev.resultPayload,
        };
        choice = { picks: input.picks };
        break;
      }
      case "roulette": {
        amount = toMicroUsdc(input.amount);
        let bet: RouletteBet;
        if (input.kind === "color") {
          if (!input.color) throw new Error("Color required");
          bet = { kind: "color", color: input.color };
        } else if (input.kind === "parity") {
          if (!input.parity) throw new Error("Parity required");
          bet = { kind: "parity", parity: input.parity };
        } else {
          if (input.number == null) throw new Error("Number required");
          bet = { kind: "number", number: input.number };
        }
        const ev = evaluateRoulette(bet, serverSeed, clientSeed, nonce);
        evaluation = {
          won: ev.won,
          multiplier: ev.multiplier,
          result: ev.resultPayload,
        };
        choice = bet;
        break;
      }
      case "hilo": {
        amount = toMicroUsdc(input.amount);
        const ev = evaluateHiLo(input.guess, serverSeed, clientSeed, nonce);
        evaluation = {
          won: ev.won,
          multiplier: ev.multiplier,
          result: ev.resultPayload,
        };
        choice = { guess: input.guess };
        break;
      }
      case "wheel": {
        amount = toMicroUsdc(input.amount);
        const ev = evaluateWheel(serverSeed, clientSeed, nonce);
        evaluation = {
          won: ev.won,
          multiplier: ev.multiplier,
          result: ev.resultPayload,
        };
        choice = {};
        break;
      }
      case "rps": {
        amount = toMicroUsdc(input.amount);
        const ev = evaluateRps(
          input.move as RpsMove,
          serverSeed,
          clientSeed,
          nonce,
        );
        evaluation = {
          won: ev.won,
          multiplier: ev.multiplier,
          result: ev.resultPayload,
        };
        choice = { move: input.move };
        break;
      }
      case "slots": {
        amount = toMicroUsdc(input.amount);
        const ev = evaluateSlots(serverSeed, clientSeed, nonce);
        evaluation = {
          won: ev.won,
          multiplier: ev.multiplier,
          result: ev.resultPayload,
        };
        choice = {};
        break;
      }
    }

    if ("amount" in input && typeof input.amount === "number") {
      assertBetAmount(input.amount);
    }

    const boosted = applyTryBoost(evaluation);
    const mult = clampMultiplier(boosted.multiplier);
    const effectivePayout =
      boosted.payoutOverride != null
        ? boosted.payoutOverride
        : boosted.won && mult > 0
          ? settlePayout(amount, mult)
          : BigInt(0);

    const profit = effectivePayout - amount;

    return NextResponse.json({
      funPlay: true,
      bet: {
        id: `fun_${Date.now()}`,
        game: input.game,
        amount: amount.toString(),
        payout: effectivePayout.toString(),
        profit: profit.toString(),
        won: boosted.won,
        choice,
        result: boosted.result,
        multiplier: Number(mult.toFixed(4)),
        serverSeed,
        serverSeedHash,
        clientSeed,
        nonce,
      },
      // Echo a zero balance so clients that expect `balance` don't break
      balance: {
        available: "0",
        locked: "0",
        bonus: "0",
        availableDisplay: formatUsdc(BigInt(0)),
        bonusDisplay: "0.00",
        hasBonus: false,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Try bet failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
