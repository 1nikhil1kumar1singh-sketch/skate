/**
 * Live house audit:
 * 1) Exact EV table (audit-house-ev)
 * 2) Monte Carlo via real evaluate* engines (50k+ rounds)
 * 3) Live HTTP bets against running Next server
 *
 * Usage: node scripts/playtest-house.mjs
 */
import { spawnSync } from "child_process";
import { readFileSync } from "fs";
import { SignJWT } from "jose";
import { PrismaClient } from "@prisma/client";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

// Load .env into process.env if keys missing (Next already has them for the server)
try {
  for (const line of readFileSync(resolve(root, ".env"), "utf8").split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!m) continue;
    const k = m[1];
    let v = m[2] ?? "";
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    if (process.env[k] === undefined) process.env[k] = v;
  }
} catch {
  /* optional */
}

const BASE = process.env.PLAYTEST_BASE ?? "http://localhost:3000";
const HOUSE = Number(process.env.HOUSE_EDGE ?? "0.10");
const STAKE = 1; // USDC

function banner(t) {
  console.log(`\n${"═".repeat(60)}\n${t}\n${"═".repeat(60)}`);
}

banner("1) Exact EV audit");
const audit = spawnSync("node", ["scripts/audit-house-ev.mjs"], {
  cwd: root,
  env: { ...process.env, HOUSE_EDGE: String(HOUSE) },
  encoding: "utf8",
});
process.stdout.write(audit.stdout || "");
if (audit.status !== 0) {
  console.error(audit.stderr);
  process.exit(1);
}

banner("2) Monte Carlo — real game engines (tsx)");
const mc = spawnSync(
  "npx",
  ["tsx", "scripts/monte-carlo-games.ts"],
  { cwd: root, encoding: "utf8", env: process.env },
);
process.stdout.write(mc.stdout || "");
if (mc.stderr) process.stderr.write(mc.stderr);
if (mc.status !== 0) process.exit(mc.status ?? 1);

banner("3) Live API play — real bets on running server");
const prisma = new PrismaClient();
const secret = new TextEncoder().encode(
  process.env.SESSION_SECRET ?? "skate-dev-session-change-me-in-production",
);

async function mintSession() {
  // Give test bankroll so we can play many rounds
  const crypto = await import("crypto");
  const serverSeed = crypto.randomBytes(32).toString("hex");
  const hash = crypto.createHash("sha256").update(serverSeed).digest("hex");
  const path = `audit_${crypto.randomBytes(4).toString("hex")}`;
  const { Keypair } = await import("@solana/web3.js");
  const { default: bs58 } = await import("bs58");
  const kp = Keypair.generate();

  const user = await prisma.user.create({
    data: {
      displayName: `AuditBot-${Date.now().toString(36)}`,
      depositPath: path,
      depositAddress: kp.publicKey.toBase58(),
      depositSecret: bs58.encode(kp.secretKey),
      clientSeed: crypto.randomBytes(8).toString("hex"),
      serverSeed,
      serverSeedHash: hash,
      balance: { create: { available: BigInt(50_000_000_000) } }, // 50k USDC micro
    },
  });

  const token = await new SignJWT({ userId: user.id, demo: true })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("1d")
    .sign(secret);

  return { user, token, cookie: `skate_session=${token}` };
}

async function bet(cookie, body) {
  const res = await fetch(`${BASE}/api/bet`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie,
    },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? JSON.stringify(data));
  return data;
}

function profitFromBet(data) {
  // API returns micro-USDC integers as strings
  const amount = Number(data.bet.amount) / 1e6;
  const payout = Number(data.bet.payout) / 1e6;
  return payout - amount;
}

async function playMany(cookie, label, bodyFn, rounds) {
  let profit = 0;
  let wins = 0;
  const samples = [];
  for (let i = 0; i < rounds; i++) {
    const data = await bet(cookie, bodyFn(i));
    const p = profitFromBet(data);
    profit += p;
    if (data.bet.won) wins++;
    if (i < 5) {
      samples.push({
        won: data.bet.won,
        mult: data.bet.multiplier,
        profit: p.toFixed(4),
        result: data.bet.result,
      });
    }
  }
  const staked = rounds * STAKE;
  const rtp = (staked + profit) / staked;
  const edge = (1 - rtp) * 100;
  console.log(
    `\n${label}: ${rounds} rounds × $${STAKE} | wins ${wins}/${rounds} | RTP ${rtp.toFixed(4)} | house edge ${edge.toFixed(1)}% | house P/L $${(-profit).toFixed(2)}`,
  );
  console.log("  first 5:", JSON.stringify(samples, null, 0).slice(0, 400));
  return { rtp, profit, wins };
}

try {
  const { cookie, user } = await mintSession();
  console.log(`Test user ${user.displayName} (${user.id.slice(0, 8)}…)`);

  const me = await fetch(`${BASE}/api/me`, { headers: { cookie } }).then((r) =>
    r.json(),
  );
  console.log(
    `Balance start: ${me.user?.balance?.availableDisplay} | liveWallet=${me.liveWallet} houseEdge=${me.wallet?.houseEdge}`,
  );

  const results = [];
  results.push(
    await playMany(
      cookie,
      "COINFLIP",
      () => ({ game: "coinflip", amount: STAKE, side: "heads" }),
      200,
    ),
  );
  results.push(
    await playMany(
      cookie,
      "DICE under 50",
      () => ({
        game: "dice",
        amount: STAKE,
        target: 50,
        condition: "under",
      }),
      200,
    ),
  );
  results.push(
    await playMany(
      cookie,
      "LIMBO 2x",
      () => ({ game: "limbo", amount: STAKE, target: 2 }),
      200,
    ),
  );
  results.push(
    await playMany(
      cookie,
      "SLOTS",
      () => ({ game: "slots", amount: STAKE }),
      300,
    ),
  );
  results.push(
    await playMany(
      cookie,
      "WHEEL",
      () => ({ game: "wheel", amount: STAKE }),
      200,
    ),
  );
  results.push(
    await playMany(
      cookie,
      "ROULETTE red",
      () => ({
        game: "roulette",
        amount: STAKE,
        kind: "color",
        color: "red",
      }),
      200,
    ),
  );
  results.push(
    await playMany(
      cookie,
      "RPS rock",
      () => ({ game: "rps", amount: STAKE, move: "rock" }),
      150,
    ),
  );
  results.push(
    await playMany(
      cookie,
      "HILO higher",
      () => ({ game: "hilo", amount: STAKE, guess: "higher" }),
      150,
    ),
  );
  results.push(
    await playMany(
      cookie,
      "KENO 5 picks",
      (i) => ({
        game: "keno",
        amount: STAKE,
        picks: [1, 2, 3, 4, 5].map((n) => ((n + i) % 40) + 1),
      }),
      100,
    ),
  );
  results.push(
    await playMany(cookie, "SPIN", () => ({ game: "spin" }), 80),
  );
  results.push(
    await playMany(cookie, "MYSTERY", () => ({ game: "mystery" }), 80),
  );

  const me2 = await fetch(`${BASE}/api/me`, { headers: { cookie } }).then((r) =>
    r.json(),
  );
  console.log(`\nBalance end: ${me2.user?.balance?.availableDisplay}`);

  const bad = results.filter((r) => r.rtp > 1.15); // sample noise allowance
  banner("LIVE PLAY VERDICT");
  const startBal = 50_000;
  const endBal = Number(me2.user?.balance?.availableDisplay?.replace(/,/g, "") ?? 0);
  const houseTake = startBal - endBal;
  console.log(
    `Bankroll: $${startBal} → $${endBal.toFixed(2)} | house take $${houseTake.toFixed(2)}`,
  );
  if (houseTake < 0) {
    console.log("❌ House lost money over the full play session");
    process.exit(1);
  }
  if (bad.length) {
    console.log("❌ Some games showed RTP >> 1 in sample:", bad);
    process.exit(1);
  }
  console.log(
    "✅ Live session: house profitable; no game exploded above RTP 1.15 in-sample.",
  );
  console.log(
    "   Monte Carlo (step 2) is the statistical proof; live rounds confirm wiring.",
  );
} catch (e) {
  console.error("Live play failed:", e);
  process.exit(1);
} finally {
  await prisma.$disconnect();
}
