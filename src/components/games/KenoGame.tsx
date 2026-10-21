"use client";

import { useRef, useState } from "react";
import { useSkate } from "@/hooks/useSkate";
import { AmountField } from "./AmountField";
import { KENO_POOL } from "@/lib/gameConstants";
import { animateSequence } from "@/lib/gameAnim";

export function KenoGame() {
  const { user, placeBet, loginDemo, funPlay } = useSkate();
  const [amount, setAmount] = useState(1);
  const [picks, setPicks] = useState<number[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [drawn, setDrawn] = useState<number[]>([]);
  const [hits, setHits] = useState<number | null>(null);
  const [won, setWon] = useState(false);
  const [drawing, setDrawing] = useState(false);
  const lock = useRef(false);

  function toggle(n: number) {
    if (busy) return;
    setPicks((prev) => {
      if (prev.includes(n)) return prev.filter((x) => x !== n);
      if (prev.length >= 10) return prev;
      return [...prev, n].sort((a, b) => a - b);
    });
  }

  async function play() {
    if (busy || lock.current) return;
    setError(null);
    if (picks.length < 1) {
      setError("Pick at least one number");
      return;
    }
    if (!funPlay && !user) await loginDemo();
    setBusy(true);
    lock.current = true;
    setDrawn([]);
    setHits(null);
    setWon(false);
    setDrawing(true);
    try {
      const res = await placeBet({ game: "keno", amount, picks });
      const full = (res.bet.result.drawn as number[]) ?? [];
      await animateSequence(full, (soFar) => setDrawn(soFar), 110);
      setHits(Number(res.bet.result.hits ?? 0));
      setWon(res.bet.won);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setDrawing(false);
      setBusy(false);
      lock.current = false;
    }
  }

  return (
    <div className="game-shell">
      <div className="game-stage keno-stage">
        <p className="game-kicker">Originals · Keno</p>
        <div className="keno-board">
          {Array.from({ length: KENO_POOL }, (_, i) => i + 1).map((n) => {
            const selected = picks.includes(n);
            const hit = drawn.includes(n) && selected;
            const drawnOnly = drawn.includes(n) && !selected;
            const justHit = drawing && hit;
            return (
              <button
                key={n}
                type="button"
                className={`keno-cell ${selected ? "is-pick" : ""} ${hit ? "is-hit" : ""} ${drawnOnly ? "is-drawn" : ""} ${justHit ? "is-pop" : ""}`}
                disabled={busy}
                onClick={() => toggle(n)}
              >
                {n}
              </button>
            );
          })}
        </div>
        <p className="game-sub">
          {drawing
            ? `Drawing… ${drawn.length}/10`
            : hits != null
              ? `${hits} hit${hits === 1 ? "" : "s"} · ${won ? "paid" : "miss"}`
              : `${picks.length}/10 selected · draw 10`}
        </p>
      </div>
      <div className="game-controls">
        <AmountField amount={amount} onChange={setAmount} />
        <button
          type="button"
          className="btn btn--ghost"
          disabled={busy}
          onClick={() => setPicks([])}
        >
          Clear picks
        </button>
        {error ? <p className="error-text">{error}</p> : null}
        <button
          type="button"
          className="btn btn--primary btn--block"
          disabled={busy}
          onClick={() => void play()}
        >
          {busy ? "Drawing…" : "Play keno"}
        </button>
      </div>
    </div>
  );
}
