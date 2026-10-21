import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { config, getAcceptedStables } from "@/lib/config";

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ path: string }> },
) {
  const { path } = await ctx.params;
  const user = await prisma.user.findUnique({
    where: { depositPath: path },
    select: {
      displayName: true,
      depositPath: true,
      depositAddress: true,
    },
  });

  if (!user?.depositAddress) {
    return NextResponse.json({ error: "Deposit path not found" }, { status: 404 });
  }

  return NextResponse.json({
    displayName: user.displayName,
    depositPath: user.depositPath,
    depositAddress: user.depositAddress,
    depositUrl: `/pay/${user.depositPath}`,
    cluster: config.solana.cluster,
    usdcMint: config.solana.usdcMint,
    usdtMint: config.solana.usdtMint || null,
    acceptedStables: getAcceptedStables().map((s) => s.symbol),
    demoMode: config.demoMode,
  });
}
