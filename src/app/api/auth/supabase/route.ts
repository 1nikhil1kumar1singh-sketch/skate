import { NextRequest, NextResponse } from "next/server";
import { config } from "@/lib/config";
import { prisma } from "@/lib/prisma";
import { createUser } from "@/lib/users";
import { findReferrerIdByCode } from "@/lib/referral";
import { createSessionToken, setSessionCookie } from "@/lib/session";
import { getSupabaseServer } from "@/lib/supabase/server";

/**
 * Bridge Supabase Auth → Klasshi session cookie + Prisma user.
 */
export async function POST(req: NextRequest) {
  const supabase = getSupabaseServer();
  if (!supabase) {
    return NextResponse.json(
      { error: "Supabase Auth is not configured" },
      { status: 503 },
    );
  }

  const body = (await req.json()) as {
    accessToken?: string;
    ref?: string;
  };
  if (!body.accessToken) {
    return NextResponse.json({ error: "Missing accessToken" }, { status: 400 });
  }

  const { data, error } = await supabase.auth.getUser(body.accessToken);
  if (error || !data.user) {
    return NextResponse.json(
      { error: error?.message ?? "Invalid session" },
      { status: 401 },
    );
  }

  const sb = data.user;
  const email = sb.email?.toLowerCase() ?? null;
  const meta = sb.user_metadata ?? {};
  const displayName =
    (typeof meta.full_name === "string" && meta.full_name) ||
    (typeof meta.name === "string" && meta.name) ||
    (typeof meta.display_name === "string" && meta.display_name) ||
    email?.split("@")[0] ||
    "Player";

  let user = await prisma.user.findUnique({
    where: { supabaseId: sb.id },
    include: { balance: true },
  });

  if (!user && email) {
    user = await prisma.user.findFirst({
      where: { email },
      include: { balance: true },
    });
    if (user && !user.supabaseId) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: { supabaseId: sb.id, email },
        include: { balance: true },
      });
    }
  }

  if (!user) {
    let referredById: string | undefined;
    if (typeof body.ref === "string" && body.ref.trim()) {
      referredById =
        (await findReferrerIdByCode(prisma, body.ref)) ?? undefined;
    }
    user = await createUser({
      supabaseId: sb.id,
      email: email ?? undefined,
      displayName,
      withDemoBalance: config.demoMode,
      referredById,
    });
  }

  const token = await createSessionToken({
    userId: user.id,
    demo: config.demoMode,
  });
  await setSessionCookie(token);

  return NextResponse.json({
    ok: true,
    user: {
      id: user.id,
      displayName: user.displayName,
      email: user.email,
    },
  });
}
