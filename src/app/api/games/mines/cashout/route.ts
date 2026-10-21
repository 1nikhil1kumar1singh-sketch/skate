import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { readSession } from "@/lib/session";
import { serializeBalance } from "@/lib/money";
import { settlePayout } from "@/lib/payout";

const schema = z.object({
  roundId: z.string().min(1),
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

  try {
    const result = await prisma.$transaction(async (tx) => {
      const round = await tx.gameRound.findFirst({
        where: {
          id: parsed.data.roundId,
          userId: session.userId,
          game: "mines",
        },
      });
      if (!round || round.status !== "OPEN") {
        throw new Error("Round not open");
      }

      const revealed = JSON.parse(round.revealed) as number[];
      if (revealed.length < 1) {
        throw new Error("Reveal at least one safe tile first");
      }

      const mineTiles = JSON.parse(round.mineTiles) as number[];
      const payout = settlePayout(round.amount, round.multiplier);
      const realLocked = round.amount - round.bonusUsed;

      await tx.balance.update({
        where: { userId: session.userId },
        data: {
          locked: { decrement: realLocked },
          available: { increment: payout },
        },
      });

      await tx.gameRound.update({
        where: { id: round.id },
        data: { status: "CASHED", payout },
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
            revealed,
            multiplier: round.multiplier,
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
        mineTiles,
        revealed,
        multiplier: round.multiplier,
        payout: payout.toString(),
        serverSeed: round.serverSeed,
        balance: serializeBalance(
          balance.available,
          balance.locked,
          balance.bonus,
        ),
      };
    });

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Cashout failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
