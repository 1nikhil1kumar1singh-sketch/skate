"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSkate } from "@/hooks/useSkate";
import { useAuthModal } from "@/components/AuthModal";
import {
  REFERRAL_REWARD_USD,
  REFERRAL_RULES,
  type ReferralRowView,
  type ReferralSummaryView,
} from "@/lib/referral";

type ReferralPayload = {
  code: string;
  summary: ReferralSummaryView;
  referrals: ReferralRowView[];
  pendingSettlement: {
    count: number;
    totalDisplay: string;
    totalUsd: number;
    nextUnlockAt: string | null;
    nextUnlockDaysLeft: number | null;
    items: ReferralRowView[];
  };
};

function statusLabel(status: ReferralRowView["status"]) {
  switch (status) {
    case "pending":
      return "Pending";
    case "settled":
      return "Settled";
    case "void":
      return "Void";
    default:
      return "Awaiting play";
  }
}

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function ReferralPage() {
  const { user, loading, setUserBalance } = useSkate();
  const { openAuth } = useAuthModal();
  const [copied, setCopied] = useState(false);
  const [data, setData] = useState<ReferralPayload | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [fetching, setFetching] = useState(false);

  const code = useMemo(() => {
    if (data?.code) return data.code;
    if (!user) return "klasshi";
    return (user.depositPath || user.id.slice(0, 8)).toLowerCase();
  }, [data?.code, user]);

  const link = useMemo(() => {
    if (typeof window === "undefined") return `https://klasshi.com/?ref=${code}`;
    return `${window.location.origin}/?ref=${encodeURIComponent(code)}`;
  }, [code]);

  const loadReferrals = useCallback(async () => {
    if (!user) {
      setData(null);
      return;
    }
    setFetching(true);
    setFetchError(null);
    try {
      const res = await fetch("/api/referral", { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to load");
      setData(json as ReferralPayload);
      if (json.balance) setUserBalance(json.balance);
    } catch (e) {
      setFetchError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setFetching(false);
    }
  }, [user, setUserBalance]);

  useEffect(() => {
    void loadReferrals();
  }, [loadReferrals]);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  }

  const summary = data?.summary;
  const pending = data?.pendingSettlement;

  return (
    <main className="promo-page">
      <section className="promo-hero">
        <p className="promo-kicker">Invite</p>
        <h1>Referral</h1>
        <p className="promo-lead">
          Earn ${REFERRAL_REWARD_USD} when a friend plays.
        </p>
      </section>

      <section className="promo-card">
        <div className="promo-card__head">
          <h2>Your link</h2>
        </div>

        {!user ? (
          <div className="ref-gate">
            <p>Sign in to get your referral link.</p>
            <button
              type="button"
              className="btn btn--primary"
              disabled={loading}
              onClick={() => openAuth("signin")}
            >
              Sign in
            </button>
          </div>
        ) : (
          <div className="ref-share">
            <label className="field">
              <span>Code</span>
              <input value={code} readOnly />
            </label>
            <label className="field">
              <span>Link</span>
              <div className="ref-link-row">
                <input value={link} readOnly spellCheck={false} />
                <button
                  type="button"
                  className="btn btn--primary"
                  onClick={() => void copyLink()}
                >
                  {copied ? "Copied" : "Copy"}
                </button>
              </div>
            </label>
            <div className="promo-stats promo-stats--tight">
              <div>
                <span>Invites</span>
                <strong>{summary?.invites ?? 0}</strong>
              </div>
              <div>
                <span>Pending</span>
                <strong>{summary?.pendingDisplay ?? "$0.00"}</strong>
              </div>
              <div>
                <span>Settled</span>
                <strong>{summary?.settledDisplay ?? "$0.00"}</strong>
              </div>
            </div>
          </div>
        )}
      </section>

      {user ? (
        <>
          <section className="promo-card">
            <div className="promo-card__head promo-card__head--row">
              <div>
                <h2>Pending settlement</h2>
              </div>
              <button
                type="button"
                className="btn btn--ghost btn--compact"
                disabled={fetching}
                onClick={() => void loadReferrals()}
              >
                {fetching ? "Refreshing…" : "Refresh"}
              </button>
            </div>

            {fetchError ? <p className="error-text">{fetchError}</p> : null}

            {!pending || pending.count === 0 ? (
              <p className="ref-empty">No pending settlement.</p>
            ) : (
              <>
                <div className="ref-pending-summary">
                  <div>
                    <span>Total pending</span>
                    <strong>{pending.totalDisplay}</strong>
                  </div>
                  <div>
                    <span>Rewards</span>
                    <strong>{pending.count}</strong>
                  </div>
                  <div>
                    <span>Next unlock</span>
                    <strong>
                      {pending.nextUnlockDaysLeft != null
                        ? pending.nextUnlockDaysLeft === 0
                          ? "Ready"
                          : `${pending.nextUnlockDaysLeft}d`
                        : "—"}
                    </strong>
                  </div>
                </div>

                <div className="ref-table">
                  <div className="ref-table__head">
                    <span>Friend</span>
                    <span>Amount</span>
                    <span>Unlocks</span>
                    <span>Left</span>
                  </div>
                  {pending.items.map((row) => (
                    <div key={row.id} className="ref-table__row">
                      <span className="ref-name">{row.displayName}</span>
                      <span className="ref-amount">{row.rewardDisplay}</span>
                      <span>{formatDate(row.unlockAt)}</span>
                      <span className="ref-days">
                        {row.daysLeft != null
                          ? row.daysLeft === 0
                            ? "Today"
                            : `${row.daysLeft}d`
                          : "—"}
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </section>

          <section className="promo-card">
            <div className="promo-card__head">
              <h2>Referrals</h2>
            </div>

            {!data?.referrals.length ? (
              <p className="ref-empty">No referrals yet.</p>
            ) : (
              <div className="ref-table ref-table--list">
                <div className="ref-table__head">
                  <span>Friend</span>
                  <span>Joined</span>
                  <span>Status</span>
                  <span>Reward</span>
                </div>
                {data.referrals.map((row) => (
                  <div
                    key={row.id}
                    className={`ref-table__row is-${row.status}`}
                  >
                    <span className="ref-name">{row.displayName}</span>
                    <span>{formatDate(row.joinedAt)}</span>
                    <span className="ref-status">{statusLabel(row.status)}</span>
                    <span className="ref-amount">
                      {row.status === "joined" ? "—" : row.rewardDisplay}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      ) : null}

      <section className="promo-card">
        <div className="promo-card__head">
          <h2>Terms</h2>
        </div>
        <ul className="ref-rules">
          {REFERRAL_RULES.map((rule) => (
            <li key={rule}>{rule}</li>
          ))}
        </ul>
      </section>
    </main>
  );
}
