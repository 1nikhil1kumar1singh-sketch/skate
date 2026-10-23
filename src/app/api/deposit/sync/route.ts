import { NextResponse } from "next/server";
import { PublicKey } from "@solana/web3.js";
import { getAssociatedTokenAddressSync } from "@solana/spl-token";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { readSession } from "@/lib/session";
import { serializeBalance } from "@/lib/money";
import {
  getConnection,
  getTokenBalance,
  isLiveWalletReady,
  sweepTokenToTreasury,
} from "@/lib/solana";
import { ensureDepositPath } from "@/lib/users";
import { config, getAcceptedStables } from "@/lib/config";
import { grantFirstDepositBonus } from "@/lib/grantBonus";

const SYNC_PAGE_SIZE = 25;
/** Up to 10 pages × 25 = 250 recent signatures per stable ATA */
const SYNC_MAX_PAGES = 10;

function isUniqueViolation(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  );
}

/**
 * Live deposit sync:
 * 1) Scan recent USDC + USDT txs to personal deposit address → credit ledger
 * 2) Sweep remaining stables on that address → treasury
 */
export async function POST() {
  const session = await readSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isLiveWalletReady()) {
    return NextResponse.json(
      {
        error:
          "Live wallet not ready. Set DEMO_MODE=false and run npm run setup:treasury",
      },
      { status: 503 },
    );
  }

  const user = await ensureDepositPath(session.userId);
  if (!user?.depositAddress || !user.depositSecret) {
    return NextResponse.json({ error: "No deposit address" }, { status: 400 });
  }

  try {
    const connection = getConnection();
    const owner = new PublicKey(user.depositAddress);
    const stables = getAcceptedStables();

    let credited = BigInt(0);
    const creditedSymbols: string[] = [];

    for (const stable of stables) {
      const mint = new PublicKey(stable.mint);
      const ata = getAssociatedTokenAddressSync(mint, owner);
      const mintStr = stable.mint;

      let before: string | undefined;
      for (let page = 0; page < SYNC_MAX_PAGES; page++) {
        const sigs = await connection.getSignaturesForAddress(ata, {
          limit: SYNC_PAGE_SIZE,
          before,
        });
        if (sigs.length === 0) break;

        for (const s of sigs) {
          if (!s.signature) continue;
          const existing = await prisma.deposit.findUnique({
            where: { signature: s.signature },
          });
          if (existing) continue;

          const tx = await connection.getParsedTransaction(s.signature, {
            maxSupportedTransactionVersion: 0,
            commitment: "confirmed",
          });
          if (!tx || tx.meta?.err) continue;

          const pre = tx.meta?.preTokenBalances ?? [];
          const post = tx.meta?.postTokenBalances ?? [];
          const preAmt =
            pre.find(
              (b) => b.mint === mintStr && b.owner === user.depositAddress,
            )?.uiTokenAmount.amount ?? "0";
          const postAmt =
            post.find(
              (b) => b.mint === mintStr && b.owner === user.depositAddress,
            )?.uiTokenAmount.amount ?? "0";
          const delta = BigInt(postAmt) - BigInt(preAmt);
          if (delta <= BigInt(0)) continue;

          try {
            await prisma.$transaction(async (txdb) => {
              await txdb.deposit.create({
                data: {
                  userId: user.id,
                  amount: delta,
                  signature: s.signature,
                  status: `confirmed:${stable.symbol}`,
                },
              });
              await txdb.balance.update({
                where: { userId: user.id },
                data: { available: { increment: delta } },
              });
              await grantFirstDepositBonus(txdb, user.id, delta);
            });
            credited += delta;
            if (!creditedSymbols.includes(stable.symbol)) {
              creditedSymbols.push(stable.symbol);
            }
          } catch (error) {
            if (isUniqueViolation(error)) continue;
            throw error;
          }
        }

        before = sigs[sigs.length - 1]?.signature;
        if (sigs.length < SYNC_PAGE_SIZE) break;
      }
    }

    // Sweep leftover USDC/USDT on the deposit wallet into treasury
    let swept = BigInt(0);
    const sweepSignatures: string[] = [];
    const sweepErrors: string[] = [];

    for (const stable of stables) {
      const leftover = await getTokenBalance(user.depositAddress, stable.mint);
      if (leftover <= BigInt(0)) continue;

      try {
        const sweepSignature = await sweepTokenToTreasury(
          user.depositSecret,
          leftover,
          stable.mint,
        );
        sweepSignatures.push(sweepSignature);
        swept += leftover;

        // Sweep is treasury ops only — never credit the ledger here.
        await prisma.deposit
          .create({
            data: {
              userId: user.id,
              amount: BigInt(0),
              signature: `sweep:${stable.symbol}:${sweepSignature}`,
              status: `swept:${stable.symbol}`,
            },
          })
          .catch(() => {
            /* ignore unique collisions */
          });
      } catch (error) {
        sweepErrors.push(
          error instanceof Error
            ? `${stable.symbol}: ${error.message}`
            : `${stable.symbol}: sweep failed`,
        );
      }
    }

    const balance = await prisma.balance.findUniqueOrThrow({
      where: { userId: user.id },
    });

    return NextResponse.json({
      ok: true,
      mode: "onchain",
      cluster: config.solana.cluster,
      accepted: stables.map((s) => s.symbol),
      credited: credited.toString(),
      creditedSymbols,
      swept: swept.toString(),
      sweepSignature: sweepSignatures[0] ?? null,
      sweepSignatures,
      sweepErrors: sweepErrors.length ? sweepErrors : undefined,
      depositAddress: user.depositAddress,
      depositPath: user.depositPath,
      balance: serializeBalance(
        balance.available,
        balance.locked,
        balance.bonus,
      ),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Sync failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
