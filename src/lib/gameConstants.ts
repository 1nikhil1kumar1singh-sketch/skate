/** Client-safe constants (no Node crypto). */

export const KENO_POOL = 40;
export const KENO_DRAW = 10;

/**
 * Wheel RTP ≈ 90% (EV of equal segments ≈ 0.90 → ~10% house edge).
 * Previous table summed to ~1.03 (player-edge). Keep majority blanks.
 */
export const WHEEL_SEGMENTS = [
  { label: "0x", mult: 0 },
  { label: "0x", mult: 0 },
  { label: "0x", mult: 0 },
  { label: "0x", mult: 0 },
  { label: "1.1x", mult: 1.1 },
  { label: "0x", mult: 0 },
  { label: "1.2x", mult: 1.2 },
  { label: "0x", mult: 0 },
  { label: "1.5x", mult: 1.5 },
  { label: "0x", mult: 0 },
  { label: "2x", mult: 2 },
  { label: "5x", mult: 5 },
] as const;

/** Equal reel symbols — only 3-of-a-kind pays (pairs were +55% player EV). */
export const SLOT_SYMBOLS = ["◆", "▲", "●", "★", "7"] as const;

export type RpsMove = "rock" | "paper" | "scissors";
