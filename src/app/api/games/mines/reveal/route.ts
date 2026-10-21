import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { readSession } from "@/lib/session";
import { serializeBalance } from "@/lib/money";
import { MINES_GRID, minesMultiplier } from "@/lib/minesMath";
import { config } from "@/lib/config";
import { settlePayout } from "@/lib/payout";

const schema = z.object({
  roundId: z.string().min(1),
  tile: z.number().int().min(0).max(24),
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

  const { roundId, tile } = parsed.data;

  try {
    const result = await prisma.$transaction(async (tx) => {
      const round = await tx.gameRound.findFirst({
        where: { id: roundId, userId: session.userId, game: "mines" },
      });
      if (!round || round.status !== "OPEN") {
        throw new Error("Round not open");
      }

      const mineTiles = JSON.parse(round.mineTiles) as number[];
      const revealed = JSON.parse(round.revealed) as number[];
      if (revealed.includes(tile)) {
        throw new Error("Tile already revealed");
      }

      const realLocked = round.amount - round.bonusUsed;

      if (mineTiles.includes(tile)) {
        // Bust — clear locked real stake (bonus already spent at start)
        await tx.balance.update({
          where: { userId: session.userId },
          data: { locked: { decrement: realLocked } },
        });

        await tx.gameRound.update({
          where: { id: round.id },
          data: {
            status: "BUST",
            revealed: JSON.stringify([...revealed, tile]),
            multiplier: 0,
            payout: BigInt(0),
          },
        });

        await tx.bet.create({
          data: {
            userId: session.userId,
            game: "mines",
            amount: round.amount,
            payout: BigInt(0),
            profit: -round.amount,
            won: false,
            choice: JSON.stringify({ mines: round.mines }),
            result: JSON.stringify({
              bustTile: tile,
              mineTiles,
              revealed: [...revealed, tile],
            }),
            serverSeed: round.serverSeed,
            serverSeedHash: round.serverSeedHash,
            clientSeed: round.clientSeed,
            nonce: round.nonce,
          },
        });

        const balance = await tx.balance.findUniqueOrThrow({
          where: { userId: session.userId },
        });

        return {
          status: "BUST" as const,
          tile,
          mineTiles,
          revealed: [...revealed, tile],
          multiplier: 0,
          serverSeed: round.serverSeed,
          balance: serializeBalance(
            balance.available,
            balance.locked,
            balance.bonus,
          ),
        };
      }

      const nextRevealed = [...revealed, tile];
      const multiplier = minesMultiplier(
        nextRevealed.length,
        MINES_GRID,
        round.mines,
        config.minesHouseEdgeBp,
      );
      const safeLeft = MINES_GRID - round.mines - nextRevealed.length;

      // Auto-cashout when all safe tiles cleared
      if (safeLeft === 0) {
        const payout = settlePayout(round.amount, multiplier);
        await tx.balance.update({
          where: { userId: session.userId },
          data: {
            locked: { decrement: realLocked },
            available: { increment: payout },
          },
        });
        await tx.gameRound.update({
          where: { id: round.id },
          data: {
            status: "CASHED",
            revealed: JSON.stringify(nextRevealed),
            multiplier,
            payout,
          },
        });
        await tx.bet.create({
          data: {
            userId: session.userId,
            game: "mines",
            amount: round.amount,
            payout,
            profit: payout - round.amount,
            won: true,
            choice: JSON.stringify({ mines: round.mines }),
            result: JSON.stringify({
              mineTiles,
              revealed: nextRevealed,
              multiplier,
              auto: true,
            }),
            serverSeed: round.serverSeed,
            serverSeedHash: round.serverSeedHash,
            clientSeed: round.clientSeed,
            nonce: round.nonce,
          },
        });
        const balance = await tx.balance.findUniqueOrThrow({
          where: { userId: session.userId },
        });
        return {
          status: "CASHED" as const,
          tile,
          mineTiles,
          revealed: nextRevealed,
          multiplier,
          payout: payout.toString(),
          serverSeed: round.serverSeed,
          balance: serializeBalance(
            balance.available,
            balance.locked,
            balance.bonus,
          ),
        };
      }

      await tx.gameRound.update({
        where: { id: round.id },
        data: {
          revealed: JSON.stringify(nextRevealed),
          multiplier,
        },
      });

      return {
        status: "OPEN" as const,
        tile,
        revealed: nextRevealed,
        multiplier,
      };
    });

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Reveal failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
