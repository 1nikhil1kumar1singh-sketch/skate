"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  BONUS_MATCH_BPS,
  BONUS_MAX_USDC,
} from "@/lib/bonus";
import { REFERRAL_REWARD_USD } from "@/lib/referral";
import { OFFER_POPUP_STORAGE_KEY } from "@/lib/offers";

export function OfferPopup() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const forcePreview = searchParams.get("preview") === "offer";
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (forcePreview) {
      setOpen(true);
      return;
    }
    if (pathname === "/offers" || pathname === "/terms") return;
    try {
      if (window.localStorage.getItem(OFFER_POPUP_STORAGE_KEY) === "1") return;
    } catch {
      /* ignore */
    }
    const t = window.setTimeout(() => setOpen(true), 700);
    return () => window.clearTimeout(t);
  }, [pathname, forcePreview]);

  function dismiss() {
    setOpen(false);
    if (forcePreview) return;
    try {
      window.localStorage.setItem(OFFER_POPUP_STORAGE_KEY, "1");
    } catch {
      /* ignore */
    }
  }

  if (!open) return null;

  return (
    <div className="offer-popup" role="dialog" aria-modal="true" aria-labelledby="offer-popup-title">
      <button
        type="button"
        className="offer-popup__backdrop"
        aria-label="Close offer"
        onClick={dismiss}
      />
      <div className="offer-popup__card">
        <button
          type="button"
          className="offer-popup__close"
          aria-label="Dismiss"
          onClick={dismiss}
        >
          ×
        </button>

        <div className="offer-popup__body">
          <p className="offer-popup__hello" id="offer-popup-title">
            Congratulations!
          </p>
          <p className="offer-popup__amount">${BONUS_MAX_USDC}</p>
          <p className="offer-popup__sub">
            {BONUS_MATCH_BPS / 100}% first deposit bonus up to ${BONUS_MAX_USDC}
          </p>
          <p className="offer-popup__extra">
            + ${REFERRAL_REWARD_USD} per referral
          </p>

          <div className="offer-popup__coin" aria-hidden>
            <div className="offer-popup__coin-face">$</div>
            <div className="offer-popup__coin-base" />
          </div>
        </div>

        <div className="offer-popup__actions">
          <Link
            href="/profile"
            className="offer-popup__claim"
            onClick={dismiss}
          >
            Claim now
          </Link>
          <Link href="/offers" className="offer-popup__more" onClick={dismiss}>
            View all offers
          </Link>
        </div>
      </div>
    </div>
  );
}
