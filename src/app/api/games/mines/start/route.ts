import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { readSession } from "@/lib/session";
import { serializeBalance, toMicroUsdc } from "@/lib/money";
import { generateServerSeed, hashServerSeed, minesFromSeed } from "@/lib/fair";
import { MINES_GRID, minesLadder } from "@/lib/minesMath";
import { config } from "@/lib/config";
import { assertBetAmount } from "@/lib/payout";
import { splitStakeWithBonus } from "@/lib/bonus";
import { maybeQualifyReferral } from "@/lib/referral";

const schema = z.object({
  amount: z.number().positive().max(config.maxBetUsdc),
  mines: z.number().int().min(1).max(24),
  useBonus: z.boolean().optional(),
});

export async function POST(req: NextRequest) {
  const session = await readSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  assertBetAmount(parsed.data.amount);
  const amount = toMicroUsdc(parsed.data.amount);
  const mines = parsed.data.mines;
  const wantBonus = Boolean(parsed.data.useBonus);
  const houseEdgeBp = config.minesHouseEdgeBp;

  try {
    const result = await prisma.$transaction(async (tx) => {
      const open = await tx.gameRound.findFirst({
        where: { userId: session.userId, game: "mines", status: "OPEN" },
      });
      if (open) {
        throw new Error("Finish your open Mines round first");
      }

      const user = await tx.user.findUnique({
        where: { id: session.userId },
        include: { balance: true },
      });
      if (!user?.balance) throw new Error("User not found");

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

      const serverSeed = generateServerSeed();
      const clientSeed = user.clientSeed;
      const nonce = user.nonce;
      const mineTiles = minesFromSeed(
        serverSeed,
        clientSeed,
        nonce,
        MINES_GRID,
        mines,
      );

      await tx.balance.update({
        where: { userId: user.id },
        data: {
          available: { decrement: fromReal },
          locked: { increment: fromReal },
          bonus: { decrement: fromBonus },
        },
      });

      await tx.user.update({
        where: { id: user.id },
        data: { nonce: nonce + 1 },
      });

      const round = await tx.gameRound.create({
        data: {
          userId: user.id,
          game: "mines",
          status: "OPEN",
          amount,
          bonusUsed: fromBonus,
          mines,
          mineTiles: JSON.stringify(mineTiles),
          revealed: "[]",
          multiplier: 1,
          serverSeed,
          serverSeedHash: hashServerSeed(serverSeed),
          clientSeed,
          nonce,
        },
      });

      const balance = await tx.balance.findUniqueOrThrow({
        where: { userId: user.id },
      });

      return {
        round: {
          id: round.id,
          mines: round.mines,
          amount: round.amount.toString(),
          multiplier: 1,
          revealed: [] as number[],
          serverSeedHash: round.serverSeedHash,
          clientSeed: round.clientSeed,
          nonce: round.nonce,
          ladder: minesLadder(mines, MINES_GRID, houseEdgeBp),
          houseEdgeBp,
          gridSize: MINES_GRID,
        },
        balance: serializeBalance(
          balance.available,
          balance.locked,
          balance.bonus,
        ),
      };
    });

    try {
      await prisma.$transaction((tx) =>
        maybeQualifyReferral(tx, session.userId),
      );
    } catch {
      /* referral is best-effort */
    }

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Start failed";
    const status =
      message.includes("Insufficient") || message.includes("open Mines")
        ? 400
        : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
