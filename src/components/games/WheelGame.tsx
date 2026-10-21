"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useSkate } from "@/hooks/useSkate";
import { AmountField } from "./AmountField";
import { WHEEL_SEGMENTS } from "@/lib/gameConstants";

export function WheelGame() {
  const { user, placeBet, loginDemo, funPlay } = useSkate();
  const [amount, setAmount] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [last, setLast] = useState<{
    label: string;
    multiplier: number;
    won: boolean;
  } | null>(null);
  const [rotation, setRotation] = useState(0);
  const [spinKey, setSpinKey] = useState(0);

  async function play() {
    setError(null);
    if (!funPlay && !user) await loginDemo();
    setBusy(true);
    setSpinKey((k) => k + 1);
    try {
      const res = await placeBet({ game: "wheel", amount });
      const index = Number(res.bet.result.index ?? 0);
      const slice = 360 / WHEEL_SEGMENTS.length;
      setRotation(360 * 5 + (360 - index * slice - slice / 2));
      setLast({
        label: String(res.bet.result.label),
        multiplier: Number(res.bet.result.multiplier ?? 0),
        won: res.bet.won,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="game-shell">
      <div className="game-stage">
        <p className="game-kicker">Originals · Wheel</p>
        <motion.div
          key={spinKey}
          className="spin-wheel"
          animate={{ rotate: rotation }}
          transition={{ duration: 2.4, ease: [0.15, 0.8, 0.2, 1] }}
        >
          {WHEEL_SEGMENTS.map((seg, i) => (
            <span
              key={`${seg.label}-${i}`}
              className="spin-seg"
              style={{
                transform: `rotate(${(360 / WHEEL_SEGMENTS.length) * i}deg)`,
              }}
            >
              {seg.label}
            </span>
          ))}
        </motion.div>
        <div className="spin-pointer" />
        <p className="game-sub">
          {last
            ? `${last.label} · ${last.won ? "paid" : "blank"}`
            : "Land a multiplier"}
        </p>
      </div>
      <div className="game-controls">
        <AmountField amount={amount} onChange={setAmount} />
        {error ? <p className="error-text">{error}</p> : null}
        <button
          type="button"
          className="btn btn--primary btn--block"
          disabled={busy}
          onClick={() => void play()}
        >
          {busy ? "Spinning…" : "Spin wheel"}
        </button>
      </div>
    </div>
  );
}
