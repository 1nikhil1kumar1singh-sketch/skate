"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import { REFERRAL_STORAGE_KEY } from "@/lib/referral";
import { useSkate } from "@/hooks/useSkate";

export default function AuthCallbackPage() {
  const router = useRouter();
  const { refresh } = useSkate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function bridge(accessToken: string) {
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
      if (!cancelled) router.replace("/");
    }

    async function run() {
      const supabase = getSupabaseBrowser();
      if (!supabase) {
        setError("Auth is not configured");
        return;
      }

      try {
        const url = new URL(window.location.href);
        const code = url.searchParams.get("code");
        if (code) {
          const { error: exchangeError } =
            await supabase.auth.exchangeCodeForSession(code);
          if (exchangeError) throw exchangeError;
        }

        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (session?.access_token) {
          await bridge(session.access_token);
          return;
        }

        const {
          data: { subscription },
        } = supabase.auth.onAuthStateChange(async (event, nextSession) => {
          if (
            (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") &&
            nextSession?.access_token
          ) {
            subscription.unsubscribe();
            await bridge(nextSession.access_token);
          }
        });

        window.setTimeout(() => {
          if (!cancelled) {
            subscription.unsubscribe();
            setError("Sign in timed out. Try again.");
          }
        }, 12000);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Google sign in failed");
        }
      }
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, [refresh, router]);

  return (
    <main className="auth-callback">
      <p className="auth-callback__title">
        {error ? "Sign in failed" : "Finishing sign in…"}
      </p>
      {error ? (
        <>
          <p className="error-text">{error}</p>
          <button
            type="button"
            className="btn btn--primary"
            onClick={() => router.replace("/")}
          >
            Back to lobby
          </button>
        </>
      ) : (
        <p className="muted">Connecting your Google account to Klasshi.</p>
      )}
    </main>
  );
}
