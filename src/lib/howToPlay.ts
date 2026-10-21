import type { GameSlug } from "./catalog";

export type HowToPlay = {
  summary: string;
  steps: string[];
};

/** Short play steps only — no odds / edge / win-math. */
export const HOW_TO_PLAY: Record<GameSlug, HowToPlay> = {
  dice: {
    summary: "Pick over or under, set a target, roll.",
    steps: ["Set your bet.", "Choose Over or Under.", "Roll."],
  },
  coinflip: {
    summary: "Pick heads or tails and flip.",
    steps: ["Set your bet.", "Choose Heads or Tails.", "Flip."],
  },
  mines: {
    summary: "Open safe tiles. Cash out anytime.",
    steps: [
      "Set bet and mines.",
      "Click tiles for gems.",
      "Cash out before you hit a mine.",
    ],
  },
  spin: {
    summary: "Pick a $5, $10, or $50 prize and spin.",
    steps: ["Choose a prize target.", "Spin for $1.", "Land the prize or miss."],
  },
  mystery: {
    summary: "Open a box for a random prize.",
    steps: ["Tap Open box.", "Prize credits to your balance."],
  },
  limbo: {
    summary: "Set a target and play.",
    steps: ["Set bet and target.", "Play.", "Win if the result clears your target."],
  },
  crash: {
    summary: "Set auto cash-out and ride the rise.",
    steps: ["Set bet and cash-out.", "Watch it climb.", "You win if it hits your cash-out first."],
  },
  keno: {
    summary: "Pick numbers and match the draw.",
    steps: ["Pick up to 10 numbers.", "Set your bet.", "Play."],
  },
  roulette: {
    summary: "Bet color, odd/even, or a number.",
    steps: ["Choose a bet type.", "Set stake.", "Spin."],
  },
  hilo: {
    summary: "Guess higher, lower, or same.",
    steps: ["Set your bet.", "Pick Higher, Lower, or Same.", "Play."],
  },
  wheel: {
    summary: "Spin the wheel once.",
    steps: ["Set your bet.", "Spin."],
  },
  rps: {
    summary: "Rock, paper, or scissors.",
    steps: ["Set your bet.", "Pick a move.", "Play."],
  },
  slots: {
    summary: "Spin three reels.",
    steps: ["Set your bet.", "Spin."],
  },
};

export function getHowToPlay(slug: string): HowToPlay | null {
  if (slug in HOW_TO_PLAY) return HOW_TO_PLAY[slug as GameSlug];
  return null;
}
