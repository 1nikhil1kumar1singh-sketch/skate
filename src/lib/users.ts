import { prisma } from "./prisma";
import { config } from "./config";
import { generateClientSeed, generateServerSeed, hashServerSeed } from "./fair";
import { createDepositWallet } from "./depositWallet";

export async function createUser(input?: {
  privyId?: string;
  supabaseId?: string;
  email?: string;
  walletAddress?: string;
  displayName?: string;
  withDemoBalance?: boolean;
  referredById?: string;
}) {
  const serverSeed = generateServerSeed();
  const deposit = createDepositWallet();
  const user = await prisma.user.create({
    data: {
      privyId: input?.privyId,
      supabaseId: input?.supabaseId,
      email: input?.email,
      walletAddress: input?.walletAddress,
      displayName: input?.displayName ?? "Player",
      depositPath: deposit.depositPath,
      depositAddress: deposit.depositAddress,
      depositSecret: deposit.depositSecret,
      referredById: input?.referredById,
      clientSeed: generateClientSeed(),
      serverSeed,
      serverSeedHash: hashServerSeed(serverSeed),
      balance: {
        create: {
          available: input?.withDemoBalance
            ? config.demoStartingBalance
            : BigInt(0),
        },
      },
    },
    include: { balance: true },
  });
  return user;
}

/** Ensure older users get a personal deposit path + address. */
export async function ensureDepositPath(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return null;
  if (user.depositPath && user.depositAddress) return user;

  const deposit = createDepositWallet();
  return prisma.user.update({
    where: { id: userId },
    data: {
      depositPath: user.depositPath ?? deposit.depositPath,
      depositAddress: user.depositAddress ?? deposit.depositAddress,
      depositSecret: user.depositSecret ?? deposit.depositSecret,
    },
  });
}

export async function getUserWithBalance(userId: string) {
  await ensureDepositPath(userId);
  return prisma.user.findUnique({
    where: { id: userId },
    include: { balance: true },
  });
}

export async function rotateServerSeed(userId: string) {
  const serverSeed = generateServerSeed();
  return prisma.user.update({
    where: { id: userId },
    data: {
      serverSeed,
      serverSeedHash: hashServerSeed(serverSeed),
      nonce: 0,
    },
  });
}
