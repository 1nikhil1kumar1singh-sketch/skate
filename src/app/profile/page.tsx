"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSkate } from "@/hooks/useSkate";
import { fromMicroUsdc } from "@/lib/money";
import { Pagination } from "@/components/Pagination";

type ActivityItem = {
  id: string;
  kind: "deposit" | "withdrawal";
  amount: string;
  status: string;
  createdAt: string;
};

type Panel = "cashier" | "account" | "fairness" | "activity";

const ACTIVITY_PAGE_SIZE = 10;

function shortAddr(value: string, head = 6, tail = 4) {
  if (value.length <= head + tail + 1) return value;
  return `${value.slice(0, head)}…${value.slice(-tail)}`;
}

function formatWhen(iso: string) {
  try {
    return new Intl.DateTimeFormat(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export default function ProfilePage() {
  const router = useRouter();
  const {
    user,
    loading,
    liveWallet,
    solana,
    wallet,
    logout,
    deposit,
    withdraw,
    syncDeposits,
    updateProfile,
    refresh,
  } = useSkate();

  useEffect(() => {
    if (!loading && !user) router.replace("/");
  }, [loading, user, router]);

  const [panel, setPanel] = useState<Panel>("cashier");
  const [cashTab, setCashTab] = useState<"deposit" | "withdraw">("deposit");
  const [displayName, setDisplayName] = useState("");
  const [walletAddress, setWalletAddress] = useState("");
  const [depositAmount, setDepositAmount] = useState(50);
  const [withdrawAmount, setWithdrawAmount] = useState(10);
  const [withdrawTo, setWithdrawTo] = useState("");
  const [withdrawAsset, setWithdrawAsset] = useState<"USDC" | "USDT">("USDC");
  const [busy, setBusy] = useState<string | null>(null);
  const [toast, setToast] = useState<{ kind: "ok" | "err"; text: string } | null>(
    null,
  );
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [activityPage, setActivityPage] = useState(1);
  const [activityTotal, setActivityTotal] = useState(0);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const stables = (solana?.acceptedStables ?? ["USDC"]) as ("USDC" | "USDT")[];
  const withdrawAssets = useMemo(() => {
    const list = stables.filter((s) => s === "USDC" || s === "USDT");
    return list.length > 0 ? list : (["USDC"] as ("USDC" | "USDT")[]);
  }, [stables]);
  const feePreview = useMemo(() => {
    const bps = wallet?.withdrawFeeBps ?? 300;
    const fee = (withdrawAmount * bps) / 10_000;
    return { fee, sent: Math.max(0, withdrawAmount - fee), pct: bps / 100 };
  }, [withdrawAmount, wallet?.withdrawFeeBps]);

  useEffect(() => {
    if (!user) return;
    setDisplayName(user.displayName ?? "");
    setWalletAddress(user.walletAddress ?? "");
    setWithdrawTo(user.walletAddress ?? "");
  }, [user]);

  useEffect(() => {
    if (!withdrawAssets.includes(withdrawAsset)) {
      setWithdrawAsset(withdrawAssets[0] ?? "USDC");
    }
  }, [withdrawAssets, withdrawAsset]);

  const loadHistory = useCallback(async (page = 1) => {
    const res = await fetch(
      `/api/wallet/history?page=${page}&limit=${ACTIVITY_PAGE_SIZE}`,
      { cache: "no-store" },
    );
    if (!res.ok) return;
    const data = await res.json();
    setActivity(data.items ?? []);
    setActivityTotal(Number(data.total ?? 0));
    setActivityPage(Number(data.page ?? page));
  }, []);

  useEffect(() => {
    if (user) void loadHistory(1);
  }, [user?.id, user?.balance.available, loadHistory]);

  function flash(kind: "ok" | "err", text: string) {
    setToast({ kind, text });
  }

  async function copy(key: string, text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      flash("ok", "Copied to clipboard");
      setTimeout(() => setCopiedKey(null), 1400);
    } catch {
      flash("err", "Copy failed");
    }
  }

  async function saveProfile() {
    setBusy("profile");
    try {
      await updateProfile({
        displayName: displayName.trim() || undefined,
        walletAddress: walletAddress.trim() || undefined,
      });
      flash("ok", "Account updated");
      await refresh();
    } catch (e) {
      flash("err", e instanceof Error ? e.message : "Save failed");
    } finally {
      setBusy(null);
    }
  }

  async function onDeposit() {
    setBusy("deposit");
    try {
      const dep = await deposit({ demo: true, amount: depositAmount });
      const bonus = Number(dep.bonusGranted ?? 0);
      flash(
        "ok",
        bonus > 0
          ? `Added $${depositAmount} · +$${(bonus / 1e6).toFixed(0)} bonus`
          : `Added $${depositAmount}`,
      );
      await loadHistory(1);
    } catch (e) {
      flash("err", e instanceof Error ? e.message : "Deposit failed");
    } finally {
      setBusy(null);
    }
  }

  async function onSyncDeposit() {
    setBusy("sync");
    try {
      const data = await syncDeposits();
      const credited = (Number(data.credited ?? 0) / 1e6).toFixed(2);
      flash("ok", `Synced · +${credited} USDC credited`);
      await refresh();
      await loadHistory(1);
    } catch (e) {
      flash("err", e instanceof Error ? e.message : "Sync failed");
    } finally {
      setBusy(null);
    }
  }

  async function onWithdraw() {
    if (!withdrawTo.trim()) {
      flash("err", "Enter a Solana destination address");
      return;
    }
    setBusy("withdraw");
    try {
      const result = await withdraw({
        amount: withdrawAmount,
        toAddress: withdrawTo.trim(),
        asset: withdrawAsset,
        demo: !liveWallet,
      });
      const sentAmt = result.sent
        ? fromMicroUsdc(result.sent)
        : feePreview.sent;
      const asset = result.asset ?? withdrawAsset;
      flash("ok", `Withdrew ${sentAmt.toFixed(2)} ${asset}`);
      await loadHistory(1);
    } catch (e) {
      flash("err", e instanceof Error ? e.message : "Withdraw failed");
    } finally {
      setBusy(null);
    }
  }

  if (loading) {
    return (
      <main className="vault-page">
        <div className="vault-skeleton">Loading wallet…</div>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="vault-page">
        <div className="vault-skeleton">Redirecting to lobby…</div>
      </main>
    );
  }

  const initial = (user.displayName ?? "S").slice(0, 1).toUpperCase();

  return (
    <main className="vault-page">
      <section className="vault-hero">
        <div className="vault-hero__identity">
          <div className="vault-avatar" aria-hidden>
            {initial}
          </div>
          <div className="vault-hero__copy">
            <p className="vault-kicker">Cashier</p>
            <h1>{user.displayName ?? "Player"}</h1>
            <p className="vault-meta">
              <span
                className={`vault-meta__status ${liveWallet ? "is-live" : "is-demo"}`}
              >
                {liveWallet ? "Live" : "Demo"}
              </span>
              {liveWallet && solana?.cluster ? (
                <>
                  <span className="vault-meta__sep" aria-hidden>
                    ·
                  </span>
                  <span>
                    {solana.cluster.charAt(0).toUpperCase() +
                      solana.cluster.slice(1)}
                  </span>
                </>
              ) : null}
              <span className="vault-meta__sep" aria-hidden>
                ·
              </span>
              <span>{stables.join(" · ")}</span>
            </p>
          </div>
        </div>

        <div className="vault-hero__balance">
          <span className="vault-balance-label">Available balance</span>
          <p className="vault-balance-value">
            {user.balance.availableDisplay}
          </p>
          {user.balance.hasBonus ? (
            <span className="vault-bonus-line">
              Bonus {user.balance.bonusDisplay}
            </span>
          ) : null}
          <span className="muted vault-locked">
            Locked ${fromMicroUsdc(user.balance.locked).toFixed(2)}
          </span>
          <div className="vault-hero__actions">
            <button
              type="button"
              className="btn btn--primary"
              onClick={() => {
                setPanel("cashier");
                setCashTab("deposit");
              }}
            >
              Deposit
            </button>
            <button
              type="button"
              className="btn"
              onClick={() => {
                setPanel("cashier");
                setCashTab("withdraw");
              }}
            >
              Withdraw
            </button>
          </div>
        </div>
      </section>

      {toast ? (
        <div
          className={`vault-toast vault-toast--${toast.kind}`}
          role="status"
        >
          <span>{toast.text}</span>
          <button type="button" onClick={() => setToast(null)}>
            Dismiss
          </button>
        </div>
      ) : null}

      <div className="vault-shell">
        <nav className="vault-nav" aria-label="Wallet sections">
          {(
            [
              ["cashier", "Cashier"],
              ["account", "Account"],
              ["fairness", "Fairness"],
              ["activity", "Activity"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              className={panel === id ? "is-active" : ""}
              onClick={() => setPanel(id)}
            >
              {label}
            </button>
          ))}
        </nav>

        <div className="vault-panel">
          {panel === "cashier" ? (
            <>
              <div className="vault-tabs">
                <button
                  type="button"
                  className={cashTab === "deposit" ? "is-active" : ""}
                  onClick={() => setCashTab("deposit")}
                >
                  Deposit
                </button>
                <button
                  type="button"
                  className={cashTab === "withdraw" ? "is-active" : ""}
                  onClick={() => setCashTab("withdraw")}
                >
                  Withdraw
                </button>
              </div>

              {cashTab === "deposit" ? (
                <div className="vault-form">
                  {user.firstDepositOffer?.eligible ? (
                    <div className="deposit-offer" role="status">
                      <p className="deposit-offer__eyebrow">First deposit offer</p>
                      <h3>
                        {user.firstDepositOffer.matchPercent}% match up to $
                        {user.firstDepositOffer.maxBonusUsd}
                      </h3>
                      <p>
                        Minimum deposit ${user.firstDepositOffer.minDepositUsd}.
                        Bonus credited with your first qualifying deposit.
                      </p>
                    </div>
                  ) : null}

                  <label className="field">
                    <span>Network</span>
                    <select defaultValue="solana" disabled>
                      <option value="solana">Solana</option>
                    </select>
                  </label>

                  <label className="field">
                    <span>Accepted assets</span>
                    <select defaultValue="all" disabled>
                      <option value="all">{stables.join(" + ")}</option>
                    </select>
                  </label>

                  <label className="field">
                    <span>Deposit address</span>
                    <div className="vault-address-field">
                      <input
                        readOnly
                        value={user.depositAddress ?? "Generating…"}
                        spellCheck={false}
                      />
                      <button
                        type="button"
                        className="btn"
                        disabled={!user.depositAddress}
                        onClick={() =>
                          user.depositAddress &&
                          void copy("addr", user.depositAddress)
                        }
                      >
                        {copiedKey === "addr" ? "Copied" : "Copy"}
                      </button>
                    </div>
                  </label>

                  {user.depositUrl ? (
                    <label className="field">
                      <span>Pay link</span>
                      <div className="vault-address-field">
                        <input
                          readOnly
                          value={user.depositUrl}
                          spellCheck={false}
                        />
                        <button
                          type="button"
                          className="btn"
                          onClick={() =>
                            void copy(
                              "link",
                              `${window.location.origin}${user.depositUrl}`,
                            )
                          }
                        >
                          {copiedKey === "link" ? "Copied" : "Copy"}
                        </button>
                      </div>
                    </label>
                  ) : null}

                  {liveWallet ? (
                    <button
                      type="button"
                      className="btn btn--primary btn--block"
                      disabled={busy === "sync"}
                      onClick={() => void onSyncDeposit()}
                    >
                      {busy === "sync" ? "Syncing…" : "Sync deposits"}
                    </button>
                  ) : (
                    <>
                      <label className="field">
                        <span>Quick amount</span>
                        <select
                          value={
                            [25, 50, 100, 250].includes(depositAmount)
                              ? String(depositAmount)
                              : "custom"
                          }
                          onChange={(e) => {
                            const v = e.target.value;
                            if (v !== "custom") setDepositAmount(Number(v));
                          }}
                        >
                          <option value="25">$25</option>
                          <option value="50">$50</option>
                          <option value="100">$100</option>
                          <option value="250">$250</option>
                          <option value="custom">Custom</option>
                        </select>
                      </label>
                      <label className="field">
                        <span>Amount (USD)</span>
                        <input
                          type="number"
                          min={1}
                          step={1}
                          value={depositAmount}
                          onChange={(e) =>
                            setDepositAmount(Number(e.target.value))
                          }
                        />
                      </label>
                      {user.firstDepositOffer?.eligible &&
                      depositAmount >= user.firstDepositOffer.minDepositUsd ? (
                        <p className="deposit-offer__preview">
                          Estimated bonus +$
                          {Math.min(
                            depositAmount,
                            user.firstDepositOffer.maxBonusUsd,
                          )}
                        </p>
                      ) : null}
                      <button
                        type="button"
                        className="btn btn--primary btn--block"
                        disabled={busy === "deposit"}
                        onClick={() => void onDeposit()}
                      >
                        {busy === "deposit"
                          ? "Adding…"
                          : `Deposit $${depositAmount}`}
                      </button>
                    </>
                  )}
                </div>
              ) : (
                <div className="vault-form">
                  <label className="field">
                    <span>Payout asset</span>
                    <select
                      value={withdrawAsset}
                      onChange={(e) =>
                        setWithdrawAsset(e.target.value as "USDC" | "USDT")
                      }
                    >
                      {withdrawAssets.map((asset) => (
                        <option key={asset} value={asset}>
                          {asset}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="field">
                    <span>Quick amount</span>
                    <select
                      value={
                        [5, 10, 25, 50].includes(withdrawAmount)
                          ? String(withdrawAmount)
                          : "custom"
                      }
                      onChange={(e) => {
                        const v = e.target.value;
                        if (v !== "custom") setWithdrawAmount(Number(v));
                      }}
                    >
                      <option value="5">$5</option>
                      <option value="10">$10</option>
                      <option value="25">$25</option>
                      <option value="50">$50</option>
                      <option value="custom">Custom</option>
                    </select>
                  </label>

                  <label className="field">
                    <span>
                      Amount ({withdrawAsset}) · Available{" "}
                      {user.balance.availableDisplay}
                    </span>
                    <input
                      type="number"
                      min={0.01}
                      step={0.01}
                      value={withdrawAmount}
                      onChange={(e) =>
                        setWithdrawAmount(Number(e.target.value))
                      }
                    />
                  </label>

                  <label className="field">
                    <span>Destination wallet</span>
                    <input
                      value={withdrawTo}
                      onChange={(e) => setWithdrawTo(e.target.value)}
                      placeholder="Solana address"
                      spellCheck={false}
                    />
                  </label>

                  <div className="vault-fee-card">
                    <div>
                      <span>Asset</span>
                      <strong>{withdrawAsset}</strong>
                    </div>
                    <div>
                      <span>Fee ({feePreview.pct}%)</span>
                      <strong>
                        {feePreview.fee.toFixed(2)} {withdrawAsset}
                      </strong>
                    </div>
                    <div className="vault-fee-card__total">
                      <span>You receive</span>
                      <strong className="vault-receive">
                        {feePreview.sent.toFixed(2)} {withdrawAsset}
                      </strong>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="btn btn--primary btn--block"
                    disabled={busy === "withdraw"}
                    onClick={() => void onWithdraw()}
                  >
                    {busy === "withdraw"
                      ? "Sending…"
                      : `Withdraw ${withdrawAsset}`}
                  </button>
                </div>
              )}
            </>
          ) : null}

          {panel === "account" ? (
            <div className="vault-stack">
              <h2 className="vault-panel-title">Account</h2>
              <label className="field">
                <span>Display name</span>
                <input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  maxLength={24}
                />
              </label>
              <label className="field">
                <span>Default withdraw wallet</span>
                <input
                  value={walletAddress}
                  onChange={(e) => setWalletAddress(e.target.value)}
                  placeholder="Solana address"
                  spellCheck={false}
                />
              </label>
              <p className="muted vault-id">
                Player ID · {shortAddr(user.id, 8, 6)}
              </p>
              <div className="vault-row-actions">
                <button
                  type="button"
                  className="btn btn--primary"
                  disabled={busy === "profile"}
                  onClick={() => void saveProfile()}
                >
                  {busy === "profile" ? "Saving…" : "Save changes"}
                </button>
                <button
                  type="button"
                  className="btn btn--ghost"
                  onClick={() => void logout()}
                >
                  Sign out
                </button>
              </div>
            </div>
          ) : null}

          {panel === "fairness" ? (
            <div className="vault-stack">
              <h2 className="vault-panel-title">Provably fair</h2>
              <label className="field">
                <span>Server seed hash</span>
                <div className="copy-row">
                  <code className="seed-box">{user.serverSeedHash}</code>
                  <button
                    type="button"
                    className="btn btn--ghost"
                    onClick={() => void copy("ssh", user.serverSeedHash)}
                  >
                    {copiedKey === "ssh" ? "Copied" : "Copy"}
                  </button>
                </div>
              </label>
              <label className="field">
                <span>Client seed · nonce {user.nonce}</span>
                <div className="copy-row">
                  <code className="seed-box">{user.clientSeed}</code>
                  <button
                    type="button"
                    className="btn btn--ghost"
                    onClick={() => void copy("cs", user.clientSeed)}
                  >
                    {copiedKey === "cs" ? "Copied" : "Copy"}
                  </button>
                </div>
              </label>
              <Link href="/" className="btn">
                Back to lobby
              </Link>
            </div>
          ) : null}

          {panel === "activity" ? (
            <div className="vault-stack">
              <h2 className="vault-panel-title">Transactions</h2>
              {activity.length === 0 ? (
                <p className="muted">No deposits or withdrawals yet.</p>
              ) : (
                <>
                  <ul className="vault-tx-list">
                    {activity.map((row) => (
                      <li
                        key={`${row.kind}-${row.id}`}
                        className={`vault-tx vault-tx--${row.kind === "deposit" ? "in" : "out"}`}
                      >
                        <div>
                          <strong>
                            {row.kind === "deposit" ? "Deposit" : "Withdraw"}
                          </strong>
                          <span className="muted">
                            {formatWhen(row.createdAt)}
                          </span>
                        </div>
                        <div className="vault-tx__right">
                          <strong>
                            {row.kind === "deposit" ? "+" : "−"}
                            {row.amount}
                          </strong>
                          <span className="vault-tx__status">{row.status}</span>
                        </div>
                      </li>
                    ))}
                  </ul>
                  <Pagination
                    page={activityPage}
                    pageSize={ACTIVITY_PAGE_SIZE}
                    total={activityTotal}
                    label="transactions"
                    onChange={(p) => void loadHistory(p)}
                  />
                </>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </main>
  );
}
