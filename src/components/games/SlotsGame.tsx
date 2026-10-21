"use client";

import { useRef, useState } from "react";
import { motion } from "framer-motion";
import { useSkate } from "@/hooks/useSkate";
import { AmountField } from "./AmountField";
import { animateSlotSpin } from "@/lib/gameAnim";

export function SlotsGame() {
  const { user, placeBet, loginDemo, funPlay } = useSkate();
  const [amount, setAmount] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reels, setReels] = useState<string[]>(["◆", "▲", "●"]);
  const [won, setWon] = useState(false);
  const [mult, setMult] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const lock = useRef(false);

  async function play() {
    if (busy || lock.current) return;
    setError(null);
    if (!funPlay && !user) await loginDemo();
    setBusy(true);
    lock.current = true;
    setSpinning(true);
    setWon(false);
    setMult(0);
    try {
      const res = await placeBet({ game: "slots", amount });
      const finals = (res.bet.result.reels as string[]) ?? ["?", "?", "?"];
      await animateSlotSpin(finals, setReels, 1000);
      setWon(res.bet.won);
      setMult(res.bet.multiplier);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setSpinning(false);
      setBusy(false);
      lock.current = false;
    }
  }

  return (
    <div className="game-shell">
      <div className="game-stage">
        <p className="game-kicker">Originals · Slots</p>
        <div className={`slots-row ${spinning ? "is-spinning" : ""}`}>
          {reels.map((sym, i) => (
            <motion.div
              key={`reel-${i}`}
              className={`slot-reel ${won && !spinning ? "is-win" : ""}`}
              animate={
                spinning
                  ? { y: [0, -10, 0] }
                  : { y: 0 }
              }
              transition={
                spinning
                  ? {
                      repeat: Infinity,
                      duration: 0.12 + i * 0.04,
                      ease: "linear",
                    }
                  : { type: "spring", stiffness: 320, damping: 18 }
              }
            >
              {sym}
            </motion.div>
          ))}
        </div>
        <p className="game-sub">
          {spinning
            ? "Spinning…"
            : mult > 0
              ? `${mult.toFixed(2)}x · three of a kind`
              : "Match all 3 reels"}
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
          {busy ? "Spinning…" : "Spin reels"}
        </button>
      </div>
    </div>
  );
}
