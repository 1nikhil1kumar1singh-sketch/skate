import { NextRequest, NextResponse } from "next/server";
import { config } from "@/lib/config";
import { createSessionToken, setSessionCookie } from "@/lib/session";
import { createUser } from "@/lib/users";
import { findReferrerIdByCode } from "@/lib/referral";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  if (!config.demoMode) {
    return NextResponse.json(
      { error: "Demo mode is disabled. Use Privy login." },
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
    displayName: `Skater-${Math.floor(Math.random() * 9000 + 1000)}`,
    withDemoBalance: true,
    referredById: referredById ?? undefined,
  });

  const token = await createSessionToken({ userId: user.id, demo: true });
  await setSessionCookie(token);

  return NextResponse.json({
    ok: true,
    user: {
      id: user.id,
      displayName: user.displayName,
      serverSeedHash: user.serverSeedHash,
      clientSeed: user.clientSeed,
      nonce: user.nonce,
    },
  });
}
