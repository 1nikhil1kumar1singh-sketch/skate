import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { readSession } from "@/lib/session";
import { generateServerSeed, hashServerSeed } from "@/lib/fair";

const schema = z.object({
  clientSeed: z.string().min(1).max(64).optional(),
  rotateServerSeed: z.boolean().optional(),
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

  const user = await prisma.user.findUnique({ where: { id: session.userId } });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const revealedServerSeed = parsed.data.rotateServerSeed
    ? user.serverSeed
    : undefined;

  const nextServerSeed = parsed.data.rotateServerSeed
    ? generateServerSeed()
    : user.serverSeed;

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: {
      clientSeed: parsed.data.clientSeed ?? user.clientSeed,
      ...(parsed.data.rotateServerSeed
        ? {
            serverSeed: nextServerSeed,
            serverSeedHash: hashServerSeed(nextServerSeed),
            nonce: 0,
          }
        : {}),
    },
  });

  return NextResponse.json({
    clientSeed: updated.clientSeed,
    serverSeedHash: updated.serverSeedHash,
    nonce: updated.nonce,
    revealedServerSeed,
  });
}
