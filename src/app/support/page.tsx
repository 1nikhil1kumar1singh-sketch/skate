"use client";

import { useState } from "react";
import Link from "next/link";

const FAQ = [
  {
    q: "How do I deposit?",
    a: "Sign in, open Wallet → Deposit, copy your Solana address, send USDC or USDT, then Sync deposits.",
  },
  {
    q: "How long do withdrawals take?",
    a: "Live withdrawals are sent from the platform treasury after fee deduction. Network confirmation is usually under a minute when the treasury is funded.",
  },
  {
    q: "I browsed as guest — how do I keep my balance?",
    a: "Create an account or continue with Google so your balance is tied to email login.",
  },
  {
    q: "Where are the offers?",
    a: "See Offers for the first-deposit match and referral credit. Terms apply.",
  },
] as const;

export default function SupportPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, subject, message }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to send");
      setDone(true);
      setName("");
      setEmail("");
      setSubject("");
      setMessage("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="promo-page support-page">
      <section className="promo-hero">
        <p className="promo-kicker">Help</p>
        <h1>Support</h1>
        <p className="promo-lead">
          Answers for deposits, withdrawals, and accounts. Still stuck? Send a
          message — we read every ticket.
        </p>
      </section>

      <section className="support-grid">
        <div className="promo-card support-faq">
          <div className="promo-card__head">
            <h2>FAQ</h2>
          </div>
          <div className="support-faq__list">
            {FAQ.map((item) => (
              <details key={item.q} className="support-faq__item">
                <summary>{item.q}</summary>
                <p>{item.a}</p>
              </details>
            ))}
          </div>
          <p className="muted support-links">
            Also see <Link href="/terms">Terms</Link> and{" "}
            <Link href="/offers">Offers</Link>.
          </p>
        </div>

        <div className="promo-card support-form-card">
          <div className="promo-card__head">
            <h2>Contact</h2>
            <p className="muted">Usually answered within 24–48 hours.</p>
          </div>

          {done ? (
            <p className="support-success" role="status">
              Message sent. We’ll reply to your email.
            </p>
          ) : (
            <form className="vault-form" onSubmit={(e) => void onSubmit(e)}>
              <label className="field">
                <span>Name</span>
                <input
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={80}
                />
              </label>
              <label className="field">
                <span>Email</span>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  maxLength={120}
                />
              </label>
              <label className="field">
                <span>Subject</span>
                <input
                  required
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  maxLength={120}
                  placeholder="Deposit not syncing…"
                />
              </label>
              <label className="field">
                <span>Message</span>
                <textarea
                  required
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  maxLength={4000}
                  rows={5}
                  className="support-textarea"
                />
              </label>
              {error ? <p className="error-text">{error}</p> : null}
              <button
                type="submit"
                className="btn btn--primary btn--block"
                disabled={busy}
              >
                {busy ? "Sending…" : "Send message"}
              </button>
            </form>
          )}
        </div>
      </section>
    </main>
  );
}
