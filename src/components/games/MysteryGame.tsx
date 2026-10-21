"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useSkate } from "@/hooks/useSkate";
import { MYSTERY_STAKE_USDC } from "@/lib/promoOdds";
import { UseBonusToggle } from "@/components/UseBonusToggle";
import { FunPlayToggle } from "@/components/games/FunPlayToggle";

export function MysteryGame() {
  const { user, placeBet, loginDemo, funPlay } = useSkate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [prize, setPrize] = useState<number | null>(null);
  const [openKey, setOpenKey] = useState(0);

  async function onOpen() {
    setError(null);
    if (!funPlay && !user) await loginDemo();
    setBusy(true);
    setOpenKey((k) => k + 1);
    try {
      const result = await placeBet({ game: "mystery" });
      setPrize(Number(result.bet.result.prizeUsd ?? 0));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Open failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="game-shell">
      <div className="game-stage">
        <p className="game-kicker">Originals · Mystery Box</p>
        <motion.div
          key={openKey}
          className={`mystery-box ${prize != null ? "is-open" : ""}`}
          initial={{ scale: 0.92, rotate: -4 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 260, damping: 18 }}
        >
          <span>{prize != null ? `$${prize}` : "?"}</span>
        </motion.div>
        <p className="game-sub">
          {prize != null
            ? `Opened · ${prize.toFixed(2)}`
            : `Stake $${MYSTERY_STAKE_USDC}`}
        </p>
      </div>

      <div className="game-controls">
        <FunPlayToggle />
        {!funPlay ? <UseBonusToggle /> : null}
        {error ? <p className="error-text">{error}</p> : null}
        <button
          type="button"
          className="btn btn--primary btn--block"
          disabled={busy}
          onClick={() => void onOpen()}
        >
          {busy ? "Opening…" : `Open · $${MYSTERY_STAKE_USDC}`}
        </button>
      </div>
    </div>
  );
}
