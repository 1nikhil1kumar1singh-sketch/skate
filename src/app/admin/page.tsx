"use client";

import { useCallback, useMemo, useState } from "react";

type Overview = {
  traffic: {
    viewsToday: number;
    views7d: number;
    topPaths: { path: string; count: number }[];
  };
  support: {
    openTickets: number;
    tickets: {
      id: string;
      name: string;
      email: string;
      subject: string;
      message: string;
      status: string;
      createdAt: string;
    }[];
  };
  platform: {
    userCount: number;
    bannedCount: number;
    ledgerAvailable: string;
    ledgerLocked: string;
    ledgerBonus: string;
    depositsTotal: string;
    depositsCount: number;
    withdrawalsTotal: string;
    withdrawalsCount: number;
    betsCount: number;
    wageredTotal: string;
    paidTotal: string;
  };
  treasury: {
    address: string | null;
    sol: number | null;
    usdc: string | null;
    usdt: string | null;
    live: boolean;
  };
  users: {
    id: string;
    email: string | null;
    displayName: string | null;
    walletAddress: string | null;
    depositAddress: string | null;
    banned: boolean;
    createdAt: string;
    available: string;
    locked: string;
    bonus: string;
    bets: number;
    deposits: number;
    withdrawals: number;
  }[];
  deposits: {
    id: string;
    amount: string;
    status: string;
    signature: string;
    createdAt: string;
    email: string | null;
    displayName: string | null;
  }[];
  withdrawals: {
    id: string;
    amount: string;
    status: string;
    signature: string | null;
    toAddress: string;
    createdAt: string;
    email: string | null;
    displayName: string | null;
  }[];
  bets: {
    id: string;
    game: string;
    amount: string;
    payout: string;
    won: boolean;
    createdAt: string;
    email: string | null;
    displayName: string | null;
  }[];
};

type Tab = "overview" | "users" | "money" | "bets" | "support";

function usd(micro: string | number | null | undefined) {
  const n = Number(micro ?? 0) / 1e6;
  return `$${n.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function short(value: string | null | undefined, head = 8, tail = 6) {
  if (!value) return "—";
  if (value.length <= head + tail + 1) return value;
  return `${value.slice(0, head)}…${value.slice(-tail)}`;
}

function when(iso: string) {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

export default function AdminPage() {
  const [key, setKey] = useState("");
  const [data, setData] = useState<Overview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState<Tab>("overview");
  const [q, setQ] = useState("");
  const [adjustUserId, setAdjustUserId] = useState<string | null>(null);
  const [adjustField, setAdjustField] = useState<
    "available" | "bonus" | "locked"
  >("available");
  const [adjustAmount, setAdjustAmount] = useState("1");
  const [adjustNote, setAdjustNote] = useState("");
  const [actionMsg, setActionMsg] = useState<string | null>(null);

  const adminKey = useCallback(() => {
    return (
      key.trim() ||
      (typeof sessionStorage !== "undefined"
        ? sessionStorage.getItem("klasshi_admin_key")
        : "") ||
      ""
    );
  }, [key]);

  const load = useCallback(async (k: string) => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/overview", {
        headers: { "x-admin-key": k },
        cache: "no-store",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Unauthorized");
      setData(json as Overview);
      try {
        sessionStorage.setItem("klasshi_admin_key", k);
      } catch {
        /* ignore */
      }
    } catch (err) {
      setData(null);
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setBusy(false);
    }
  }, []);

  async function onUnlock(e: React.FormEvent) {
    e.preventDefault();
    await load(key.trim());
  }

  async function postAction(body: Record<string, unknown>) {
    const k = adminKey();
    if (!k) return;
    setActionMsg(null);
    const res = await fetch("/api/admin/overview", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-admin-key": k,
      },
      body: JSON.stringify(body),
    });
    const json = await res.json();
    if (!res.ok) {
      setActionMsg(json.error ?? "Action failed");
      return;
    }
    setActionMsg("Saved");
    setAdjustUserId(null);
    await load(k);
  }

  const filteredUsers = useMemo(() => {
    if (!data) return [];
    const needle = q.trim().toLowerCase();
    if (!needle) return data.users;
    return data.users.filter((u) =>
      [u.email, u.displayName, u.id, u.depositAddress, u.walletAddress]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(needle)),
    );
  }, [data, q]);

  return (
    <main className="promo-page admin-page">
      <section className="promo-hero">
        <p className="promo-kicker">Ops</p>
        <h1>Admin control</h1>
        <p className="promo-lead">
          Users, balances, deposits, withdrawals, bets, treasury, and support.
          Keep your admin key private.
        </p>
      </section>

      {!data ? (
        <form
          className="promo-card admin-unlock"
          onSubmit={(e) => void onUnlock(e)}
        >
          <label className="field">
            <span>Admin key</span>
            <input
              type="password"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder="ADMIN_KEY from env"
              autoComplete="off"
            />
          </label>
          {error ? <p className="error-text">{error}</p> : null}
          <button type="submit" className="btn btn--primary" disabled={busy}>
            {busy ? "Opening…" : "Open dashboard"}
          </button>
        </form>
      ) : (
        <div className="admin-stack">
          <div className="admin-tabs">
            {(
              [
                ["overview", "Overview"],
                ["users", "Users"],
                ["money", "Money"],
                ["bets", "Bets"],
                ["support", "Support"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                className={tab === id ? "is-active" : undefined}
                onClick={() => setTab(id)}
              >
                {label}
              </button>
            ))}
            <button
              type="button"
              className="btn btn--compact"
              onClick={() => void load(adminKey())}
            >
              Refresh
            </button>
          </div>

          {actionMsg ? <p className="admin-flash">{actionMsg}</p> : null}

          {tab === "overview" ? (
            <>
              <div className="admin-stats">
                <div className="promo-card">
                  <p className="muted">Users</p>
                  <strong>{data.platform.userCount}</strong>
                </div>
                <div className="promo-card">
                  <p className="muted">Banned</p>
                  <strong>{data.platform.bannedCount}</strong>
                </div>
                <div className="promo-card">
                  <p className="muted">Ledger available</p>
                  <strong>{usd(data.platform.ledgerAvailable)}</strong>
                </div>
                <div className="promo-card">
                  <p className="muted">Views today</p>
                  <strong>{data.traffic.viewsToday}</strong>
                </div>
                <div className="promo-card">
                  <p className="muted">Open tickets</p>
                  <strong>{data.support.openTickets}</strong>
                </div>
                <div className="promo-card">
                  <p className="muted">Bets</p>
                  <strong>{data.platform.betsCount}</strong>
                </div>
              </div>

              <section className="promo-card">
                <div className="promo-card__head">
                  <h2>Treasury (on-chain)</h2>
                </div>
                <p className="muted">
                  Live: {data.treasury.live ? "yes" : "no"} ·{" "}
                  {short(data.treasury.address, 10, 8)}
                </p>
                <ul className="admin-paths">
                  <li>
                    <span>SOL</span>
                    <strong>
                      {data.treasury.sol != null
                        ? data.treasury.sol.toFixed(4)
                        : "—"}
                    </strong>
                  </li>
                  <li>
                    <span>USDC</span>
                    <strong>{usd(data.treasury.usdc)}</strong>
                  </li>
                  <li>
                    <span>USDT</span>
                    <strong>{usd(data.treasury.usdt)}</strong>
                  </li>
                  <li>
                    <span>Deposits total</span>
                    <strong>{usd(data.platform.depositsTotal)}</strong>
                  </li>
                  <li>
                    <span>Withdrawals total</span>
                    <strong>{usd(data.platform.withdrawalsTotal)}</strong>
                  </li>
                  <li>
                    <span>Wagered / paid</span>
                    <strong>
                      {usd(data.platform.wageredTotal)} /{" "}
                      {usd(data.platform.paidTotal)}
                    </strong>
                  </li>
                </ul>
              </section>

              <section className="promo-card">
                <div className="promo-card__head">
                  <h2>Top paths · 7d</h2>
                </div>
                <ul className="admin-paths">
                  {data.traffic.topPaths.length === 0 ? (
                    <li className="muted">No traffic yet.</li>
                  ) : (
                    data.traffic.topPaths.map((row) => (
                      <li key={row.path}>
                        <span>{row.path}</span>
                        <strong>{row.count}</strong>
                      </li>
                    ))
                  )}
                </ul>
              </section>
            </>
          ) : null}

          {tab === "users" ? (
            <section className="promo-card">
              <div className="promo-card__head promo-card__head--row">
                <h2>Users ({filteredUsers.length})</h2>
                <input
                  className="admin-search"
                  placeholder="Search email, name, address…"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                />
              </div>
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>User</th>
                      <th>Available</th>
                      <th>Bonus</th>
                      <th>Activity</th>
                      <th>Status</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((u) => (
                      <tr key={u.id} className={u.banned ? "is-banned" : undefined}>
                        <td>
                          <strong>{u.displayName || "Player"}</strong>
                          <div className="muted">{u.email || "no email"}</div>
                          <div className="muted">{short(u.depositAddress)}</div>
                          <div className="muted">{when(u.createdAt)}</div>
                        </td>
                        <td>{usd(u.available)}</td>
                        <td>{usd(u.bonus)}</td>
                        <td className="muted">
                          {u.bets} bets · {u.deposits} dep · {u.withdrawals} wd
                        </td>
                        <td>
                          <span
                            className={`admin-status ${u.banned ? "is-banned" : "is-open"}`}
                          >
                            {u.banned ? "banned" : "active"}
                          </span>
                        </td>
                        <td className="admin-row-actions">
                          <button
                            type="button"
                            className="btn btn--compact"
                            onClick={() => {
                              setAdjustUserId(u.id);
                              setAdjustAmount("1");
                              setAdjustField("available");
                            }}
                          >
                            Adjust
                          </button>
                          <button
                            type="button"
                            className="btn btn--compact"
                            onClick={() =>
                              void postAction({
                                action: u.banned ? "unban" : "ban",
                                userId: u.id,
                              })
                            }
                          >
                            {u.banned ? "Unban" : "Ban"}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {adjustUserId ? (
                <div className="admin-adjust">
                  <h3>Adjust balance</h3>
                  <p className="muted">
                    User {short(adjustUserId, 10, 6)} · use negative to debit
                  </p>
                  <div className="admin-adjust__row">
                    <select
                      value={adjustField}
                      onChange={(e) =>
                        setAdjustField(
                          e.target.value as "available" | "bonus" | "locked",
                        )
                      }
                    >
                      <option value="available">Available</option>
                      <option value="bonus">Bonus</option>
                      <option value="locked">Locked</option>
                    </select>
                    <input
                      type="number"
                      step="0.01"
                      value={adjustAmount}
                      onChange={(e) => setAdjustAmount(e.target.value)}
                      placeholder="USD (+/−)"
                    />
                    <input
                      value={adjustNote}
                      onChange={(e) => setAdjustNote(e.target.value)}
                      placeholder="Note (optional)"
                    />
                    <button
                      type="button"
                      className="btn btn--primary btn--compact"
                      onClick={() =>
                        void postAction({
                          action: "adjust",
                          userId: adjustUserId,
                          field: adjustField,
                          amountUsd: Number(adjustAmount),
                          note: adjustNote || undefined,
                        })
                      }
                    >
                      Apply
                    </button>
                    <button
                      type="button"
                      className="btn btn--compact"
                      onClick={() => setAdjustUserId(null)}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : null}
            </section>
          ) : null}

          {tab === "money" ? (
            <>
              <section className="promo-card">
                <div className="promo-card__head">
                  <h2>Recent deposits</h2>
                </div>
                <div className="admin-table-wrap">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>When</th>
                        <th>User</th>
                        <th>Amount</th>
                        <th>Status</th>
                        <th>Sig</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.deposits.map((d) => (
                        <tr key={d.id}>
                          <td>{when(d.createdAt)}</td>
                          <td>
                            {d.displayName || "Player"}
                            <div className="muted">{d.email}</div>
                          </td>
                          <td>{usd(d.amount)}</td>
                          <td>{d.status}</td>
                          <td className="muted">{short(d.signature)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
              <section className="promo-card">
                <div className="promo-card__head">
                  <h2>Recent withdrawals</h2>
                </div>
                <div className="admin-table-wrap">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>When</th>
                        <th>User</th>
                        <th>Amount</th>
                        <th>Status</th>
                        <th>To</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.withdrawals.map((w) => (
                        <tr key={w.id}>
                          <td>{when(w.createdAt)}</td>
                          <td>
                            {w.displayName || "Player"}
                            <div className="muted">{w.email}</div>
                          </td>
                          <td>{usd(w.amount)}</td>
                          <td>{w.status}</td>
                          <td className="muted">{short(w.toAddress)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            </>
          ) : null}

          {tab === "bets" ? (
            <section className="promo-card">
              <div className="promo-card__head">
                <h2>Recent bets</h2>
              </div>
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>When</th>
                      <th>User</th>
                      <th>Game</th>
                      <th>Wager</th>
                      <th>Payout</th>
                      <th>Result</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.bets.map((b) => (
                      <tr key={b.id}>
                        <td>{when(b.createdAt)}</td>
                        <td>
                          {b.displayName || "Player"}
                          <div className="muted">{b.email}</div>
                        </td>
                        <td>{b.game}</td>
                        <td>{usd(b.amount)}</td>
                        <td>{usd(b.payout)}</td>
                        <td>{b.won ? "win" : "loss"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ) : null}

          {tab === "support" ? (
            <section className="promo-card">
              <div className="promo-card__head">
                <h2>Support inbox</h2>
              </div>
              <div className="admin-tickets">
                {data.support.tickets.length === 0 ? (
                  <p className="muted">No messages yet.</p>
                ) : (
                  data.support.tickets.map((t) => (
                    <article key={t.id} className="admin-ticket">
                      <header>
                        <strong>{t.subject}</strong>
                        <span className={`admin-status is-${t.status}`}>
                          {t.status}
                        </span>
                      </header>
                      <p className="muted">
                        {t.name} · {t.email} · {when(t.createdAt)}
                      </p>
                      <p>{t.message}</p>
                      <div className="admin-ticket__actions">
                        <button
                          type="button"
                          className="btn btn--compact"
                          onClick={() =>
                            void postAction({
                              action: "ticket",
                              id: t.id,
                              status: t.status === "open" ? "closed" : "open",
                            })
                          }
                        >
                          {t.status === "open" ? "Mark closed" : "Reopen"}
                        </button>
                        <a className="btn btn--compact" href={`mailto:${t.email}`}>
                          Reply
                        </a>
                      </div>
                    </article>
                  ))
                )}
              </div>
            </section>
          ) : null}
        </div>
      )}
    </main>
  );
}
