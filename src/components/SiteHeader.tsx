"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSkate } from "@/hooks/useSkate";

const NAV = [
  { href: "/", label: "Lobby", highlight: false },
  { href: "/referral", label: "Referral", highlight: true },
  { href: "/leaderboard", label: "Leaderboard", highlight: true },
] as const;

export function SiteHeader() {
  const { user, loading } = useSkate();
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
          SKATE
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
          ) : user ? (
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
            <Link href="/profile" className="btn btn--primary btn--compact">
              Sign in
            </Link>
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
