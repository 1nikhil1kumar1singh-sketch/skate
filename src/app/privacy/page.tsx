import type { Metadata } from "next";
import {
  LegalDocument,
  type LegalSection,
} from "@/components/LegalDocument";

export const metadata: Metadata = {
  title: "Privacy Policy — Klasshi",
  description:
    "Privacy Policy for Klasshi (klasshi.com): how we collect, use, share, and protect personal information.",
  alternates: { canonical: "https://klasshi.com/privacy" },
};

const EFFECTIVE = "22 July 2026";
const UPDATED = "22 October 2026";

const SECTIONS: LegalSection[] = [
  {
    id: "who",
    title: "1. Who we are",
    body: [
      "This Privacy Policy (“Policy”) applies to Klasshi, operated at https://klasshi.com (the “Platform”, “we”, “us”, or “our”).",
      "It explains what personal information we collect, why we collect it, how we use and share it, and the choices you have. It should be read together with our Terms & Conditions at https://klasshi.com/terms.",
      "If you do not agree with this Policy, do not use the Platform.",
    ],
  },
  {
    id: "scope",
    title: "2. Scope",
    body: [
      "This Policy covers information collected through klasshi.com, related pages (including Support, Offers, and account flows), and our APIs when you create an account, sign in (including with Google), deposit, play, withdraw, or contact us.",
      "Public blockchain networks (such as Solana) are independent of Klasshi. On-chain data you broadcast is public and outside our control once confirmed.",
    ],
  },
  {
    id: "collect",
    title: "3. Information we collect",
    body: [
      "Account & identity: email address, display name, authentication provider IDs (for example Supabase user id or Google account identifiers), and password hashes or tokens handled by our auth providers.",
      "Wallet & financial activity: personal deposit addresses, deposit and withdrawal amounts, transaction signatures, ledger balances, bets, game outcomes, referral codes, and promotional credits.",
      "Support communications: name, email, subject, and message content when you contact Support.",
      "Technical & usage data: IP address, approximate location derived from IP, device and browser type, pages viewed, referrer URLs, timestamps, and diagnostic logs needed for security and performance.",
      "Cookies and similar technologies: session cookies required to keep you signed in, and optional analytics cookies or scripts if enabled (for example Google Analytics when configured).",
    ],
  },
  {
    id: "use",
    title: "4. How we use information",
    body: [
      "Provide and operate the Platform: create accounts, authenticate you, process deposits and withdrawals, run games, display balances, and deliver offers or referrals you choose to use.",
      "Security and integrity: detect fraud, multi-accounting, abuse, bots, and prohibited activity; enforce our Terms; protect users and the Platform.",
      "Customer support: respond to tickets and resolve account or payment issues.",
      "Communications: send transactional messages such as email confirmation, security notices, and support replies. We do not sell your email for third-party marketing lists.",
      "Analytics and improvement: understand traffic, fix bugs, and improve product performance and design.",
      "Legal compliance: meet applicable legal, regulatory, tax, or law-enforcement requirements.",
    ],
  },
  {
    id: "legal-bases",
    title: "5. Legal bases (where applicable)",
    body: [
      "Where data-protection laws require a legal basis, we rely on: performance of a contract (providing the Platform you request); legitimate interests (security, fraud prevention, product improvement, in ways that do not override your rights); consent (where we ask for it, such as certain cookies or optional features); and legal obligation.",
    ],
  },
  {
    id: "sharing",
    title: "6. How we share information",
    body: [
      "Service providers: hosting and infrastructure (for example cloud hosts), databases, email delivery, authentication (for example Supabase and Google sign-in), and analytics providers that process data on our instructions.",
      "Blockchain: deposits, withdrawals, and related transfers you initiate are recorded on public ledgers and may be visible to anyone.",
      "Legal and safety: we may disclose information to courts, regulators, or law enforcement when required, or when we reasonably believe disclosure is necessary to protect rights, safety, or investigate abuse.",
      "Business transfers: if we undergo a merger, acquisition, or asset sale, personal information may transfer as part of that transaction under appropriate safeguards.",
      "We do not sell your personal information.",
    ],
  },
  {
    id: "google",
    title: "7. Google sign-in",
    body: [
      "If you choose “Continue with Google”, Google authenticates you and may share with us basic profile information such as your name and email address, as permitted by your Google settings and Google’s policies.",
      "Your use of Google is also subject to Google’s Privacy Policy. We use that information only to create or link your Klasshi account and operate the Platform.",
      "Klasshi’s use of Google APIs is limited to authentication and account access. We do not use Google APIs to create, generate, edit, distribute, or facilitate AI-generated non-consensual intimate imagery (AI NCII), deepnudes, or similar abusive content. The Platform does not provide image-generation features of that kind.",
      "A plain-language summary of our application purpose and Google API use is always published at https://klasshi.com/about and on the home page at https://klasshi.com.",
    ],
  },
  {
    id: "international",
    title: "8. International processing",
    body: [
      "We and our providers may process information in countries other than where you live. Where required, we use appropriate safeguards for cross-border transfers.",
    ],
  },
  {
    id: "retention",
    title: "9. Retention",
    body: [
      "We keep account, wagering, deposit, and withdrawal records for as long as your account is active and thereafter as needed for security, dispute resolution, fraud prevention, accounting, and legal obligations.",
      "Support tickets and logs are retained for a reasonable period to resolve issues and improve service, then deleted or anonymized where practicable.",
    ],
  },
  {
    id: "security",
    title: "10. Security",
    body: [
      "We use reasonable technical and organizational measures to protect personal information, including access controls, encrypted transport (HTTPS), and restricted access to production systems.",
      "No method of transmission or storage is completely secure. You are responsible for keeping your login credentials confidential.",
    ],
  },
  {
    id: "rights",
    title: "11. Your rights & choices",
    body: [
      "Depending on your location, you may have rights to access, correct, delete, or restrict certain personal information, or to object to certain processing, and to lodge a complaint with a supervisory authority.",
      "You can update some profile details in your account, stop using the Platform, or contact Support at https://klasshi.com/support to make a privacy request. We may need to verify your identity and may retain information where required by law or for legitimate security purposes.",
      "You can control cookies through your browser settings. Disabling necessary cookies may prevent sign-in or core features from working.",
    ],
  },
  {
    id: "children",
    title: "12. Children",
    body: [
      "Klasshi is intended only for adults 18 years or older (or the age of majority in your jurisdiction). We do not knowingly collect personal information from children. If you believe a minor has provided information, contact Support and we will take appropriate steps.",
    ],
  },
  {
    id: "changes",
    title: "13. Changes to this Policy",
    body: [
      "We may update this Policy from time to time. We will change the “Updated” date above when we do. Continued use of the Platform after changes means you accept the revised Policy. Material changes may also be highlighted on the Platform.",
    ],
  },
  {
    id: "contact",
    title: "14. Contact",
    body: [
      "Privacy and data requests: https://klasshi.com/support",
      "Operator: Klasshi · Website: https://klasshi.com · Terms: https://klasshi.com/terms",
    ],
  },
];

export default function PrivacyPage() {
  return (
    <LegalDocument
      title="Privacy Policy"
      effective={EFFECTIVE}
      updated={UPDATED}
      lead="This Policy describes how Klasshi collects, uses, shares, and protects personal information when you use klasshi.com."
      sections={SECTIONS}
      footerNote="Questions about privacy? Contact Support. This Policy is provided for transparency and does not constitute legal advice."
    />
  );
}
