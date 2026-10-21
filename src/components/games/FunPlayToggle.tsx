"use client";

import { useSkate } from "@/hooks/useSkate";

/** Stake-style Real / Fun switch. */
export function FunPlayToggle() {
  const { funPlay, setFunPlay, user } = useSkate();

  return (
    <div className={`fun-play ${funPlay ? "is-fun" : ""}`}>
      <div className="fun-play__switch" role="group" aria-label="Play mode">
        <button
          type="button"
          className={!funPlay ? "is-active" : undefined}
          onClick={() => setFunPlay(false)}
        >
          Real
        </button>
        <button
          type="button"
          className={funPlay ? "is-active" : undefined}
          onClick={() => setFunPlay(true)}
        >
          Fun
        </button>
      </div>
      {!funPlay ? (
        <p className="fun-play__meta">
          {user ? (
            <span>{user.balance.availableDisplay}</span>
          ) : (
            <span>Sign in to play</span>
          )}
        </p>
      ) : null}
    </div>
  );
}
