import { NextRequest, NextResponse } from "next/server";
import { config } from "@/lib/config";
import { createSessionToken, setSessionCookie } from "@/lib/session";
import { createUser } from "@/lib/users";
import { findReferrerIdByCode } from "@/lib/referral";
import { prisma } from "@/lib/prisma";

/**
 * Privy-free session login.
 * Works whenever Privy is not configured. Gives demo balance only in DEMO_MODE.
 */
export async function POST(req: NextRequest) {
  if (config.privyAppId) {
    return NextResponse.json(
      { error: "Use wallet / Privy login" },
      { status: 403 },
    );
  }

  let refCode: string | undefined;
  try {
    const body = (await req.json()) as { ref?: string };
    if (typeof body.ref === "string") refCode = body.ref;
  } catch {
    /* empty body ok */
  }

  const referredById = refCode
    ? await findReferrerIdByCode(prisma, refCode)
    : null;

  const user = await createUser({
    displayName: `Player-${Math.floor(Math.random() * 9000 + 1000)}`,
    withDemoBalance: config.demoMode,
    referredById: referredById ?? undefined,
  });

  const token = await createSessionToken({
    userId: user.id,
    demo: true,
  });
  await setSessionCookie(token);

  return NextResponse.json({
    ok: true,
    guest: true,
    user: {
      id: user.id,
      displayName: user.displayName,
      serverSeedHash: user.serverSeedHash,
      clientSeed: user.clientSeed,
      nonce: user.nonce,
    },
  });
}
