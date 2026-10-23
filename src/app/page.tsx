"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { useSkate } from "@/hooks/useSkate";
import { useAuthModal } from "@/components/AuthModal";
import { BetHistory } from "@/components/BetHistory";
import { AppPurpose } from "@/components/AppPurpose";
import { GAME_CATALOG } from "@/lib/catalog";

export default function HomePage() {
  const { user, loginDemo, loading } = useSkate();
  const { openAuth } = useAuthModal();

  return (
    <main>
      {/* Purpose first in the document for Google branding review crawlers */}
      <AppPurpose />

      {!user ? (
        <section className="hero hero--visual">
          <div className="hero-media" aria-hidden>
            <Image
              src="/hero/skate-hero.jpg"
              alt=""
              fill
              priority
              className="hero-media__img"
              sizes="100vw"
            />
            <div className="hero-media__veil" />
          </div>
          <div className="hero-copy">
            <motion.h1
              className="hero-brand"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, ease: [0.2, 0.8, 0.2, 1] }}
            >
              KLASSHI<span>/</span>
            </motion.h1>
            <motion.p
              className="hero-line"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.12, duration: 0.5 }}
            >
              Adult Solana casino — deposit USDC, play originals, withdraw.
              Google Sign-In is for accounts only (not AI imagery).
            </motion.p>
            <motion.div
              className="hero-cta"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.22, duration: 0.45 }}
            >
              <button
                type="button"
                className="btn btn--primary"
                onClick={() => openAuth("signin")}
              >
                Sign in
              </button>
              <button
                type="button"
                className="btn"
                disabled={loading}
                onClick={() => void loginDemo()}
              >
                Browse as guest
              </button>
            </motion.div>
          </div>
        </section>
      ) : (
        <section className="lobby">
          <div className="lobby-head">
            <div className="section-head">
              <h2>Originals</h2>
            </div>
            <Link href="/profile" className="lobby-balance">
              <span>Balance</span>
              <strong>{user.balance.availableDisplay}</strong>
              {user.balance.hasBonus ? (
                <em>+{user.balance.bonusDisplay} bonus</em>
              ) : null}
            </Link>
          </div>

          <div className="game-grid">
            {GAME_CATALOG.map((g, i) => (
              <motion.div
                key={g.slug}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i * 0.04, 0.4), duration: 0.35 }}
              >
                <Link
                  href={`/play/${g.slug}`}
                  className="game-link game-link--art"
                >
                  <div className="game-link__media">
                    <Image
                      src={g.image}
                      alt={g.title}
                      fill
                      className="game-link__img"
                      sizes="(max-width: 820px) 100vw, 240px"
                    />
                    <span className="game-link__play">Play</span>
                  </div>
                  <div className="game-link__body">
                    <h3>{g.title}</h3>
                    <p>{g.blurb}</p>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>

          <BetHistory />

          <details className="fair-details">
            <summary>Provably fair seeds</summary>
            <p className="fair-note">
              Server seed hash: {user.serverSeedHash}
              <br />
              Client seed: {user.clientSeed} · nonce: {user.nonce}
            </p>
          </details>
        </section>
      )}
    </main>
  );
}
