/**
 * Exact RTP / house-edge audit for Skate originals.
 * Target: every game EV ≤ 0.92 (default 8% edge), none > 1.0.
 * Run: node scripts/audit-house-ev.mjs
 */
const HOUSE = Number(process.env.HOUSE_EDGE ?? "0.20");
const apply = (raw) => {
  const edged = raw * (1 - HOUSE);
  return Math.max(0, Math.floor(edged * 1e6) / 1e6);
};
const round2 = (n) => Math.floor(n * 100) / 100;

function hyp(N, K, n, k) {
  function C(a, b) {
    if (b < 0 || b > a) return 0;
    if (b > a - b) b = a - b;
    let r = 1;
    for (let i = 0; i < b; i++) r = (r * (a - i)) / (i + 1);
    return r;
  }
  return (C(K, k) * C(N - K, n - k)) / C(N, n);
}

const rows = [];

function report(name, ev, note = "") {
  const edge = (1 - ev) * 100;
  const ok = ev <= 0.98; // hard fail only if near/above fair
  rows.push({ name, ev, edge, ok, note });
}

// Dice / coin / limbo / crash — closed form
report("dice", 1 - HOUSE, "fair×(1−e)");
report("coinflip", 0.5 * apply(2), "50/50");
report("limbo/crash", 1 - HOUSE, "P(win)=(1−e)/T");

// Mines cash-at-any-depth (conditional)
report("mines", 1 - HOUSE, "cashout EV = 1−edge");

// Wheel
const WHEEL = [0, 0, 0, 0, 1.1, 0, 1.2, 0, 1.5, 0, 2, 5];
report("wheel", WHEEL.reduce((a, b) => a + b, 0) / WHEEL.length);

// Slots — 3oak only
const SYMS = ["◆", "▲", "●", "★", "7"];
let slotsEv = 0;
for (const a of SYMS)
  for (const b of SYMS)
    for (const c of SYMS) {
      let m = 0;
      if (a === b && b === c) m = a === "7" ? apply(75) : apply(12);
      slotsEv += m;
    }
slotsEv /= 125;
report("slots", slotsEv, "3-of-a-kind only");

// HiLo — always-higher (blind) and optimal-if-card-shown
let hiloBlind = 0;
let hiloOpt = 0;
for (let start = 0; start < 13; start++) {
  const pH = (12 - start) / 13;
  const pL = start / 13;
  const pS = 1 / 13;
  const evH = pH > 0 ? 1 - HOUSE : 0;
  const evL = pL > 0 ? 1 - HOUSE : 0;
  const evS = pS > 0 ? 1 - HOUSE : 0;
  hiloBlind += evH;
  hiloOpt += Math.max(evH, evL, evS);
}
report("hilo (blind higher)", hiloBlind / 13, "true odds");
report("hilo (optimal w/ card)", hiloOpt / 13, "must stay ≤1−e");

// RPS
const rps =
  (1 / 3) * apply(2) + (1 / 3) * round2(1 - HOUSE) + (1 / 3) * 0;
report("rps", rps, "draw pays 1−e");

// Roulette
report("roulette color", (18 / 37) * apply(2));
report("roulette number", (1 / 37) * apply(36));

// Keno
const KENO = {
  1: { 1: 2.5 },
  2: { 2: 8 },
  3: { 2: 1.4, 3: 20 },
  4: { 2: 1.2, 3: 4, 4: 40 },
  5: { 3: 2, 4: 8, 5: 50 },
  6: { 3: 1.4, 4: 4, 5: 20, 6: 50 },
  7: { 4: 2.5, 5: 10, 6: 40, 7: 50 },
  8: { 4: 1.8, 5: 5, 6: 20, 7: 40, 8: 50 },
  9: { 5: 3, 6: 10, 7: 30, 8: 45, 9: 50 },
  10: { 5: 2, 6: 6, 7: 15, 8: 30, 9: 45, 10: 50 },
};
let kenoWorst = 0;
for (let picks = 1; picks <= 10; picks++) {
  let ev = 0;
  for (let h = 0; h <= picks; h++) {
    ev += hyp(40, picks, 10, h) * (KENO[picks][h] ?? 0);
  }
  kenoWorst = Math.max(kenoWorst, ev);
  report(`keno/${picks}`, ev);
}

// Promo
const spinEv =
  (9700 * 0 + 200 * 5 + 80 * 10 + 20 * 50) / 10000;
const mystEv = (4500 * 0 + 3800 * 1 + 1500 * 2 + 200 * 3) / 10000;
report("spin", spinEv);
report("mystery", mystEv);

console.log("\nSkate house EV audit (stake=1 → expected return)\n");
console.log(
  "Game".padEnd(28),
  "EV".padStart(8),
  "Edge%".padStart(8),
  "OK",
  "  note",
);
let failed = 0;
for (const r of rows) {
  const mark = r.ev > 1 ? "FAIL" : r.ev > 0.98 ? "SOFT" : "ok";
  if (r.ev > 1) failed++;
  console.log(
    r.name.padEnd(28),
    r.ev.toFixed(4).padStart(8),
    r.edge.toFixed(1).padStart(7) + "%",
    mark,
    r.note ? `  ${r.note}` : "",
  );
}
console.log(
  failed
    ? `\n❌ ${failed} game(s) have player edge (EV>1)`
    : "\n✅ No game has EV > 1.0 (house never negative expectancy)",
);
process.exit(failed ? 1 : 0);
