"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { GAME_CATALOG } from "@/lib/catalog";

export function GameNav() {
  const pathname = usePathname();

  return (
    <nav className="game-nav" aria-label="Originals">
      <div className="game-nav__track">
        {GAME_CATALOG.map((g) => {
          const href = `/play/${g.slug}`;
          const active = pathname === href;
          return (
            <Link
              key={g.slug}
              href={href}
              className={active ? "is-active" : undefined}
            >
              {g.title}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
