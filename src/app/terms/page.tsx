import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms & Conditions — Klasshi",
  description: "Terms of use for Klasshi, a Solana USDC gaming platform.",
};

const EFFECTIVE = "22 July 2026";

const SECTIONS: { id: string; title: string; body: string[] }[] = [
  {
    id: "agreement",
    title: "1. Agreement to terms",
    body: [
      "These Terms & Conditions (“Terms”) govern your access to and use of Klasshi (the “Platform”), including the website at klasshi.com, related apps, APIs, and any games, wallets, or services we operate.",
      "By creating an account, connecting a wallet, depositing funds, or placing a wager, you agree to these Terms. If you do not agree, do not use the Platform.",
    ],
  },
  {
    id: "eligibility",
    title: "2. Eligibility",
    body: [
      "You must be at least 18 years old (or the legal age of majority in your jurisdiction, whichever is higher) to use Klasshi.",
      "You are solely responsible for ensuring that online gaming and cryptocurrency use are lawful where you live. Access from prohibited jurisdictions is not permitted.",
      "We may request identity, age, or source-of-funds verification at any time. Failure to cooperate may result in restricted access or account closure.",
    ],
  },
  {
    id: "account",
    title: "3. Accounts & security",
    body: [
      "You must provide accurate registration details and keep login credentials confidential. You are responsible for all activity under your account.",
      "One natural person may maintain only one account unless we expressly approve otherwise. Multi-accounting, shared accounts, and bot-assisted play may be voided.",
      "Notify us promptly of any unauthorized access. We are not liable for losses arising from compromised credentials where you failed to take reasonable care.",
    ],
  },
  {
    id: "funds",
    title: "4. Deposits, balances & withdrawals",
    body: [
      "Klasshi maintains a custodial ledger balance denominated in USD-stable assets (e.g. USDC / USDT on Solana). Deposits credit after network confirmation and our verification.",
      "You are responsible for sending supported assets to the correct deposit address on the correct network. Unsupported tokens, wrong networks, or mistyped addresses may result in irreversible loss.",
      "Withdrawals are subject to fees, limits, security checks, and available liquidity. We may delay or refuse withdrawals where we reasonably suspect fraud, abuse, sanction risk, or technical failure.",
      "Bonus, referral, and promotional balances may be non-withdrawable or subject to wagering and unlock rules disclosed at the time of the offer.",
    ],
  },
  {
    id: "games",
    title: "5. Games, odds & fairness",
    body: [
      "Games on Klasshi are games of chance with a house edge. Past results do not predict future outcomes. You may lose some or all of the funds you wager.",
      "Where marked as provably fair, outcomes are derived from committed server seeds, client seeds, and nonces. You may verify rounds using the tools we provide.",
      "Maximum bet, maximum win, and payout multipliers may apply. Malfunctions void all pays and plays for the affected round.",
      "We may suspend, alter, or remove any game, limit, or feature without prior notice where reasonably required for security, compliance, or platform integrity.",
    ],
  },
  {
    id: "promotions",
    title: "6. Promotions, referrals & leaderboards",
    body: [
      "Promotional offers (including first-deposit matches, referrals, and seasonal leaderboards) are discretionary. Rules shown with each offer form part of these Terms.",
      "Self-referrals, collusion, abuse, or exploitation of bugs voids related rewards. We may claw back improperly obtained credits.",
      "We may modify, pause, or end any promotion at any time. Illustrative or demo leaderboard data is not a guarantee of payout.",
    ],
  },
  {
    id: "prohibited",
    title: "7. Prohibited conduct",
    body: [
      "You must not: (a) use the Platform for money laundering, sanctions evasion, or other unlawful activity; (b) attack, scrape, or reverse-engineer our systems beyond permitted verification; (c) exploit bugs or latency; (d) use VPNs or proxies to circumvent geo-restrictions where doing so violates law or these Terms; (e) harass staff or other users.",
      "We may freeze balances, reverse wagers, withhold withdrawals, and close accounts where we reasonably believe these Terms or applicable law have been breached.",
    ],
  },
  {
    id: "risk",
    title: "8. Blockchain & technology risk",
    body: [
      "Cryptocurrency and smart-contract systems involve risk, including volatility, network congestion, forks, third-party RPC failure, and irreversible transactions.",
      "Klasshi is not affiliated with the Solana Foundation, Circle, Tether, or any wallet provider. We do not control public blockchain networks.",
      "Service may be interrupted for maintenance, outages, or force majeure. We do not guarantee uninterrupted or error-free operation.",
    ],
  },
  {
    id: "ip",
    title: "9. Intellectual property",
    body: [
      "The Klasshi name, branding, UI, game presentation, and software are owned by us or our licensors. You receive a limited, revocable license to use the Platform for personal, lawful play only.",
      "You may not copy, resell, frame, or commercially exploit our content without prior written consent.",
    ],
  },
  {
    id: "disclaimer",
    title: "10. Disclaimers",
    body: [
      "THE PLATFORM IS PROVIDED “AS IS” AND “AS AVAILABLE” WITHOUT WARRANTIES OF ANY KIND, WHETHER EXPRESS OR IMPLIED, INCLUDING MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT, TO THE MAXIMUM EXTENT PERMITTED BY LAW.",
      "We do not warrant that games will meet your expectations, that results will be profitable, or that the Platform will be free of viruses or harmful components.",
    ],
  },
  {
    id: "liability",
    title: "11. Limitation of liability",
    body: [
      "To the fullest extent permitted by law, Klasshi and its operators, officers, and contractors shall not be liable for any indirect, incidental, special, consequential, or punitive damages, or any loss of profits, data, or goodwill.",
      "Our aggregate liability arising out of or relating to the Platform shall not exceed the greater of (a) the net amount of fees you paid us in the three months preceding the claim, or (b) one hundred US dollars (US$100).",
      "Nothing in these Terms excludes liability that cannot be excluded under applicable law.",
    ],
  },
  {
    id: "indemnity",
    title: "12. Indemnity",
    body: [
      "You agree to indemnify and hold harmless Klasshi and its operators from claims, damages, losses, and expenses (including reasonable legal fees) arising from your use of the Platform, your breach of these Terms, or your violation of any law or third-party right.",
    ],
  },
  {
    id: "changes",
    title: "13. Changes to terms",
    body: [
      "We may update these Terms from time to time. The “Effective date” above will change when we do. Continued use after changes constitutes acceptance of the revised Terms.",
      "Material changes may be highlighted on the Platform. It remains your responsibility to review this page periodically.",
    ],
  },
  {
    id: "law",
    title: "14. Governing law",
    body: [
      "These Terms are governed by the laws applicable to the operator of Klasshi, without regard to conflict-of-law rules. Courts in that venue shall have exclusive jurisdiction, except where mandatory consumer protections require otherwise.",
      "If any provision is held unenforceable, the remaining provisions continue in full force.",
    ],
  },
  {
    id: "contact",
    title: "15. Contact",
    body: [
      "For questions about these Terms, contact support at klasshi.com/support.",
      "Operator: Klasshi · Website: https://klasshi.com",
    ],
  },
];

export default function TermsPage() {
  return (
    <main className="legal-page">
      <header className="legal-hero">
        <p className="legal-kicker">Legal</p>
        <h1>Terms &amp; Conditions</h1>
        <p className="legal-meta">
          Effective date: <strong>{EFFECTIVE}</strong>
          <span aria-hidden> · </span>
          Klasshi · klasshi.com
        </p>
        <p className="legal-lead">
          Please read these Terms carefully before using Klasshi. They form a
          binding agreement between you and the Platform operator.
        </p>
      </header>

      <nav className="legal-toc" aria-label="On this page">
        <h2>Contents</h2>
        <ol>
          {SECTIONS.map((s) => (
            <li key={s.id}>
              <a href={`#${s.id}`}>{s.title.replace(/^\d+\.\s*/, "")}</a>
            </li>
          ))}
        </ol>
      </nav>

      <div className="legal-body">
        {SECTIONS.map((s) => (
          <section key={s.id} id={s.id} className="legal-section">
            <h2>{s.title}</h2>
            {s.body.map((p) => (
              <p key={p.slice(0, 48)}>{p}</p>
            ))}
          </section>
        ))}
      </div>

      <footer className="legal-footer">
        <p>
          By using Klasshi you acknowledge that gambling involves risk and that
          you are of legal age in your jurisdiction.
        </p>
        <div className="legal-footer__actions">
          <Link href="/" className="btn btn--primary">
            Back to lobby
          </Link>
          <Link href="/referral" className="btn">
            Referral terms
          </Link>
        </div>
      </footer>
    </main>
  );
}
