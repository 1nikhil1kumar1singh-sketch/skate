"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSkate } from "@/hooks/useSkate";
import { useAuthModal } from "@/components/AuthModal";

const TABS = [
  { href: "/", label: "Lobby", match: (p: string) => p === "/" },
  {
    href: "/play/mines",
    label: "Play",
    match: (p: string) => p.startsWith("/play"),
  },
  {
    href: "/leaderboard",
    label: "Board",
    match: (p: string) => p.startsWith("/leaderboard"),
  },
  {
    href: "/referral",
    label: "Refer",
    match: (p: string) => p.startsWith("/referral"),
  },
] as const;

export function MobileDock() {
  const pathname = usePathname();
  const { user } = useSkate();
  const { openAuth } = useAuthModal();
  const isGuest = !user || user.isGuest;

  return (
    <nav className="mobile-dock" aria-label="Mobile">
      {TABS.map((tab) => (
        <Link
          key={tab.href}
          href={tab.href}
          className={tab.match(pathname) ? "is-active" : undefined}
        >
          {tab.label}
        </Link>
      ))}
      {isGuest ? (
        <button
          type="button"
          className={pathname.startsWith("/profile") ? "is-active" : undefined}
          onClick={() => openAuth("signin")}
        >
          Sign in
        </button>
      ) : (
        <Link
          href="/profile"
          className={
            pathname.startsWith("/profile") || pathname.startsWith("/wallet")
              ? "is-active"
              : undefined
          }
        >
          Wallet
        </Link>
      )}
    </nav>
  );
}
