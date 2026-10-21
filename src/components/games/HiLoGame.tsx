"use client";

import { useRef, useState } from "react";
import { motion } from "framer-motion";
import { useSkate } from "@/hooks/useSkate";
import { AmountField } from "./AmountField";
import { sleep } from "@/lib/gameAnim";

type Guess = "higher" | "lower" | "same";

export function HiLoGame() {
  const { user, placeBet, loginDemo, funPlay } = useSkate();
  const [amount, setAmount] = useState(1);
  const [guess, setGuess] = useState<Guess>("higher");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dealing, setDealing] = useState(false);
  const [startRank, setStartRank] = useState<string | null>(null);
  const [nextRank, setNextRank] = useState<string | null>(null);
  const [last, setLast] = useState<{
    startRank: string;
    nextRank: string;
    won: boolean;
  } | null>(null);
  const lock = useRef(false);

  async function play() {
    if (busy || lock.current) return;
    setError(null);
    if (!funPlay && !user) await loginDemo();
    setBusy(true);
    lock.current = true;
    setDealing(true);
    setLast(null);
    setNextRank(null);
    setStartRank("?");
    try {
      const res = await placeBet({ game: "hilo", amount, guess });
      const start = String(res.bet.result.startRank);
      const next = String(res.bet.result.nextRank);
      setStartRank(start);
      await sleep(450);
      setNextRank("?");
      await sleep(350);
      setNextRank(next);
      await sleep(150);
      setLast({
        startRank: start,
        nextRank: next,
        won: res.bet.won,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
      setStartRank(null);
      setNextRank(null);
    } finally {
      setDealing(false);
      setBusy(false);
      lock.current = false;
    }
  }

  return (
    <div className="game-shell">
      <div className="game-stage">
        <p className="game-kicker">Originals · Hi-Lo</p>
        <div className="hilo-cards">
          <motion.div
            className="playing-card"
            key={`a-${startRank ?? "idle"}`}
            initial={{ rotateY: 90, opacity: 0.4 }}
            animate={{ rotateY: 0, opacity: 1 }}
            transition={{ duration: 0.35 }}
          >
            {startRank ?? "?"}
          </motion.div>
          <span className="muted">→</span>
          <motion.div
            className={`playing-card ${last ? (last.won ? "is-win" : "is-loss") : ""}`}
            key={`b-${nextRank ?? "idle"}-${last?.won ?? "x"}`}
            initial={{ rotateY: 90, opacity: 0.4 }}
            animate={{ rotateY: 0, opacity: 1 }}
            transition={{ duration: 0.4 }}
          >
            {nextRank ?? "?"}
          </motion.div>
        </div>
        <p className="game-sub">
          {dealing
            ? "Dealing…"
            : last
              ? `${last.startRank} → ${last.nextRank} · ${last.won ? "correct" : "wrong"}`
              : `Guess ${guess}`}
        </p>
      </div>
      <div className="game-controls">
        <AmountField amount={amount} onChange={setAmount} />
        <div className="segmented">
          {(["higher", "lower", "same"] as Guess[]).map((g) => (
            <button
              key={g}
              type="button"
              className={guess === g ? "is-active" : ""}
              disabled={busy}
              onClick={() => setGuess(g)}
            >
              {g}
            </button>
          ))}
        </div>
        {error ? <p className="error-text">{error}</p> : null}
        <button
          type="button"
          className="btn btn--primary btn--block"
          disabled={busy}
          onClick={() => void play()}
        >
          {busy ? "Dealing…" : "Deal"}
        </button>
      </div>
    </div>
  );
}
