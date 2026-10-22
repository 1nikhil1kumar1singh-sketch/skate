"use client";

import { useSkate } from "@/hooks/useSkate";
import { useAuthModal } from "@/components/AuthModal";

/** Stake-style Real / Fun switch. */
export function FunPlayToggle() {
  const { funPlay, setFunPlay, user } = useSkate();
  const { openAuth } = useAuthModal();

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
            <button
              type="button"
              className="fun-play__signin"
              onClick={() => openAuth("signin")}
            >
              Sign in to play
            </button>
          )}
        </p>
      ) : null}
    </div>
  );
}
