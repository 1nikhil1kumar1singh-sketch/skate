"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useSkate } from "@/hooks/useSkate";
import { minesLadder } from "@/lib/minesMath";
import { UseBonusToggle } from "@/components/UseBonusToggle";
import { FunPlayToggle } from "@/components/games/FunPlayToggle";
import {
  tryBoostLadder,
  trySoftMineHit,
  TRY_PAYOUT_MULT,
} from "@/lib/tryBoost";
import { toMicroUsdc } from "@/lib/money";

type Phase = "idle" | "open" | "bust" | "cashed";

type RoundState = {
  id: string;
  mines: number;
  ladder: number[];
  revealed: number[];
  multiplier: number;
  mineTiles?: number[];
  stakeMicro?: bigint;
};

function pickMineTiles(count: number): number[] {
  const idx = Array.from({ length: 25 }, (_, i) => i);
  for (let i = idx.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const t = idx[i]!;
    idx[i] = idx[j]!;
    idx[j] = t;
  }
  const soft = Math.max(1, Math.ceil(count / TRY_PAYOUT_MULT));
  return idx.slice(0, soft).sort((a, b) => a - b);
}

export function MinesGame() {
  const {
    user,
    loginDemo,
    setUserBalance,
    useBonus,
    setUseBonus,
    funPlay,
    wallet,
  } = useSkate();
  const maxBet = wallet?.maxBetUsdc ?? 25;
  const [amount, setAmount] = useState(1);
  const [mines, setMines] = useState(3);
  const [phase, setPhase] = useState<Phase>("idle");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [round, setRound] = useState<RoundState | null>(null);

  const previewLadder = useMemo(() => {
    const base = minesLadder(mines);
    return funPlay ? tryBoostLadder(base) : base;
  }, [mines, funPlay]);
  const nextMult =
    round && round.revealed.length < round.ladder.length
      ? round.ladder[round.revealed.length]
      : previewLadder[0];

  async function startFun() {
    if (!(amount > 0) || amount > maxBet) {
      throw new Error(`Bet must be between 0.01 and ${maxBet}`);
    }
    const stakeMicro = toMicroUsdc(amount);
    const base = minesLadder(mines);
    setRound({
      id: `fun_mines_${Date.now()}`,
      mines,
      ladder: tryBoostLadder(base),
      revealed: [],
      multiplier: 1,
      mineTiles: pickMineTiles(mines),
      stakeMicro,
    });
    setPhase("open");
  }

  async function start() {
    setError(null);
    setBusy(true);
    try {
      if (funPlay) {
        await startFun();
        return;
      }
      if (!user) await loginDemo();
      const res = await fetch("/api/games/mines/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount,
          mines,
          useBonus: Boolean(useBonus && user?.balance?.hasBonus),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Start failed");
      setUserBalance(data.balance);
      if (!data.balance?.hasBonus) setUseBonus(false);
      setRound({
        id: data.round.id,
        mines: data.round.mines,
        ladder: data.round.ladder,
        revealed: [],
        multiplier: 1,
      });
      setPhase("open");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Start failed");
    } finally {
      setBusy(false);
    }
  }

  async function revealFun(tile: number) {
    if (!round?.mineTiles || !round.stakeMicro) return;
    let mineTiles = round.mineTiles;
    const hitMine = mineTiles.includes(tile);
    if (hitMine && !trySoftMineHit()) {
      setRound({
        ...round,
        revealed: [...round.revealed, tile],
        multiplier: 0,
      });
      setPhase("bust");
      return;
    }
    if (hitMine) mineTiles = mineTiles.filter((t) => t !== tile);

    const revealed = [...round.revealed, tile];
    const mult = round.ladder[revealed.length - 1] ?? round.multiplier;
    const safeTiles = 25 - mineTiles.length;
    if (revealed.length >= safeTiles) {
      setRound({ ...round, mineTiles, revealed, multiplier: mult });
      setPhase("cashed");
      return;
    }

    setRound({ ...round, mineTiles, revealed, multiplier: mult });
  }

  async function reveal(tile: number) {
    if (!round || phase !== "open" || busy) return;
    if (round.revealed.includes(tile)) return;
    setBusy(true);
    setError(null);
    try {
      if (funPlay) {
        await revealFun(tile);
        return;
      }
      const res = await fetch("/api/games/mines/reveal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roundId: round.id, tile }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Reveal failed");

      if (data.balance) setUserBalance(data.balance);

      if (data.status === "BUST") {
        setRound({
          ...round,
          revealed: data.revealed,
          mineTiles: data.mineTiles,
          multiplier: 0,
        });
        setPhase("bust");
      } else if (data.status === "CASHED") {
        setRound({
          ...round,
          revealed: data.revealed,
          mineTiles: data.mineTiles,
          multiplier: data.multiplier,
        });
        setPhase("cashed");
      } else {
        setRound({
          ...round,
          revealed: data.revealed,
          multiplier: data.multiplier,
        });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Reveal failed");
    } finally {
      setBusy(false);
    }
  }

  async function cashoutFun() {
    setPhase("cashed");
  }

  async function cashout() {
    if (!round || phase !== "open") return;
    setBusy(true);
    setError(null);
    try {
      if (funPlay) {
        await cashoutFun();
        return;
      }
      const res = await fetch("/api/games/mines/cashout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roundId: round.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Cashout failed");
      setUserBalance(data.balance);
      setRound({
        ...round,
        revealed: data.revealed,
        mineTiles: data.mineTiles,
        multiplier: data.multiplier,
      });
      setPhase("cashed");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Cashout failed");
    } finally {
      setBusy(false);
    }
  }

  function reset() {
    setPhase("idle");
    setRound(null);
    setError(null);
  }

  return (
    <div className="game-shell">
      <div className="game-stage mines-stage">
        <p className="game-kicker">Originals · Mines</p>
        <div className="mines-grid">
          {Array.from({ length: 25 }, (_, i) => {
            const isRevealed = round?.revealed.includes(i);
            const isMine = round?.mineTiles?.includes(i);
            const showMine =
              (phase === "bust" || phase === "cashed") && isMine;
            const showGem = isRevealed && !isMine;
            return (
              <motion.button
                key={i}
                type="button"
                className={`mines-tile ${showGem ? "is-gem" : ""} ${showMine ? "is-mine" : ""}`}
                disabled={phase !== "open" || busy || Boolean(isRevealed)}
                onClick={() => void reveal(i)}
                whileTap={{ scale: 0.94 }}
              >
                {showMine ? "●" : showGem ? "◆" : ""}
              </motion.button>
            );
          })}
        </div>
        <p className="game-sub">
          {phase === "bust"
            ? "Hit a mine"
            : phase === "cashed"
              ? `Cashed · ${round?.multiplier.toFixed(2)}x`
              : phase === "open"
                ? `Live · ${round?.multiplier.toFixed(2)}x · next ${nextMult?.toFixed(2)}x`
                : `${mines} mines · pick gems, cash out anytime`}
        </p>
      </div>

      <div className="game-controls">
        {phase === "idle" || phase === "bust" || phase === "cashed" ? (
          <>
            <FunPlayToggle />
            <label className="field">
              <span>Bet amount</span>
              <input
                type="number"
                min={0.01}
                step={0.01}
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
              />
            </label>
            {!funPlay ? <UseBonusToggle /> : null}
            <label className="field">
              <span>Mines · {mines}</span>
              <input
                type="range"
                min={1}
                max={24}
                value={mines}
                onChange={(e) => setMines(Number(e.target.value))}
              />
            </label>
            {error ? <p className="error-text">{error}</p> : null}
            <button
              type="button"
              className="btn btn--primary btn--block"
              disabled={busy}
              onClick={() => {
                if (phase !== "idle") reset();
                void start();
              }}
            >
              {busy
                ? "Starting…"
                : phase === "idle"
                  ? "Start round"
                  : "Play again"}
            </button>
          </>
        ) : (
          <>
            <p className="muted">
              Stake locked. Reveal gems or cash out.
            </p>
            {error ? <p className="error-text">{error}</p> : null}
            <button
              type="button"
              className="btn btn--primary btn--block"
              disabled={busy || !round || round.revealed.length < 1}
              onClick={() => void cashout()}
            >
              Cash out {round?.multiplier.toFixed(2)}x
            </button>
          </>
        )}
      </div>
    </div>
  );
}
