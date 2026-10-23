"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  formatRefreshCountdown,
  getDemoLeaderboard,
  leaderboardDayKey,
  leaderboardRefreshMeta,
  PRIZE_POOL_USD,
  seasonProgress,
  tierTotals,
  WINNER_SLOTS,
} from "@/lib/leaderboard";

function money(n: number) {
  return n.toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

export default function LeaderboardPage() {
  const [now, setNow] = useState(() => new Date());
  const dayKey = leaderboardDayKey(now);
  const rows = useMemo(() => getDemoLeaderboard(now), [dayKey]); // eslint-disable-line react-hooks/exhaustive-deps -- dayKey gates daily reshuffle
  const refresh = leaderboardRefreshMeta(now);
  const tiers = tierTotals();
  const season = seasonProgress();

  useEffect(() => {
    const id = window.setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <main className="promo-page">
      <section className="promo-hero promo-hero--visual">
        <div className="promo-hero__media" aria-hidden>
          <Image
            src="/games/limbo.jpg"
            alt=""
            fill
            priority
            className="promo-hero__img"
            sizes="100vw"
          />
          <div className="promo-hero__veil" />
        </div>
        <div className="promo-hero__copy">
          <p className="promo-kicker">Trading league</p>
          <h1>Leaderboard</h1>
          <p className="promo-lead">
            ${PRIZE_POOL_USD.toLocaleString()} season pool · top {WINNER_SLOTS}{" "}
            share the prizes.
          </p>
        </div>

        <div className="season-timer" aria-label="Season countdown">
          <div className="season-timer__clock">
            <div className="season-timer__block">
              <strong>{String(season.daysLeft).padStart(2, "0")}</strong>
              <span>Days left</span>
            </div>
            <span className="season-timer__sep" aria-hidden>
              :
            </span>
            <div className="season-timer__block">
              <strong>{String(season.daysPassed).padStart(2, "0")}</strong>
              <span>Days in</span>
            </div>
            <span className="season-timer__sep" aria-hidden>
              /
            </span>
            <div className="season-timer__block">
              <strong>{String(season.totalDays).padStart(2, "0")}</strong>
              <span>Total</span>
            </div>
          </div>
          <div className="season-meter__track">
            <div
              className="season-meter__fill"
              style={{ width: `${season.pct}%` }}
            />
          </div>
        </div>

        <div className="promo-stats">
          <div>
            <span>Prize pool</span>
            <strong>{money(PRIZE_POOL_USD)}</strong>
          </div>
          <div>
            <span>Winners</span>
            <strong>{WINNER_SLOTS}</strong>
          </div>
          <div>
            <span>Next refresh</span>
            <strong>{formatRefreshCountdown(refresh.msUntilRefresh)}</strong>
          </div>
        </div>
      </section>

      <section className="promo-card">
        <div className="promo-card__head">
          <h2>Prize tiers</h2>
        </div>
        <div className="prize-tiers">
          {tiers.map((t) => (
            <div key={t.label} className="prize-tier">
              <div>
                <strong>{t.label}</strong>
                <span className="muted">
                  {t.slots} winner{t.slots === 1 ? "" : "s"}
                </span>
              </div>
              <div className="prize-tier__pay">
                <strong>{money(t.prizeUsd)}</strong>
                <span className="muted">each</span>
              </div>
              <span className="prize-tier__total">{money(t.totalUsd)}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="promo-card">
        <div className="promo-card__head promo-card__head--row">
          <div>
            <h2>Standings</h2>
          </div>
          <Link href="/" className="btn btn--primary btn--compact">
            Play
          </Link>
        </div>
        <div className="lb-table" role="table">
          <div className="lb-table__head" role="row">
            <span>#</span>
            <span>Player</span>
            <span>Wagered</span>
            <span>Prize</span>
          </div>
          {rows.map((row) => (
            <div
              key={`${dayKey}-${row.rank}-${row.name}`}
              className={`lb-table__row ${row.rank <= 3 ? "is-podium" : ""}`}
              role="row"
            >
              <span className="lb-rank">{row.rank}</span>
              <span className="lb-name">{row.name}</span>
              <span className="muted">${row.wagered.toLocaleString()}</span>
              <span className="lb-prize">{money(row.prizeUsd)}</span>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
