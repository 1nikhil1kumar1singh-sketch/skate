import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy — Klasshi",
  description: "How Klasshi collects, uses, and protects personal information.",
};

const EFFECTIVE = "22 July 2026";

const SECTIONS: { id: string; title: string; body: string[] }[] = [
  {
    id: "intro",
    title: "1. Introduction",
    body: [
      "This Privacy Policy explains how Klasshi (“we”, “us”) collects and uses information when you use klasshi.com and related services (the “Platform”).",
      "By using the Platform, you agree to this Policy together with our Terms & Conditions.",
    ],
  },
  {
    id: "collect",
    title: "2. Information we collect",
    body: [
      "Account data: email address, display name, and authentication identifiers (for example from Google or email sign-in).",
      "Wallet & ledger data: deposit addresses, transaction signatures, balances, bets, and withdrawal requests needed to operate the Platform.",
      "Technical data: IP address, browser type, device information, and pages visited (including basic traffic analytics).",
      "Support data: messages you send through Support, including name, email, and content of your request.",
    ],
  },
  {
    id: "use",
    title: "3. How we use information",
    body: [
      "To create and secure accounts, process deposits and withdrawals, run games, and show balances.",
      "To prevent fraud, abuse, multi-accounting, and prohibited activity, and to comply with law.",
      "To respond to support requests and send transactional messages (for example account confirmation).",
      "To improve the Platform, measure traffic, and maintain security.",
    ],
  },
  {
    id: "sharing",
    title: "4. Sharing",
    body: [
      "We use service providers such as hosting, database, email, and analytics vendors that process data on our instructions.",
      "Blockchain transactions you authorize are public on Solana and are not controlled by us once broadcast.",
      "We may disclose information if required by law or to protect the Platform, users, or others from harm.",
      "We do not sell your personal information.",
    ],
  },
  {
    id: "retention",
    title: "5. Retention & security",
    body: [
      "We retain account and transaction records as needed to operate the Platform, resolve disputes, and meet legal obligations.",
      "We apply reasonable technical and organizational measures to protect data, but no method of transmission or storage is perfectly secure.",
    ],
  },
  {
    id: "rights",
    title: "6. Your choices",
    body: [
      "You may update profile details in your account where available, and contact Support to request account-related assistance.",
      "You may stop using the Platform at any time. Some records may be retained where required for security, fraud prevention, or law.",
    ],
  },
  {
    id: "children",
    title: "7. Children",
    body: [
      "The Platform is for users 18+ (or the age of majority in your jurisdiction). We do not knowingly collect data from minors.",
    ],
  },
  {
    id: "changes",
    title: "8. Changes",
    body: [
      "We may update this Policy from time to time. The effective date above will change when we do. Continued use after changes means you accept the updated Policy.",
    ],
  },
  {
    id: "contact",
    title: "9. Contact",
    body: [
      "Privacy questions: use Support at https://klasshi.com/support or the contact channels listed on klasshi.com.",
    ],
  },
];

export default function PrivacyPage() {
  return (
    <main className="legal-page">
      <header className="legal-hero">
        <p className="legal-kicker">Legal</p>
        <h1>Privacy Policy</h1>
        <p className="legal-meta">
          Effective date: {EFFECTIVE} · Klasshi · klasshi.com
        </p>
        <p className="legal-lead">
          This Policy describes how we handle personal information on Klasshi.
        </p>
      </header>

      <nav className="legal-toc" aria-label="Privacy sections">
        <ol>
          {SECTIONS.map((s) => (
            <li key={s.id}>
              <a href={`#${s.id}`}>{s.title.replace(/^\d+\.\s*/, "")}</a>
            </li>
          ))}
        </ol>
      </nav>

      {SECTIONS.map((s) => (
        <section key={s.id} id={s.id} className="legal-section">
          <h2>{s.title}</h2>
          {s.body.map((p) => (
            <p key={p}>{p}</p>
          ))}
        </section>
      ))}

      <p className="legal-back">
        <Link href="/terms">Terms &amp; Conditions</Link>
        {" · "}
        <Link href="/support">Support</Link>
        {" · "}
        <Link href="/">Lobby</Link>
      </p>
    </main>
  );
}
