"use client";

import { useState } from "react";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import { useSkate } from "@/hooks/useSkate";
import { REFERRAL_STORAGE_KEY } from "@/lib/referral";

type Mode = "signin" | "signup";

export function AuthPanel() {
  const { refresh, loginDemo, demoMode } = useSkate();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const supabaseReady = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
  );

  async function bridgeSession(accessToken: string) {
    let ref: string | undefined;
    try {
      ref = localStorage.getItem(REFERRAL_STORAGE_KEY) ?? undefined;
    } catch {
      /* ignore */
    }
    const res = await fetch("/api/auth/supabase", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(ref ? { accessToken, ref } : { accessToken }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "Session bridge failed");
    try {
      localStorage.removeItem(REFERRAL_STORAGE_KEY);
    } catch {
      /* ignore */
    }
    await refresh();
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    const supabase = getSupabaseBrowser();
    if (!supabase) {
      setError("Supabase is not configured");
      return;
    }
    setBusy(true);
    try {
      if (mode === "signup") {
        const { data, error: err } = await supabase.auth.signUp({
          email: email.trim(),
          password,
        });
        if (err) throw err;
        if (data.session?.access_token) {
          await bridgeSession(data.session.access_token);
          return;
        }
        setMessage("Check your email to confirm, then sign in.");
        setMode("signin");
        return;
      }

      const { data, error: err } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (err) throw err;
      if (!data.session?.access_token) {
        throw new Error("No session returned");
      }
      await bridgeSession(data.session.access_token);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Auth failed");
    } finally {
      setBusy(false);
    }
  }

  async function onGuest() {
    setError(null);
    setBusy(true);
    try {
      await loginDemo();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Guest login failed");
    } finally {
      setBusy(false);
    }
  }

  if (!supabaseReady) {
    return (
      <div className="auth-panel">
        <p className="muted">Supabase Auth keys missing in env.</p>
        <button
          type="button"
          className="btn btn--primary btn--block"
          disabled={busy}
          onClick={() => void onGuest()}
        >
          {busy ? "Entering…" : "Enter as guest"}
        </button>
      </div>
    );
  }

  return (
    <div className="auth-panel">
      <p className="auth-panel__title">
        {mode === "signup" ? "Create your account" : "Welcome back"}
      </p>
      <p className="auth-panel__hint">
        {mode === "signup"
          ? "Use email to save balances and withdrawals."
          : "Sign in to deposit, play, and withdraw."}
      </p>

      <div className="auth-tabs" role="tablist">
        <button
          type="button"
          role="tab"
          className={mode === "signin" ? "is-active" : undefined}
          onClick={() => setMode("signin")}
        >
          Sign in
        </button>
        <button
          type="button"
          role="tab"
          className={mode === "signup" ? "is-active" : undefined}
          onClick={() => setMode("signup")}
        >
          Create account
        </button>
      </div>

      <form className="auth-form" onSubmit={(e) => void onSubmit(e)}>
        <label className="field">
          <span>Email</span>
          <input
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@email.com"
          />
        </label>
        <label className="field">
          <span>Password</span>
          <input
            type="password"
            autoComplete={mode === "signup" ? "new-password" : "current-password"}
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 6 characters"
          />
        </label>
        {error ? <p className="error-text">{error}</p> : null}
        {message ? <p className="muted">{message}</p> : null}
        <button
          type="submit"
          className="btn btn--primary btn--block"
          disabled={busy}
        >
          {busy
            ? "Please wait…"
            : mode === "signup"
              ? "Create account"
              : "Sign in"}
        </button>
      </form>

      <button
        type="button"
        className="btn btn--ghost btn--block"
        disabled={busy}
        onClick={() => void onGuest()}
      >
        {demoMode ? "Continue as guest" : "Browse as guest"}
      </button>
    </div>
  );
}
