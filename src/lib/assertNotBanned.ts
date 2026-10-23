import { prisma } from "@/lib/prisma";

export async function assertUserNotBanned(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { banned: true },
  });
  if (user?.banned) {
    throw new Error("Account suspended. Contact support.");
  }
}
