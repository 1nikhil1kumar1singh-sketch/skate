"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSkate } from "@/hooks/useSkate";
import { useAuthModal } from "@/components/AuthModal";

const NAV = [
  { href: "/", label: "Lobby", highlight: false },
  { href: "/offers", label: "Offers", highlight: true },
  { href: "/referral", label: "Referral", highlight: true },
  { href: "/leaderboard", label: "Leaderboard", highlight: true },
  { href: "/support", label: "Support", highlight: false },
] as const;

export function SiteHeader() {
  const { user, loading } = useSkate();
  const { openAuth } = useAuthModal();
  const pathname = usePathname();

  function isActive(href: string) {
    if (href === "/") return pathname === "/";
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  function linkClass(item: (typeof NAV)[number]) {
    const parts: string[] = [];
    if (item.highlight) parts.push("is-hot");
    if (isActive(item.href)) parts.push("is-active");
    return parts.length ? parts.join(" ") : undefined;
  }

  return (
    <header className="site-header">
      <div className="site-header__row">
        <Link href="/" className="brand-mark">
          <span className="brand-mark__slash">/</span>
          KLASSHI
        </Link>

        <nav className="site-nav" aria-label="Primary">
          {NAV.map((item) => (
            <Link key={item.href} href={item.href} className={linkClass(item)}>
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="header-actions">
          {loading ? (
            <span className="muted">…</span>
          ) : user && !user.isGuest ? (
            <>
              <Link
                href="/profile"
                className="balance-pill"
                title="Open cashier"
              >
                <span className="balance-pill__label">Balance</span>
                <strong>{user.balance.availableDisplay}</strong>
                {user.balance.hasBonus ? (
                  <span className="balance-pill__bonus">
                    +{user.balance.bonusDisplay}
                  </span>
                ) : null}
              </Link>
              <Link
                href="/profile"
                className="btn btn--primary btn--compact header-wallet-btn"
              >
                Wallet
              </Link>
            </>
          ) : (
            <button
              type="button"
              className="btn btn--primary btn--compact"
              onClick={() => openAuth("signin")}
            >
              Sign in
            </button>
          )}
        </div>
      </div>

      <nav className="site-nav-mobile" aria-label="Quick links">
        {NAV.map((item) => (
          <Link key={item.href} href={item.href} className={linkClass(item)}>
            {item.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
