"use client";

import { useRef, useState } from "react";
import { motion } from "framer-motion";
import { useSkate } from "@/hooks/useSkate";
import { AmountField } from "./AmountField";
import type { RpsMove } from "@/lib/gameConstants";
import { sleep } from "@/lib/gameAnim";

const LABELS: Record<RpsMove, string> = {
  rock: "Rock",
  paper: "Paper",
  scissors: "Scissors",
};

const CYCLE: RpsMove[] = ["rock", "paper", "scissors"];

export function RpsGame() {
  const { user, placeBet, loginDemo, funPlay } = useSkate();
  const [amount, setAmount] = useState(1);
  const [move, setMove] = useState<RpsMove>("rock");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [throwing, setThrowing] = useState(false);
  const [housePreview, setHousePreview] = useState<RpsMove | null>(null);
  const [last, setLast] = useState<{
    move: string;
    house: string;
    outcome: string;
  } | null>(null);
  const lock = useRef(false);

  async function play() {
    if (busy || lock.current) return;
    setError(null);
    if (!funPlay && !user) await loginDemo();
    setBusy(true);
    lock.current = true;
    setThrowing(true);
    setLast(null);
    try {
      const res = await placeBet({ game: "rps", amount, move });
      const house = String(res.bet.result.house) as RpsMove;
      for (let i = 0; i < 8; i++) {
        setHousePreview(CYCLE[i % 3]!);
        await sleep(90);
      }
      setHousePreview(house);
      await sleep(200);
      setLast({
        move: String(res.bet.result.move),
        house,
        outcome: String(res.bet.result.outcome),
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setThrowing(false);
      setBusy(false);
      lock.current = false;
    }
  }

  const youLabel = throwing || last ? LABELS[move] : "You";
  const houseLabel = throwing
    ? housePreview
      ? LABELS[housePreview]
      : "…"
    : last
      ? LABELS[last.house as RpsMove]
      : "House";

  return (
    <div className="game-shell">
      <div className="game-stage">
        <p className="game-kicker">Originals · RPS</p>
        <motion.div
          className={`rps-duel ${throwing ? "is-throwing" : ""}`}
          animate={throwing ? { scale: [1, 1.03, 1] } : { scale: 1 }}
          transition={
            throwing
              ? { repeat: Infinity, duration: 0.25 }
              : { duration: 0.2 }
          }
        >
          <span>{youLabel}</span>
          <span className="muted">vs</span>
          <span>{houseLabel}</span>
        </motion.div>
        <p className="game-sub">
          {throwing
            ? "Throwing…"
            : last
              ? last.outcome
              : `Playing ${LABELS[move]}`}
        </p>
      </div>
      <div className="game-controls">
        <AmountField amount={amount} onChange={setAmount} />
        <div className="segmented">
          {(["rock", "paper", "scissors"] as RpsMove[]).map((m) => (
            <button
              key={m}
              type="button"
              className={move === m ? "is-active" : ""}
              disabled={busy}
              onClick={() => setMove(m)}
            >
              {LABELS[m]}
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
          {busy ? "Throwing…" : "Throw"}
        </button>
      </div>
    </div>
  );
}
