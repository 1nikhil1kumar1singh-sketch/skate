import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const schema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().email().max(120),
  subject: z.string().trim().min(3).max(120),
  message: z.string().trim().min(10).max(4000),
});

export async function POST(req: NextRequest) {
  try {
    const parsed = schema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Please fill all fields correctly." },
        { status: 400 },
      );
    }

    const ticket = await prisma.supportTicket.create({
      data: parsed.data,
    });

    return NextResponse.json({ ok: true, id: ticket.id });
  } catch {
    return NextResponse.json(
      { error: "Could not send message. Try again." },
      { status: 500 },
    );
  }
}
