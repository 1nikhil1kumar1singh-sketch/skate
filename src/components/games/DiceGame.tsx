"use client";

import { useRef, useState } from "react";
import { motion } from "framer-motion";
import { useSkate } from "@/hooks/useSkate";
import { AmountField } from "./AmountField";
import { animateScramble } from "@/lib/gameAnim";

export function DiceGame() {
  const { placeBet, loginDemo, funPlay, user } = useSkate();
  const [amount, setAmount] = useState(1);
  const [target, setTarget] = useState(50);
  const [condition, setCondition] = useState<"over" | "under">("over");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [display, setDisplay] = useState<number | null>(null);
  const [rolling, setRolling] = useState(false);
  const [last, setLast] = useState<{
    roll: number;
    won: boolean;
    multiplier: number;
  } | null>(null);
  const lock = useRef(false);

  async function onRoll() {
    if (busy || lock.current) return;
    setError(null);
    if (!funPlay && !user) await loginDemo();
    setBusy(true);
    lock.current = true;
    setRolling(true);
    setLast(null);
    try {
      const result = await placeBet({
        game: "dice",
        amount,
        target,
        condition,
      });
      const roll = Number(result.bet.result.roll);
      await animateScramble(roll, setDisplay, 850);
      setLast({
        roll,
        won: result.bet.won,
        multiplier: result.bet.multiplier,
      });
      setDisplay(roll);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Roll failed");
    } finally {
      setRolling(false);
      setBusy(false);
      lock.current = false;
    }
  }

  const shown = display ?? last?.roll ?? null;
  const tone = rolling
    ? "is-rolling"
    : last
      ? last.won
        ? "is-win"
        : "is-loss"
      : "";

  return (
    <div className="game-shell">
      <div className="game-stage">
        <p className="game-kicker">Originals · Dice</p>
        <motion.div
          className={`dice-result ${tone}`}
          animate={
            rolling
              ? { y: [0, -6, 0], rotate: [-2, 2, -1, 0] }
              : { y: 0, rotate: 0, scale: 1 }
          }
          transition={
            rolling
              ? { repeat: Infinity, duration: 0.18 }
              : { type: "spring", stiffness: 300, damping: 18 }
          }
        >
          {shown != null ? shown.toFixed(2) : "—.—"}
        </motion.div>
        <div className="dice-track" aria-hidden>
          <div
            className="dice-track__marker"
            style={{ left: `${Math.min(100, Math.max(0, shown ?? target))}%` }}
          />
          <div
            className="dice-track__target"
            style={{ left: `${target}%` }}
            title={`Target ${target}`}
          />
        </div>
        <p className="game-sub">
          {rolling
            ? "Rolling…"
            : last
              ? last.won
                ? `Hit · ${last.multiplier.toFixed(2)}x`
                : "Miss"
              : `Roll ${condition} ${target}`}
        </p>
      </div>

      <div className="game-controls">
        <AmountField amount={amount} onChange={setAmount} />

        <div className="segmented">
          <button
            type="button"
            className={condition === "under" ? "is-active" : ""}
            disabled={busy}
            onClick={() => setCondition("under")}
          >
            Roll under
          </button>
          <button
            type="button"
            className={condition === "over" ? "is-active" : ""}
            disabled={busy}
            onClick={() => setCondition("over")}
          >
            Roll over
          </button>
        </div>

        <label className="field">
          <span>Target · {target}</span>
          <input
            type="range"
            min={2}
            max={98}
            value={target}
            disabled={busy}
            onChange={(e) => setTarget(Number(e.target.value))}
          />
          <strong className="target-readout">{target}</strong>
        </label>

        {error ? <p className="error-text">{error}</p> : null}

        <button
          type="button"
          className="btn btn--primary btn--block"
          disabled={busy}
          onClick={() => void onRoll()}
        >
          {busy ? "Rolling…" : "Roll dice"}
        </button>
      </div>
    </div>
  );
}
