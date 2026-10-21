import { NextRequest, NextResponse } from "next/server";
import { PrivyClient } from "@privy-io/server-auth";
import { config } from "@/lib/config";
import { prisma } from "@/lib/prisma";
import { createSessionToken, setSessionCookie } from "@/lib/session";
import { createUser } from "@/lib/users";
import { findReferrerIdByCode } from "@/lib/referral";

export async function POST(req: NextRequest) {
  if (!config.privyAppId || !config.privyAppSecret) {
    return NextResponse.json(
      { error: "Privy is not configured on the server" },
      { status: 503 },
    );
  }

  const body = (await req.json()) as { accessToken?: string; ref?: string };
  if (!body.accessToken) {
    return NextResponse.json({ error: "Missing accessToken" }, { status: 400 });
  }

  const privy = new PrivyClient(config.privyAppId, config.privyAppSecret);
  const claims = await privy.verifyAuthToken(body.accessToken);
  const privyId = claims.userId;

  let user = await prisma.user.findUnique({
    where: { privyId },
    include: { balance: true },
  });

  if (!user) {
    const privyUser = await privy.getUser(privyId);
    const linked = privyUser.linkedAccounts ?? [];
    const walletAccount = linked.find((a) => a.type === "wallet") as
      | { address?: string }
      | undefined;
    const wallet = privyUser.wallet?.address ?? walletAccount?.address;
    const referredById =
      typeof body.ref === "string" && body.ref.trim()
        ? await findReferrerIdByCode(prisma, body.ref)
        : null;

    user = await createUser({
      privyId,
      walletAddress: typeof wallet === "string" ? wallet : undefined,
      displayName: privyUser.email?.address?.split("@")[0] ?? "Player",
      withDemoBalance: config.demoMode,
      referredById: referredById ?? undefined,
    });
  }

  const token = await createSessionToken({ userId: user.id, demo: false });
  await setSessionCookie(token);

  return NextResponse.json({
    ok: true,
    user: {
      id: user.id,
      displayName: user.displayName,
      walletAddress: user.walletAddress,
      serverSeedHash: user.serverSeedHash,
      clientSeed: user.clientSeed,
      nonce: user.nonce,
    },
  });
}
