"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

type PayInfo = {
  displayName: string | null;
  depositPath: string;
  depositAddress: string;
  depositUrl: string;
  cluster: string;
  usdcMint: string;
  usdtMint?: string | null;
  acceptedStables?: string[];
  demoMode: boolean;
  error?: string;
};

export default function PayPathPage() {
  const params = useParams<{ path: string }>();
  const [info, setInfo] = useState<PayInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!params.path) return;
    void fetch(`/api/pay/${params.path}`)
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.error ?? "Not found");
        setInfo(data);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed"));
  }, [params.path]);

  async function copy() {
    if (!info?.depositAddress) return;
    await navigator.clipboard.writeText(info.depositAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  const stables = info?.acceptedStables ?? ["USDC"];

  return (
    <main className="pay-page">
      <section className="pay-card">
        <p className="vault-kicker">Deposit link</p>
        <h1>Send to Klasshi</h1>
        {error ? <p className="error-text">{error}</p> : null}
        {!info && !error ? <p className="muted">Loading…</p> : null}
        {info ? (
          <>
            <p className="muted">
              Deposit {stables.join(" or ")} for{" "}
              <strong>{info.displayName ?? "Player"}</strong> on {info.cluster}.
            </p>
            <div className="vault-address-card">
              <div className="vault-address-card__head">
                <span>Address</span>
                <span className="muted">{stables.join(" / ")}</span>
              </div>
              <code>{info.depositAddress}</code>
              <button
                type="button"
                className="btn btn--primary"
                onClick={() => void copy()}
              >
                {copied ? "Copied" : "Copy address"}
              </button>
            </div>
            <p className="muted" style={{ margin: 0, fontSize: "0.8rem" }}>
              Solana · {stables.join(" / ")}
            </p>
            <Link href="/profile" className="btn btn--block">
              Open cashier
            </Link>
          </>
        ) : null}
      </section>
    </main>
  );
}
