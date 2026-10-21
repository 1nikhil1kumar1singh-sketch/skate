"use client";

import { useRef, useState } from "react";
import { motion } from "framer-motion";
import { useSkate } from "@/hooks/useSkate";
import { AmountField } from "./AmountField";
import { animateCountUp } from "@/lib/gameAnim";

export function LimboGame() {
  const { user, placeBet, loginDemo, funPlay } = useSkate();
  const [amount, setAmount] = useState(1);
  const [target, setTarget] = useState(2);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [display, setDisplay] = useState(1);
  const [phase, setPhase] = useState<"idle" | "flying" | "done">("idle");
  const [last, setLast] = useState<{ result: number; won: boolean } | null>(
    null,
  );
  const animLock = useRef(false);

  async function play() {
    if (busy || animLock.current) return;
    setError(null);
    if (!funPlay && !user) await loginDemo();
    setBusy(true);
    animLock.current = true;
    setPhase("flying");
    setLast(null);
    setDisplay(1);
    try {
      const res = await placeBet({ game: "limbo", amount, target });
      const result = Number(res.bet.result.result);
      const won = res.bet.won;
      await animateCountUp(result, setDisplay, 1100 + Math.min(800, result * 40));
      setLast({ result, won });
      setPhase("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
      setPhase("idle");
    } finally {
      setBusy(false);
      animLock.current = false;
    }
  }

  const tone =
    phase === "flying"
      ? "is-flying"
      : last
        ? last.won
          ? "is-win"
          : "is-loss"
        : "";

  return (
    <div className="game-shell">
      <div className="game-stage">
        <p className="game-kicker">Originals · Limbo</p>
        <motion.div
          className={`dice-result limbo-mult ${tone}`}
          animate={
            phase === "flying"
              ? { scale: [1, 1.04, 1], opacity: 1 }
              : { scale: 1, opacity: 1 }
          }
          transition={
            phase === "flying"
              ? { repeat: Infinity, duration: 0.35 }
              : { type: "spring", stiffness: 280, damping: 20 }
          }
        >
          {display.toFixed(2)}x
        </motion.div>
        <p className="game-sub">
          {phase === "flying"
            ? "Flying…"
            : last
              ? last.won
                ? `Cleared ${target}x`
                : `Missed ${target}x`
              : `Target ${target}x`}
        </p>
      </div>
      <div className="game-controls">
        <AmountField amount={amount} onChange={setAmount} />
        <label className="field">
          <span>Target multiplier</span>
          <input
            type="number"
            min={1.01}
            step={0.01}
            value={target}
            disabled={busy}
            onChange={(e) => setTarget(Number(e.target.value))}
          />
        </label>
        {error ? <p className="error-text">{error}</p> : null}
        <button
          type="button"
          className="btn btn--primary btn--block"
          disabled={busy}
          onClick={() => void play()}
        >
          {busy ? "Flying…" : "Bet"}
        </button>
      </div>
    </div>
  );
}
