"use client";

import { useRef, useState } from "react";
import { motion } from "framer-motion";
import { useSkate } from "@/hooks/useSkate";
import { AmountField } from "./AmountField";
import { sleep } from "@/lib/gameAnim";

type Side = "heads" | "tails";

export function CoinFlipGame() {
  const { user, placeBet, loginDemo, funPlay } = useSkate();
  const [amount, setAmount] = useState(1);
  const [side, setSide] = useState<Side>("heads");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [flipping, setFlipping] = useState(false);
  const [last, setLast] = useState<{ side: Side; won: boolean } | null>(null);
  const [spinKey, setSpinKey] = useState(0);
  const [rotateY, setRotateY] = useState(0);
  const lock = useRef(false);

  async function onFlip() {
    if (busy || lock.current) return;
    setError(null);
    if (!funPlay && !user) await loginDemo();
    setBusy(true);
    lock.current = true;
    setFlipping(true);
    setLast(null);
    setSpinKey((k) => k + 1);
    try {
      const result = await placeBet({
        game: "coinflip",
        amount,
        side,
      });
      const landed = result.bet.result.side as Side;
      setRotateY((r) => r + 720 + (landed === "tails" ? 180 : 0));
      await sleep(950);
      setLast({
        side: landed,
        won: result.bet.won,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Flip failed");
    } finally {
      setFlipping(false);
      setBusy(false);
      lock.current = false;
    }
  }

  return (
    <div className="game-shell">
      <div className="game-stage">
        <p className="game-kicker">Originals · Coin Flip</p>
        <motion.div
          key={spinKey}
          className={`coin ${last ? (last.won ? "is-win" : "is-loss") : ""} ${flipping ? "is-flipping" : ""}`}
          animate={{ rotateY }}
          transition={{ duration: 0.9, ease: [0.2, 0.8, 0.2, 1] }}
        >
          <span>
            {flipping ? "…" : last ? last.side.toUpperCase() : "SKATE"}
          </span>
        </motion.div>
        <p className="game-sub">
          {flipping
            ? "Flipping…"
            : last
              ? last.won
                ? "Called it"
                : "Wrong side"
              : `Calling ${side}`}
        </p>
      </div>

      <div className="game-controls">
        <AmountField amount={amount} onChange={setAmount} />

        <div className="segmented">
          <button
            type="button"
            className={side === "heads" ? "is-active" : ""}
            disabled={busy}
            onClick={() => setSide("heads")}
          >
            Heads
          </button>
          <button
            type="button"
            className={side === "tails" ? "is-active" : ""}
            disabled={busy}
            onClick={() => setSide("tails")}
          >
            Tails
          </button>
        </div>

        {error ? <p className="error-text">{error}</p> : null}

        <button
          type="button"
          className="btn btn--primary btn--block"
          disabled={busy}
          onClick={() => void onFlip()}
        >
          {busy ? "Flipping…" : "Flip coin"}
        </button>
      </div>
    </div>
  );
}
