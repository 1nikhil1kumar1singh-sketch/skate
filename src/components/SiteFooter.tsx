import Link from "next/link";

const ORIGINALS = [
  { href: "/play/mines", label: "Mines" },
  { href: "/play/limbo", label: "Limbo" },
  { href: "/play/crash", label: "Crash" },
  { href: "/play/dice", label: "Dice" },
  { href: "/play/keno", label: "Keno" },
  { href: "/play/roulette", label: "Roulette" },
] as const;

const ACCOUNT = [
  { href: "/", label: "Lobby" },
  { href: "/profile", label: "Wallet" },
  { href: "/profile", label: "Cashier" },
] as const;

export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="site-footer">
      <div className="site-footer__panel">
        <div className="site-footer__grid">
          <div className="site-footer__about">
            <Link href="/" className="brand-mark site-footer__logo">
              <span className="brand-mark__slash">/</span>
              KLASSHI
            </Link>
            <p>Provably fair Solana originals. Deposit, play, withdraw.</p>
          </div>

          <div className="site-footer__col">
            <h3>Casino</h3>
            <ul>
              {ORIGINALS.map((l) => (
                <li key={l.href}>
                  <Link href={l.href}>{l.label}</Link>
                </li>
              ))}
              <li>
                <Link href="/" className="site-footer__all">
                  All originals
                </Link>
              </li>
            </ul>
          </div>

          <div className="site-footer__col">
            <h3>Account</h3>
            <ul>
              {ACCOUNT.map((l) => (
                <li key={l.label}>
                  <Link href={l.href}>{l.label}</Link>
                </li>
              ))}
              <li>
                <Link href="/offers">Offers</Link>
              </li>
              <li>
                <Link href="/referral">Referral</Link>
              </li>
              <li>
                <Link href="/leaderboard">Leaderboard</Link>
              </li>
            </ul>
          </div>

          <div className="site-footer__col">
            <h3>Legal</h3>
            <ul>
              <li>
                <Link href="/support">Support</Link>
              </li>
              <li>
                <Link href="/terms">Terms &amp; Conditions</Link>
              </li>
              <li>
                <Link href="/privacy">Privacy Policy</Link>
              </li>
              <li>
                <span>18+ only</span>
              </li>
              <li>
                <span>Play within your means</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="site-footer__bar">
          <p>
            © {year} Klasshi · klasshi.com · 18+ · Outcomes are random and
            house-edged ·{" "}
            <Link href="/terms">Terms</Link>
          </p>
        </div>
      </div>
    </footer>
  );
}
