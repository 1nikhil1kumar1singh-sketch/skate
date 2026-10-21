/** Shared Stake-style reveal helpers — settle after a short animated tease. */

export function sleep(ms: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });
}

export function easeOutCubic(t: number) {
  return 1 - (1 - t) ** 3;
}

/** Count a multiplier up toward the final value (Limbo). */
export function animateCountUp(
  to: number,
  onFrame: (value: number) => void,
  durationMs = 1200,
): Promise<void> {
  return new Promise((resolve) => {
    const start = performance.now();
    const from = 1;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      const eased = easeOutCubic(t);
      const value = from + (to - from) * eased;
      onFrame(value);
      if (t < 1) {
        requestAnimationFrame(tick);
      } else {
        onFrame(to);
        resolve();
      }
    };
    requestAnimationFrame(tick);
  });
}

/** Scramble random floats, then land on final (Dice). */
export function animateScramble(
  final: number,
  onFrame: (value: number) => void,
  durationMs = 900,
  randomFn: () => number = () => Math.random() * 99.99,
): Promise<void> {
  return new Promise((resolve) => {
    const start = performance.now();
    let lastSwap = 0;
    const tick = (now: number) => {
      const elapsed = now - start;
      if (elapsed >= durationMs) {
        onFrame(final);
        resolve();
        return;
      }
      // Faster swaps early, slower near the end
      const interval = 40 + (elapsed / durationMs) * 90;
      if (now - lastSwap >= interval) {
        lastSwap = now;
        onFrame(randomFn());
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
}

/** Reveal items one-by-one (Keno draws). */
export async function animateSequence<T>(
  items: T[],
  onStep: (soFar: T[], index: number) => void,
  stepMs = 120,
): Promise<void> {
  const soFar: T[] = [];
  for (let i = 0; i < items.length; i++) {
    soFar.push(items[i]!);
    onStep([...soFar], i);
    if (i < items.length - 1) await sleep(stepMs);
  }
}

const SLOT_SYMBOLS = ["◆", "▲", "●", "★", "■", "7"];

/** Spin reels then stop left → right on finals. */
export async function animateSlotSpin(
  finals: string[],
  onFrame: (reels: string[]) => void,
  spinMs = 1100,
): Promise<void> {
  const start = performance.now();
  await new Promise<void>((resolve) => {
    const tick = (now: number) => {
      if (now - start >= spinMs) {
        resolve();
        return;
      }
      onFrame(
        finals.map(
          () => SLOT_SYMBOLS[Math.floor(Math.random() * SLOT_SYMBOLS.length)]!,
        ),
      );
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
  // Stop each reel in sequence
  const shown = [...finals];
  for (let i = 0; i < finals.length; i++) {
    shown[i] = finals[i]!;
    // While later reels still spin
    for (let j = i + 1; j < finals.length; j++) {
      shown[j] =
        SLOT_SYMBOLS[Math.floor(Math.random() * SLOT_SYMBOLS.length)]!;
    }
    onFrame([...shown]);
    await sleep(160);
  }
  onFrame([...finals]);
}
