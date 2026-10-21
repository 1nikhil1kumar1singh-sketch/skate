import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { readSession } from "@/lib/session";

const schema = z.object({
  displayName: z.string().trim().min(2).max(24).optional(),
  walletAddress: z.string().trim().min(32).max(64).optional(),
});

export async function PATCH(req: NextRequest) {
  const session = await readSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid profile data" }, { status: 400 });
  }

  const user = await prisma.user.update({
    where: { id: session.userId },
    data: {
      ...(parsed.data.displayName
        ? { displayName: parsed.data.displayName }
        : {}),
      ...(parsed.data.walletAddress
        ? { walletAddress: parsed.data.walletAddress }
        : {}),
    },
  });

  return NextResponse.json({
    user: {
      id: user.id,
      displayName: user.displayName,
      walletAddress: user.walletAddress,
    },
  });
}
