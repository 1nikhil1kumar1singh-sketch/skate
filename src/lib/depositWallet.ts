import { createHash, randomBytes } from "crypto";
import { Keypair } from "@solana/web3.js";
import bs58 from "bs58";

export function createDepositWallet() {
  const keypair = Keypair.generate();
  const depositAddress = keypair.publicKey.toBase58();
  const depositSecret = bs58.encode(keypair.secretKey);
  const depositPath = `kl_${randomBytes(4).toString("hex")}`;
  return { depositAddress, depositSecret, depositPath };
}

export function depositKeypairFromSecret(secret: string): Keypair {
  return Keypair.fromSecretKey(bs58.decode(secret));
}

/** Deterministic fallback path from user id (if regenerating display only). */
export function pathFromUserId(userId: string) {
  const h = createHash("sha256").update(userId).digest("hex").slice(0, 8);
  return `kl_${h}`;
}
