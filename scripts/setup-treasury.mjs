#!/usr/bin/env node
/**
 * Generate a Solana treasury keypair for Skate live deposits/withdrawals.
 * Usage: node scripts/setup-treasury.mjs
 * Writes/updates .env with TREASURY keys and turns DEMO_MODE off.
 */
import { Keypair } from "@solana/web3.js";
import bs58 from "bs58";
import fs from "fs";
import path from "path";

const root = process.cwd();
const envPath = path.join(root, ".env");
const keypair = Keypair.generate();
const address = keypair.publicKey.toBase58();
const secret = bs58.encode(keypair.secretKey);

let env = fs.existsSync(envPath) ? fs.readFileSync(envPath, "utf8") : "";

function upsert(key, value) {
  const line = `${key}="${value}"`;
  const re = new RegExp(`^${key}=.*$`, "m");
  if (re.test(env)) {
    env = env.replace(re, line);
  } else {
    env = `${env.trimEnd()}\n${line}\n`;
  }
}

upsert("DEMO_MODE", "false");
upsert("NEXT_PUBLIC_DEMO_MODE", "false");
upsert("NEXT_PUBLIC_TREASURY_ADDRESS", address);
upsert("TREASURY_SECRET_KEY", secret);
upsert("NEXT_PUBLIC_SOLANA_CLUSTER", "devnet");
upsert(
  "NEXT_PUBLIC_SOLANA_RPC_URL",
  "https://api.devnet.solana.com",
);
upsert(
  "NEXT_PUBLIC_USDC_MINT",
  "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU",
);
// Mainnet Tether USDT — used when you switch cluster to mainnet-beta
upsert(
  "NEXT_PUBLIC_USDT_MINT",
  "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB",
);

fs.writeFileSync(envPath, env);

const outDir = path.join(root, ".skate");
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(
  path.join(outDir, "treasury.json"),
  JSON.stringify({
    address,
    secretKey: Array.from(keypair.secretKey),
    cluster: "devnet",
    createdAt: new Date().toISOString(),
  }),
  { mode: 0o600 },
);

console.log(`
Skate treasury ready (devnet)

  Address: ${address}
  Wrote:   .env  +  .skate/treasury.json

Next:
  1) Fund treasury with a little SOL (fees):
       solana airdrop 1 ${address} --url devnet
  2) Fund treasury USDC ATA (devnet USDC mint in .env)
  3) Restart: npm run dev
  4) Wallet → Deposit (send USDC to your personal path) → Sync
  5) Withdraw sends from this treasury (minus fee)

NEVER commit TREASURY_SECRET_KEY or .skate/treasury.json to git.
`);
