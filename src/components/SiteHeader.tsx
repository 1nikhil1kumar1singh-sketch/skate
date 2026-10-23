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
  { href: "/about", label: "About", highlight: false },
  { href: "/support", label: "Support", highlight: false },
] as const;

function ProfileIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
    >
      <circle cx="12" cy="8" r="3.5" stroke="currentColor" strokeWidth="1.75" />
      <path
        d="M5.5 19.5c1.6-3.2 4-4.8 6.5-4.8s4.9 1.6 6.5 4.8"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function SiteHeader() {
  const { user, loading } = useSkate();
  const { openAuth } = useAuthModal();
  const pathname = usePathname();
  const profileActive =
    pathname.startsWith("/profile") || pathname.startsWith("/wallet");

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
            <div className="header-user">
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
                className={`header-profile${profileActive ? " is-active" : ""}`}
                title="Profile"
                aria-label="Open profile"
              >
                <ProfileIcon className="header-profile__icon" />
              </Link>
            </div>
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
