"use client";

import { useRef, useState } from "react";
import { motion } from "framer-motion";
import { useSkate } from "@/hooks/useSkate";
import { AmountField } from "./AmountField";
import { animateScramble, sleep } from "@/lib/gameAnim";

type Mode = "red" | "black" | "odd" | "even" | "number";

export function RouletteGame() {
  const { user, placeBet, loginDemo, funPlay } = useSkate();
  const [amount, setAmount] = useState(1);
  const [mode, setMode] = useState<Mode>("red");
  const [number, setNumber] = useState(7);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [spinning, setSpinning] = useState(false);
  const [display, setDisplay] = useState<number | null>(null);
  const [spinDeg, setSpinDeg] = useState(0);
  const [last, setLast] = useState<{
    pocket: number;
    color: string;
    won: boolean;
  } | null>(null);
  const lock = useRef(false);

  async function play() {
    if (busy || lock.current) return;
    setError(null);
    if (!funPlay && !user) await loginDemo();
    setBusy(true);
    lock.current = true;
    setSpinning(true);
    setLast(null);
    setSpinDeg((d) => d + 720 + Math.floor(Math.random() * 360));
    try {
      const body =
        mode === "red" || mode === "black"
          ? { game: "roulette", amount, kind: "color", color: mode }
          : mode === "odd" || mode === "even"
            ? { game: "roulette", amount, kind: "parity", parity: mode }
            : { game: "roulette", amount, kind: "number", number };

      const res = await placeBet(body);
      const pocket = Number(res.bet.result.pocket);
      await animateScramble(
        pocket,
        (v) => setDisplay(Math.floor(v)),
        1400,
        () => Math.floor(Math.random() * 37),
      );
      await sleep(120);
      setDisplay(pocket);
      setLast({
        pocket,
        color: String(res.bet.result.color),
        won: res.bet.won,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setSpinning(false);
      setBusy(false);
      lock.current = false;
    }
  }

  const shown = display ?? last?.pocket ?? null;
  const colorClass = spinning ? "" : (last?.color ?? "");

  return (
    <div className="game-shell">
      <div className="game-stage">
        <p className="game-kicker">Originals · Roulette</p>
        <motion.div
          className={`roulette-ball ${colorClass} ${spinning ? "is-spinning" : ""} ${last && !spinning ? (last.won ? "is-win" : "is-loss") : ""}`}
          animate={{ rotate: spinDeg }}
          transition={{ duration: 1.5, ease: [0.12, 0.7, 0.15, 1] }}
        >
          {shown != null ? shown : "?"}
        </motion.div>
        <p className="game-sub">
          {spinning
            ? "Spinning…"
            : last
              ? `${last.color} ${last.pocket} · ${last.won ? "hit" : "miss"}`
              : "European 0–36"}
        </p>
      </div>
      <div className="game-controls">
        <AmountField amount={amount} onChange={setAmount} />
        <div className="segmented segmented--wrap">
          {(["red", "black", "odd", "even", "number"] as Mode[]).map((m) => (
            <button
              key={m}
              type="button"
              className={mode === m ? "is-active" : ""}
              disabled={busy}
              onClick={() => setMode(m)}
            >
              {m}
            </button>
          ))}
        </div>
        {mode === "number" ? (
          <label className="field">
            <span>Pocket 0–36</span>
            <input
              type="number"
              min={0}
              max={36}
              value={number}
              disabled={busy}
              onChange={(e) => setNumber(Number(e.target.value))}
            />
          </label>
        ) : null}
        {error ? <p className="error-text">{error}</p> : null}
        <button
          type="button"
          className="btn btn--primary btn--block"
          disabled={busy}
          onClick={() => void play()}
        >
          {busy ? "Spinning…" : "Spin"}
        </button>
      </div>
    </div>
  );
}
