import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { readSession } from "@/lib/session";
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
import { serializeBalance, toMicroUsdc } from "@/lib/money";
import { fairFloat, generateServerSeed, hashServerSeed } from "@/lib/fair";
import { MYSTERY_STAKE_USDC, SPIN_STAKE_USDC } from "@/lib/promoOdds";
import { config } from "@/lib/config";
import { assertBetAmount, clampMultiplier, settlePayout } from "@/lib/payout";
import { splitStakeWithBonus } from "@/lib/bonus";
import { maybeQualifyReferral } from "@/lib/referral";

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

type Eval = {
  won: boolean;
  multiplier: number;
  result: Record<string, unknown>;
  choice: Record<string, unknown>;
  payoutOverride?: bigint;
};

export async function POST(req: NextRequest) {
  const session = await readSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const raw = (await req.json()) as Record<string, unknown>;
  const wantBonus = Boolean(raw.useBonus);
  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid bet" },
      { status: 400 },
    );
  }

  const input = parsed.data;

  try {
    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { id: session.userId },
        include: { balance: true },
      });
      if (!user?.balance) throw new Error("User not found");

      const nonce = user.nonce;
      const serverSeed = user.serverSeed;
      const clientSeed = user.clientSeed;
      const serverSeedHash = user.serverSeedHash;

      let amount: bigint;
      let evaluation: Eval;

      switch (input.game) {
        case "dice": {
          amount = toMicroUsdc(input.amount);
          const choice: DiceChoice = {
            target: input.target,
            condition: input.condition,
          };
          const ev = evaluateDice(choice, serverSeed, clientSeed, nonce);
          evaluation = {
            won: ev.won,
            multiplier: ev.multiplier,
            result: ev.result,
            choice,
          };
          break;
        }
        case "coinflip": {
          amount = toMicroUsdc(input.amount);
          const choice: CoinFlipChoice = { side: input.side };
          const ev = evaluateCoinFlip(choice, serverSeed, clientSeed, nonce);
          evaluation = {
            won: ev.won,
            multiplier: ev.multiplier,
            result: ev.result,
            choice,
          };
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
            choice: { stake: SPIN_STAKE_USDC, prize: prizeTarget },
            payoutOverride: toMicroUsdc(ev.prizeUsd),
          };
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
            choice: { stake: MYSTERY_STAKE_USDC },
            payoutOverride: toMicroUsdc(ev.prizeUsd),
          };
          break;
        }
        case "limbo": {
          amount = toMicroUsdc(input.amount);
          const ev = evaluateLimbo(
            input.target,
            serverSeed,
            clientSeed,
            nonce,
          );
          evaluation = {
            won: ev.won,
            multiplier: ev.won ? ev.multiplier : 0,
            result: ev.resultPayload,
            choice: { target: input.target },
          };
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
            choice: { cashoutAt: input.cashoutAt },
          };
          break;
        }
        case "keno": {
          amount = toMicroUsdc(input.amount);
          const ev = evaluateKeno(input.picks, serverSeed, clientSeed, nonce);
          evaluation = {
            won: ev.won,
            multiplier: ev.multiplier,
            result: ev.resultPayload,
            choice: { picks: input.picks },
          };
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
            choice: bet,
          };
          break;
        }
        case "hilo": {
          amount = toMicroUsdc(input.amount);
          const ev = evaluateHiLo(input.guess, serverSeed, clientSeed, nonce);
          evaluation = {
            won: ev.won,
            multiplier: ev.multiplier,
            result: ev.resultPayload,
            choice: { guess: input.guess },
          };
          break;
        }
        case "wheel": {
          amount = toMicroUsdc(input.amount);
          const ev = evaluateWheel(serverSeed, clientSeed, nonce);
          evaluation = {
            won: ev.won,
            multiplier: ev.multiplier,
            result: ev.resultPayload,
            choice: {},
          };
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
            choice: { move: input.move },
          };
          break;
        }
        case "slots": {
          amount = toMicroUsdc(input.amount);
          const ev = evaluateSlots(serverSeed, clientSeed, nonce);
          evaluation = {
            won: ev.won,
            multiplier: ev.multiplier,
            result: ev.resultPayload,
            choice: {},
          };
          break;
        }
      }

      if ("amount" in input && typeof input.amount === "number") {
        assertBetAmount(input.amount);
      }

      const { fromReal, fromBonus } = splitStakeWithBonus(
        amount,
        user.balance.bonus,
        wantBonus,
      );
      if (user.balance.available < fromReal) {
        throw new Error("Insufficient balance");
      }
      if (user.balance.bonus < fromBonus) {
        throw new Error("Insufficient bonus");
      }

      const mult = clampMultiplier(evaluation.multiplier);
      // MUST gate on won — several games return a display multiplier even on losses
      // (dice/coinflip/limbo). Paying mult without won was giving players free wins.
      const effectivePayout =
        evaluation.payoutOverride != null
          ? evaluation.payoutOverride > toMicroUsdc(config.maxWinUsdc)
            ? toMicroUsdc(config.maxWinUsdc)
            : evaluation.payoutOverride
          : evaluation.won && mult > 0
            ? settlePayout(amount, mult)
            : BigInt(0);

      const profit = effectivePayout - amount;
      const nextAvailable =
        user.balance.available - fromReal + effectivePayout;
      const nextBonus = user.balance.bonus - fromBonus;

      const shouldRotate = nonce > 0 && (nonce + 1) % 50 === 0;
      const nextServerSeed = shouldRotate ? generateServerSeed() : serverSeed;

      await tx.balance.update({
        where: { userId: user.id },
        data: { available: nextAvailable, bonus: nextBonus },
      });

      await tx.user.update({
        where: { id: user.id },
        data: {
          nonce: nonce + 1,
          ...(shouldRotate
            ? {
                serverSeed: nextServerSeed,
                serverSeedHash: hashServerSeed(nextServerSeed),
              }
            : {}),
        },
      });

      const bet = await tx.bet.create({
        data: {
          userId: user.id,
          game: input.game,
          amount,
          payout: effectivePayout,
          profit,
          won: evaluation.won,
          choice: JSON.stringify({
            ...evaluation.choice,
            ...(fromBonus > BigInt(0) ? { bonusUsed: fromBonus.toString() } : {}),
          }),
          result: JSON.stringify(evaluation.result),
          serverSeed,
          serverSeedHash,
          clientSeed,
          nonce,
        },
      });

      return {
        bet: {
          id: bet.id,
          game: bet.game,
          amount: bet.amount.toString(),
          payout: bet.payout.toString(),
          profit: bet.profit.toString(),
          won: bet.won,
          choice: evaluation.choice,
          result: evaluation.result,
          multiplier: Number(mult.toFixed(4)),
          serverSeed,
          serverSeedHash,
          clientSeed,
          nonce,
        },
        balance: serializeBalance(
          nextAvailable,
          user.balance.locked,
          nextBonus,
        ),
        revealedServerSeed: serverSeed,
      };
    });

    // After bet commits — never roll back a settled wager on referral errors
    try {
      await prisma.$transaction((tx) => maybeQualifyReferral(tx, session.userId));
    } catch {
      /* referral is best-effort */
    }

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Bet failed";
    const status =
      message === "Insufficient balance" ||
      message.includes("required") ||
      message.includes("Pick") ||
      message.includes("must")
        ? 400
        : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
