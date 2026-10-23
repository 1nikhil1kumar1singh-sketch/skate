import type { Metadata } from "next";
import Link from "next/link";
import { AppPurpose } from "@/components/AppPurpose";

export const metadata: Metadata = {
  title: "About Klasshi — Application purpose & Google API use",
  description:
    "Klasshi is an adult online Solana USDC casino. Google Sign-In is used only for account authentication. We do not use Google APIs for AI NCII or image generation.",
  alternates: { canonical: "https://klasshi.com/about" },
};

export default function AboutPage() {
  return (
    <main className="legal-page">
      <header className="legal-hero">
        <p className="legal-kicker">About</p>
        <h1>Klasshi application purpose</h1>
        <p className="legal-lead">
          Clear description of what Klasshi is, how Google Sign-In is used, and
          our AI NCII policy — for users and Google API compliance review.
        </p>
      </header>

      <AppPurpose variant="page" />

      <p className="home-purpose home-purpose--links">
        <Link href="/">Back to lobby</Link>
        {" · "}
        <Link href="/support">Support</Link>
      </p>
    </main>
  );
}
