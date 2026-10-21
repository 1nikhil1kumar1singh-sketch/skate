import { createHash, createHmac, randomBytes } from "crypto";

export function generateServerSeed(): string {
  return randomBytes(32).toString("hex");
}

export function hashServerSeed(serverSeed: string): string {
  return createHash("sha256").update(serverSeed).digest("hex");
}

export function generateClientSeed(): string {
  return randomBytes(8).toString("hex");
}

/**
 * Provably-fair float in [0, 1) from SHA256 of seeds + nonce.
 *
 * Uses 52 bits of the hash divided by 2^52.
 * (Older code divided 52-bit values by 2^53−1, so floats never exceeded ~0.5 —
 * coinflip was always heads, limbo/crash won ~2× too often.)
 */
export function fairFloat(
  serverSeed: string,
  clientSeed: string,
  nonce: number,
): number {
  const material = `${serverSeed}:${clientSeed}:${nonce}`;
  const hex = createHash("sha256").update(material).digest("hex");
  // 13 hex chars = 52 bits; max value 2^52 − 1 → result in [0, 1)
  const slice = hex.slice(0, 13);
  return parseInt(slice, 16) / 2 ** 52;
}

export function fairRoll(
  serverSeed: string,
  clientSeed: string,
  nonce: number,
): number {
  return Math.floor(fairFloat(serverSeed, clientSeed, nonce) * 10000) / 100;
}

export type CoinSide = "heads" | "tails";

export function fairCoin(
  serverSeed: string,
  clientSeed: string,
  nonce: number,
): CoinSide {
  return fairFloat(serverSeed, clientSeed, nonce) < 0.5 ? "heads" : "tails";
}

/**
 * Deterministic uint32 stream — same pattern as YeNo `ypGames.ts`.
 * HMAC-SHA256(serverSeed, clientSeed:nonce:counter)
 */
export function makePrng(serverSeed: string, clientSeed: string, nonce: number) {
  let counter = 0;
  let buf = Buffer.alloc(0);
  let off = 0;
  const refill = () => {
    buf = createHmac("sha256", serverSeed)
      .update(`${clientSeed}:${nonce}:${counter++}`)
      .digest();
    off = 0;
  };
  return () => {
    if (off + 4 > buf.length) refill();
    const v = buf.readUInt32BE(off);
    off += 4;
    return v;
  };
}

/** Fisher–Yates mine layout over 0..gridSize-1 (YeNo Mines). */
export function minesFromSeed(
  serverSeed: string,
  clientSeed: string,
  nonce: number,
  gridSize: number,
  mines: number,
): number[] {
  const next = makePrng(serverSeed, clientSeed, nonce);
  const idx = Array.from({ length: gridSize }, (_, i) => i);
  for (let i = gridSize - 1; i > 0; i--) {
    const j = next() % (i + 1);
    const tmp = idx[i]!;
    idx[i] = idx[j]!;
    idx[j] = tmp;
  }
  return idx.slice(0, mines).sort((a, b) => a - b);
}

export { minesMultiplier } from "./minesMath";
