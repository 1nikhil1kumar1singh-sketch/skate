export const GAME_CATALOG = [
  {
    slug: "dice",
    title: "Dice",
    blurb: "Roll over / under. Tune risk.",
    image: "/games/dice.jpg",
  },
  {
    slug: "coinflip",
    title: "Coin Flip",
    blurb: "Heads or tails. Call it.",
    image: "/games/coinflip.jpg",
  },
  {
    slug: "mines",
    title: "Mines",
    blurb: "5×5 gems. Cash out or bust.",
    image: "/games/mines.jpg",
  },
  {
    slug: "spin",
    title: "Spin & Win",
    blurb: "Pick $5, $10, or $50.",
    image: "/games/spin.jpg",
  },
  {
    slug: "mystery",
    title: "Mystery Box",
    blurb: "1 USDC. Open for a random prize.",
    image: "/games/mystery.jpg",
  },
  {
    slug: "limbo",
    title: "Limbo",
    blurb: "Pick a target. Ride past it.",
    image: "/games/limbo.jpg",
  },
  {
    slug: "crash",
    title: "Crash",
    blurb: "Auto cash out before it dumps.",
    image: "/games/crash.jpg",
  },
  {
    slug: "keno",
    title: "Keno",
    blurb: "Pick numbers. Hit the draw.",
    image: "/games/keno.jpg",
  },
  {
    slug: "roulette",
    title: "Roulette",
    blurb: "Red, black, or a single pocket.",
    image: "/games/roulette.jpg",
  },
  {
    slug: "hilo",
    title: "Hi-Lo",
    blurb: "Higher, lower, or same card.",
    image: "/games/hilo.jpg",
  },
  {
    slug: "wheel",
    title: "Wheel",
    blurb: "Spin the multiplier wheel.",
    image: "/games/wheel.jpg",
  },
  {
    slug: "rps",
    title: "RPS",
    blurb: "Rock · Paper · Scissors.",
    image: "/games/rps.jpg",
  },
  {
    slug: "slots",
    title: "Slots",
    blurb: "Three reels. Line it up.",
    image: "/games/slots.jpg",
  },
] as const;

export type GameSlug = (typeof GAME_CATALOG)[number]["slug"];

export function getGameBySlug(slug: string) {
  return GAME_CATALOG.find((g) => g.slug === slug);
}
