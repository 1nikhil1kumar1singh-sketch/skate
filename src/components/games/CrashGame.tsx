"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { useSkate } from "@/hooks/useSkate";
import { AmountField } from "./AmountField";
export function CrashGame() {
  const { user, placeBet, loginDemo, funPlay } = useSkate();
  const [amount, setAmount] = useState(1);
  const [cashoutAt, setCashoutAt] = useState(2);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [displayMult, setDisplayMult] = useState(1);
  const [phase, setPhase] = useState<"idle" | "rising" | "won" | "crashed">(
    "idle",
  );
  const [last, setLast] = useState<{
    crashPoint: number;
    cashoutAt: number;
    won: boolean;
  } | null>(null);
  const animRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (animRef.current != null) cancelAnimationFrame(animRef.current);
    };
  }, []);

  function animateRound(crashPoint: number, target: number, won: boolean) {
    if (animRef.current != null) cancelAnimationFrame(animRef.current);
    setPhase("rising");
    setDisplayMult(1);

    const peak = won ? target : crashPoint;
    const duration = Math.min(2800, 600 + Math.log2(Math.max(peak, 1.01)) * 700);
    const start = performance.now();

    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      // Ease out so it rises fast then slows
      const eased = 1 - (1 - t) ** 2;
      const value = 1 + (peak - 1) * eased;
      setDisplayMult(value);

      if (t < 1) {
        animRef.current = requestAnimationFrame(tick);
        return;
      }

      setDisplayMult(peak);
      if (won) {
        setPhase("won");
      } else {
        setPhase("crashed");
        setDisplayMult(crashPoint);
      }
      setBusy(false);
    };

    animRef.current = requestAnimationFrame(tick);
  }

  async function play() {
    setError(null);
    if (!funPlay && !user) await loginDemo();
    if (cashoutAt < 1.01) {
      setError("Cash out must be at least 1.01x");
      return;
    }
    setBusy(true);
    setPhase("rising");
    setDisplayMult(1);
    try {
      const res = await placeBet({ game: "crash", amount, cashoutAt });
      const crashPoint = Number(res.bet.result.crashPoint);
      const target = Number(res.bet.result.cashoutAt ?? cashoutAt);
      const won = Boolean(res.bet.won);
      setLast({ crashPoint, cashoutAt: target, won });
      animateRound(crashPoint, target, won);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
      setPhase("idle");
      setBusy(false);
    }
  }

  const statusText =
    phase === "rising"
      ? "Rising…"
      : phase === "won" && last
        ? `Cashed out @ ${last.cashoutAt.toFixed(2)}x`
        : phase === "crashed" && last
          ? last.crashPoint <= 1.01
            ? `Instant crash @ ${last.crashPoint.toFixed(2)}x`
            : `Crashed @ ${last.crashPoint.toFixed(2)}x · target ${last.cashoutAt.toFixed(2)}x`
          : `Auto cash out @ ${cashoutAt}x`;

  return (
    <div className="game-shell">
      <div className="game-stage">
        <p className="game-kicker">Originals · Crash</p>
        <motion.div
          key={`${phase}-${last?.crashPoint ?? "idle"}`}
          className={`dice-result crash-mult ${
            phase === "won"
              ? "is-win"
              : phase === "crashed"
                ? "is-loss"
                : ""
          }`}
          initial={{ scale: 0.92, opacity: 0.85 }}
          animate={{ scale: 1, opacity: 1 }}
        >
          {displayMult.toFixed(2)}x
        </motion.div>
        <p className="game-sub">{statusText}</p>
        {last && phase === "won" ? (
          <p className="muted" style={{ margin: 0, fontSize: "0.8rem" }}>
            Would have crashed at {last.crashPoint.toFixed(2)}x
          </p>
        ) : null}
      </div>
      <div className="game-controls">
        <AmountField amount={amount} onChange={setAmount} />
        <label className="field">
          <span>Auto cash out</span>
          <input
            type="number"
            min={1.01}
            max={50}
            step={0.01}
            value={cashoutAt}
            disabled={busy}
            onChange={(e) => setCashoutAt(Number(e.target.value))}
          />
        </label>
        {error ? <p className="error-text">{error}</p> : null}
        <button
          type="button"
          className="btn btn--primary btn--block"
          disabled={busy}
          onClick={() => void play()}
        >
          {busy ? "Rising…" : "Place bet"}
        </button>
      </div>
    </div>
  );
}
