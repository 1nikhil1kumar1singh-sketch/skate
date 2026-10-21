/** Season prize pool: $50,000 across 500 winners. */

export const PRIZE_POOL_USD = 50_000;
export const WINNER_SLOTS = 500;

/** Fixed 60-day race; display clock shows day 10 of 60. */
export const SEASON_DAYS = 60;
export const SEASON_DAYS_PASSED = 10;

/** Board standings reshuffle once per UTC calendar day. */
export const LEADERBOARD_REFRESH_HOURS = 24;

export function seasonProgress() {
  const remaining = Math.max(0, SEASON_DAYS - SEASON_DAYS_PASSED);
  const pct = Math.min(100, (SEASON_DAYS_PASSED / SEASON_DAYS) * 100);
  return {
    totalDays: SEASON_DAYS,
    daysPassed: SEASON_DAYS_PASSED,
    daysLeft: remaining,
    pct,
  };
}

export type PrizeTier = {
  from: number;
  to: number;
  prizeUsd: number;
  label: string;
};

/** Tiered split — heavier at the top, still pays all 500. */
export const PRIZE_TIERS: PrizeTier[] = [
  { from: 1, to: 1, prizeUsd: 5_500, label: "1st" },
  { from: 2, to: 3, prizeUsd: 2_500, label: "2nd – 3rd" },
  { from: 4, to: 10, prizeUsd: 1_000, label: "4th – 10th" },
  { from: 11, to: 25, prizeUsd: 500, label: "11th – 25th" },
  { from: 26, to: 50, prizeUsd: 250, label: "26th – 50th" },
  { from: 51, to: 100, prizeUsd: 125, label: "51st – 100th" },
  { from: 101, to: 200, prizeUsd: 50, label: "101st – 200th" },
  { from: 201, to: 350, prizeUsd: 25, label: "201st – 350th" },
  { from: 351, to: 500, prizeUsd: 25, label: "351st – 500th" },
];

export function prizeForRank(rank: number): number {
  const tier = PRIZE_TIERS.find((t) => rank >= t.from && rank <= t.to);
  return tier?.prizeUsd ?? 0;
}

export function tierTotals() {
  return PRIZE_TIERS.map((t) => {
    const slots = t.to - t.from + 1;
    return { ...t, slots, totalUsd: slots * t.prizeUsd };
  });
}

export type LeaderRow = {
  rank: number;
  name: string;
  wagered: number;
  prizeUsd: number;
};

const HANDLES = [
  "neonfox",
  "solrider",
  "cryptokat",
  "limboace",
  "minespro",
  "crashking",
  "dicewave",
  "usdcwhale",
  "voidskate",
  "pixelbet",
  "orbitroll",
  "aciddrop",
  "nightgrid",
  "fluxplay",
  "shadowmint",
  "raygun",
  "colddeck",
  "hyperroll",
  "bankrollz",
  "tapout",
  "quietstorm",
  "lazerbee",
  "riftcash",
  "glowstick",
  "zeroedge",
  "moonchip",
  "stackr",
  "viperusd",
  "blinkbet",
  "ironseed",
  "softcrash",
  "jadeodds",
  "nitrobox",
  "pulsewin",
  "arcadesol",
  "driftlane",
  "hexburst",
  "lowroller",
  "highvolt",
  "silkspin",
  "baremetal",
  "cinderbet",
  "opalrush",
  "trueodds",
  "warpstake",
  "cyanwolf",
  "redshift",
  "bluemine",
  "goldnonce",
  "lateentry",
];

/** UTC day key — board is stable within this day, new on the next. */
export function leaderboardDayKey(now = new Date()): string {
  return now.toISOString().slice(0, 10);
}

export function leaderboardDayStart(now = new Date()): Date {
  const d = new Date(now);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

export function nextLeaderboardRefresh(now = new Date()): Date {
  const next = leaderboardDayStart(now);
  next.setUTCDate(next.getUTCDate() + 1);
  return next;
}

export function msUntilLeaderboardRefresh(now = new Date()): number {
  return Math.max(0, nextLeaderboardRefresh(now).getTime() - now.getTime());
}

/** Format remaining time until next daily refresh (HHh MMm or Mm Ss). */
export function formatRefreshCountdown(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) {
    return `${String(h).padStart(2, "0")}h ${String(m).padStart(2, "0")}m`;
  }
  return `${String(m).padStart(2, "0")}m ${String(s).padStart(2, "0")}s`;
}

function hashDay(dayKey: string): number {
  let h = 2166136261;
  for (let i = 0; i < dayKey.length; i++) {
    h ^= dayKey.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number) {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffleInPlace<T>(arr: T[], rand: () => number) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    const tmp = arr[i]!;
    arr[i] = arr[j]!;
    arr[j] = tmp;
  }
  return arr;
}

/**
 * Demo board of 50 players. Order + wager totals refresh once per UTC day
 * so the page stays stable within a day and reshuffles at midnight UTC.
 */
export function getDemoLeaderboard(now = new Date()): LeaderRow[] {
  const dayKey = leaderboardDayKey(now);
  const rand = mulberry32(hashDay(dayKey));
  const names = shuffleInPlace([...HANDLES], rand).slice(0, 50);

  return names.map((name, i) => {
    const rank = i + 1;
    const jitter = 0.92 + rand() * 0.16;
    const wagered = Math.round(
      (420_000 / rank) * (1.08 - (i % 7) * 0.01) * jitter,
    );
    return {
      rank,
      name,
      wagered,
      prizeUsd: prizeForRank(rank),
    };
  });
}

export function leaderboardRefreshMeta(now = new Date()) {
  const refreshedAt = leaderboardDayStart(now);
  const nextAt = nextLeaderboardRefresh(now);
  return {
    dayKey: leaderboardDayKey(now),
    refreshedAt: refreshedAt.toISOString(),
    nextRefreshAt: nextAt.toISOString(),
    msUntilRefresh: msUntilLeaderboardRefresh(now),
  };
}
