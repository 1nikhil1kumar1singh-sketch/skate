/** Pure mines math — safe for client + server (no Node crypto). */

export const MINES_GRID = 25;
export const MINES_COLS = 5;

/** Default 20% — overridden by config.minesHouseEdgeBp on server. */
export const MINES_HOUSE_EDGE_BP = Number(
  process.env.NEXT_PUBLIC_MINES_HOUSE_EDGE_BP ??
    process.env.MINES_HOUSE_EDGE_BP ??
    "2000",
);

function round6(n: number): number {
  return Math.round((n + Number.EPSILON) * 1e6) / 1e6;
}

/**
 * Mines cashout multiplier after `revealed` safe picks (YeNo formula).
 */
export function minesMultiplier(
  revealed: number,
  gridSize: number,
  mines: number,
  houseEdgeBp = MINES_HOUSE_EDGE_BP,
): number {
  if (revealed <= 0) return 1;
  let survival = 1;
  for (let i = 0; i < revealed; i++) {
    survival *= (gridSize - mines - i) / (gridSize - i);
  }
  const edge = houseEdgeBp / 10_000;
  const mult = (1 - edge) / survival;
  return round6(Math.max(1, mult));
}

export function minesLadder(
  mines: number,
  gridSize = MINES_GRID,
  houseEdgeBp = MINES_HOUSE_EDGE_BP,
): number[] {
  const safe = gridSize - mines;
  const ladder: number[] = [];
  for (let r = 1; r <= safe; r++) {
    ladder.push(minesMultiplier(r, gridSize, mines, houseEdgeBp));
  }
  return ladder;
}
