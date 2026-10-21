"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

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
  {
    href: "/profile",
    label: "Wallet",
    match: (p: string) => p.startsWith("/profile") || p.startsWith("/wallet"),
  },
] as const;

export function MobileDock() {
  const pathname = usePathname();

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
    </nav>
  );
}
