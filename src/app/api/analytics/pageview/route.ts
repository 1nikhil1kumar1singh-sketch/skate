import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { path?: string; referrer?: string };
    const path = typeof body.path === "string" ? body.path.slice(0, 200) : "/";
    if (!path.startsWith("/")) {
      return NextResponse.json({ ok: true });
    }
    // Skip noisy paths
    if (
      path.startsWith("/api/") ||
      path.startsWith("/_next") ||
      path.includes(".")
    ) {
      return NextResponse.json({ ok: true });
    }
    const referrer =
      typeof body.referrer === "string" ? body.referrer.slice(0, 300) : null;

    await prisma.pageView.create({
      data: { path, referrer: referrer || null },
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: true });
  }
}
