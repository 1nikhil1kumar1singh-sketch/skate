"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import { useSkate } from "@/hooks/useSkate";
import { REFERRAL_STORAGE_KEY } from "@/lib/referral";

type Mode = "signin" | "signup";

type AuthModalContextValue = {
  open: boolean;
  openAuth: (mode?: Mode) => void;
  closeAuth: () => void;
};

const AuthModalContext = createContext<AuthModalContextValue | null>(null);

export function useAuthModal() {
  const ctx = useContext(AuthModalContext);
  if (!ctx) {
    throw new Error("useAuthModal must be used within AuthModalProvider");
  }
  return ctx;
}

export function AuthModalProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>("signin");
  const { user, refresh, loginDemo, demoMode } = useSkate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const authReady = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
  );

  const openAuth = useCallback((nextMode: Mode = "signin") => {
    setMode(nextMode);
    setError(null);
    setMessage(null);
    setOpen(true);
  }, []);

  const closeAuth = useCallback(() => {
    setOpen(false);
    setBusy(false);
    setError(null);
    setMessage(null);
  }, []);

  useEffect(() => {
    if (user && !user.isGuest) closeAuth();
  }, [user, closeAuth]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") closeAuth();
    }
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, closeAuth]);

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
    if (!res.ok) throw new Error(data.error ?? "Could not start session");
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
    if (!authReady) {
      setError("Account login is temporarily unavailable. Try guest access.");
      return;
    }
    const supabase = getSupabaseBrowser();
    if (!supabase) {
      setError("Account login is temporarily unavailable. Try guest access.");
      return;
    }
    setBusy(true);
    try {
      if (mode === "signup") {
        const { data, error: err } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
            data: {
              app_name: "Klasshi",
              display_name: email.trim().split("@")[0],
            },
          },
        });
        if (err) throw err;
        if (data.session?.access_token) {
          await bridgeSession(data.session.access_token);
          return;
        }
        setMessage(
          "We sent a Klasshi confirmation link. Open it, then sign in.",
        );
        setMode("signin");
        return;
      }

      const { data, error: err } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (err) throw err;
      if (!data.session?.access_token) {
        throw new Error("Sign in failed. Please try again.");
      }
      await bridgeSession(data.session.access_token);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign in failed");
    } finally {
      setBusy(false);
    }
  }

  async function onGuest() {
    setError(null);
    setBusy(true);
    try {
      await loginDemo();
      closeAuth();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Guest login failed");
    } finally {
      setBusy(false);
    }
  }

  async function onGoogle() {
    setError(null);
    setMessage(null);
    if (!authReady) {
      setError("Account login is temporarily unavailable.");
      return;
    }
    const supabase = getSupabaseBrowser();
    if (!supabase) {
      setError("Account login is temporarily unavailable.");
      return;
    }
    setBusy(true);
    try {
      const { error: err } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: {
            access_type: "offline",
            prompt: "consent",
          },
        },
      });
      if (err) throw err;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Google sign in failed");
      setBusy(false);
    }
  }

  const value = useMemo(
    () => ({ open, openAuth, closeAuth }),
    [open, openAuth, closeAuth],
  );

  return (
    <AuthModalContext.Provider value={value}>
      {children}
      {open ? (
        <div
          className="auth-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="auth-modal-title"
        >
          <button
            type="button"
            className="auth-modal__backdrop"
            aria-label="Close sign in"
            onClick={closeAuth}
          />
          <div className="auth-modal__card">
            <button
              type="button"
              className="auth-modal__close"
              aria-label="Close"
              onClick={closeAuth}
            >
              ×
            </button>

            <div className="auth-modal__brand">
              <span className="brand-mark__slash">/</span>
              KLASSHI
            </div>

            <h2 id="auth-modal-title" className="auth-modal__title">
              {mode === "signup" ? "Create account" : "Sign in"}
            </h2>
            <p className="auth-modal__hint">
              {mode === "signup"
                ? "Save your balance and withdraw anytime."
                : "Deposit, play, and withdraw securely."}
            </p>

            <div className="auth-tabs" role="tablist">
              <button
                type="button"
                role="tab"
                className={mode === "signin" ? "is-active" : undefined}
                onClick={() => {
                  setMode("signin");
                  setError(null);
                  setMessage(null);
                }}
              >
                Sign in
              </button>
              <button
                type="button"
                role="tab"
                className={mode === "signup" ? "is-active" : undefined}
                onClick={() => {
                  setMode("signup");
                  setError(null);
                  setMessage(null);
                }}
              >
                Create account
              </button>
            </div>

            <button
              type="button"
              className="btn btn--google btn--block"
              disabled={busy}
              onClick={() => void onGoogle()}
            >
              Continue with Google
            </button>

            <div className="auth-divider" aria-hidden>
              <span>or</span>
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
                  autoComplete={
                    mode === "signup" ? "new-password" : "current-password"
                  }
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
        </div>
      ) : null}
    </AuthModalContext.Provider>
  );
}

/** Safe opener for places that may render outside the provider tree. */
export function SignInButton({
  className,
  label = "Sign in",
  mode = "signin",
}: {
  className?: string;
  label?: string;
  mode?: Mode;
}) {
  const { openAuth } = useAuthModal();
  return (
    <button
      type="button"
      className={className}
      onClick={() => openAuth(mode)}
    >
      {label}
    </button>
  );
}
