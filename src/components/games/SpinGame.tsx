"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useSkate } from "@/hooks/useSkate";
import {
  SPIN_PRIZES_USDC,
  SPIN_STAKE_USDC,
  spinWheelSegments,
  spinWinChancePct,
  type SpinPrizeTarget,
} from "@/lib/promoOdds";
import { UseBonusToggle } from "@/components/UseBonusToggle";
import { FunPlayToggle } from "@/components/games/FunPlayToggle";

export function SpinGame() {
  const { user, placeBet, loginDemo, funPlay } = useSkate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [prize, setPrize] = useState<number | null>(null);
  const [target, setTarget] = useState<SpinPrizeTarget>(5);
  const [spinKey, setSpinKey] = useState(0);
  const [rotation, setRotation] = useState(0);

  const segments = useMemo(() => spinWheelSegments(target), [target]);
  const winPct = spinWinChancePct(target);

  async function onSpin() {
    setError(null);
    if (!funPlay && !user) await loginDemo();
    setBusy(true);
    setSpinKey((k) => k + 1);
    try {
      const result = await placeBet({ game: "spin", prize: target });
      const prizeUsd = Number(result.bet.result.prizeUsd ?? 0);
      setPrize(prizeUsd);
      const idx = Math.max(
        0,
        prizeUsd > 0
          ? segments.findIndex((s) => s === prizeUsd)
          : segments.findIndex((s) => s === 0),
      );
      const slice = 360 / segments.length;
      setRotation((r) => r + 360 * 5 + (360 - idx * slice - slice / 2));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Spin failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="game-shell">
      <div className="game-stage">
        <p className="game-kicker">Originals · Spin & Win</p>
        <motion.div
          key={`${spinKey}-${target}`}
          className="spin-wheel"
          animate={{ rotate: rotation }}
          transition={{ duration: 2.4, ease: [0.12, 0.75, 0.15, 1] }}
        >
          {segments.map((seg, i) => (
            <span
              key={`${seg}-${i}`}
              className={`spin-seg ${seg > 0 ? "is-prize" : "is-miss"}`}
              style={{
                transform: `rotate(${(360 / segments.length) * i}deg)`,
              }}
            >
              {seg > 0 ? `$${seg}` : "—"}
            </span>
          ))}
        </motion.div>
        <div className="spin-pointer" />
        <p className="game-sub">
          {prize != null
            ? prize > 0
              ? `Won $${prize.toFixed(0)}`
              : "No prize"
            : `$${SPIN_STAKE_USDC} → $${target}`}
        </p>
      </div>

      <div className="game-controls">
        <FunPlayToggle />
        <div className="spin-targets" role="group" aria-label="Prize target">
          {SPIN_PRIZES_USDC.map((p) => (
            <button
              key={p}
              type="button"
              className={target === p ? "is-active" : undefined}
              disabled={busy}
              onClick={() => {
                setTarget(p);
                setPrize(null);
              }}
            >
              <strong>${p}</strong>
              <span>{spinWinChancePct(p).toFixed(1)}% win</span>
            </button>
          ))}
        </div>
        <p className="muted spin-odds-line">
          Stake ${SPIN_STAKE_USDC} · win ${target} at {winPct.toFixed(1)}%
        </p>
        {!funPlay ? <UseBonusToggle /> : null}
        {error ? <p className="error-text">{error}</p> : null}
        <button
          type="button"
          className="btn btn--primary btn--block"
          disabled={busy}
          onClick={() => void onSpin()}
        >
          {busy ? "Spinning…" : `Spin for $${target}`}
        </button>
      </div>
    </div>
  );
}
