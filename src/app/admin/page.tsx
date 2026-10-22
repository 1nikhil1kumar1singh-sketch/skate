"use client";

import { useCallback, useState } from "react";

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
};

export default function AdminPage() {
  const [key, setKey] = useState("");
  const [data, setData] = useState<Overview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async (adminKey: string) => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/overview", {
        headers: { "x-admin-key": adminKey },
        cache: "no-store",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Unauthorized");
      setData(json as Overview);
      try {
        sessionStorage.setItem("klasshi_admin_key", adminKey);
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

  async function setStatus(id: string, status: "open" | "closed") {
    const adminKey =
      key.trim() ||
      (typeof sessionStorage !== "undefined"
        ? sessionStorage.getItem("klasshi_admin_key")
        : "") ||
      "";
    if (!adminKey) return;
    await fetch("/api/admin/overview", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "x-admin-key": adminKey,
      },
      body: JSON.stringify({ id, status }),
    });
    await load(adminKey);
  }

  return (
    <main className="promo-page admin-page">
      <section className="promo-hero">
        <p className="promo-kicker">Ops</p>
        <h1>Traffic &amp; support</h1>
        <p className="promo-lead">
          Site page views and support inbox. Keep your admin key private.
        </p>
      </section>

      {!data ? (
        <form className="promo-card admin-unlock" onSubmit={(e) => void onUnlock(e)}>
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
          <div className="admin-stats">
            <div className="promo-card">
              <p className="muted">Views today</p>
              <strong>{data.traffic.viewsToday}</strong>
            </div>
            <div className="promo-card">
              <p className="muted">Views · 7 days</p>
              <strong>{data.traffic.views7d}</strong>
            </div>
            <div className="promo-card">
              <p className="muted">Open tickets</p>
              <strong>{data.support.openTickets}</strong>
            </div>
          </div>

          <section className="promo-card">
            <div className="promo-card__head">
              <h2>Top paths</h2>
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

          <section className="promo-card">
            <div className="promo-card__head promo-card__head--row">
              <h2>Support inbox</h2>
              <button
                type="button"
                className="btn btn--compact"
                onClick={() =>
                  void load(
                    key.trim() ||
                      sessionStorage.getItem("klasshi_admin_key") ||
                      "",
                  )
                }
              >
                Refresh
              </button>
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
                      {t.name} · {t.email} ·{" "}
                      {new Date(t.createdAt).toLocaleString()}
                    </p>
                    <p>{t.message}</p>
                    <div className="admin-ticket__actions">
                      {t.status === "open" ? (
                        <button
                          type="button"
                          className="btn btn--compact"
                          onClick={() => void setStatus(t.id, "closed")}
                        >
                          Mark closed
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="btn btn--compact"
                          onClick={() => void setStatus(t.id, "open")}
                        >
                          Reopen
                        </button>
                      )}
                      <a className="btn btn--compact" href={`mailto:${t.email}`}>
                        Reply
                      </a>
                    </div>
                  </article>
                ))
              )}
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
