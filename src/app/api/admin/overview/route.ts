import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function authorized(req: NextRequest) {
  const key = process.env.ADMIN_KEY?.trim();
  if (!key) return false;
  const header = req.headers.get("x-admin-key")?.trim();
  const query = req.nextUrl.searchParams.get("key")?.trim();
  return header === key || query === key;
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [views7d, openTickets, topPaths, recentTickets, viewsToday] =
    await Promise.all([
      prisma.pageView.count({ where: { createdAt: { gte: since } } }),
      prisma.supportTicket.count({ where: { status: "open" } }),
      prisma.pageView.groupBy({
        by: ["path"],
        where: { createdAt: { gte: since } },
        _count: { path: true },
        orderBy: { _count: { path: "desc" } },
        take: 12,
      }),
      prisma.supportTicket.findMany({
        orderBy: { createdAt: "desc" },
        take: 30,
      }),
      prisma.pageView.count({
        where: {
          createdAt: {
            gte: new Date(new Date().toISOString().slice(0, 10)),
          },
        },
      }),
    ]);

  return NextResponse.json({
    traffic: {
      viewsToday,
      views7d,
      topPaths: topPaths.map((r) => ({
        path: r.path,
        count: r._count.path,
      })),
    },
    support: {
      openTickets,
      tickets: recentTickets,
    },
  });
}

export async function PATCH(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = (await req.json()) as { id?: string; status?: string };
  if (!body.id || (body.status !== "open" && body.status !== "closed")) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  await prisma.supportTicket.update({
    where: { id: body.id },
    data: { status: body.status },
  });
  return NextResponse.json({ ok: true });
}
