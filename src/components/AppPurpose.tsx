import Link from "next/link";

/** Server-rendered purpose / Google API compliance copy (always in HTML). */
export function AppPurpose({ variant = "home" }: { variant?: "home" | "page" }) {
  return (
    <section
      className={variant === "page" ? "home-purpose home-purpose--page" : "home-purpose"}
      aria-labelledby="app-purpose-title"
    >
      <h2 id="app-purpose-title">Application purpose</h2>
      <p>
        <strong>Klasshi</strong> (https://klasshi.com) is an online casino
        platform for adults aged 18 or older. Our sole product purpose is online
        gaming: players deposit USDC or USDT on the Solana blockchain, play
        provably fair original games of chance (including mines, limbo, crash,
        dice, keno, roulette, slots, and similar titles), manage a custodial
        USD-denominated balance, and withdraw to a Solana wallet.
      </p>

      <h3>Use of Google APIs</h3>
      <p>
        If you choose “Continue with Google”, we use Google Sign-In /
        OAuth solely to authenticate you and create or link a Klasshi account
        (email and basic profile). We do not use Google APIs for advertising
        audiences, content generation, media processing, or any other purpose.
      </p>

      <h3>AI NCII policy</h3>
      <p>
        Klasshi does not create, generate, edit, host, distribute, or
        facilitate AI-generated non-consensual intimate imagery (AI NCII),
        deepnudes, deepfakes of intimate imagery, or similar abusive content.
        We do not use Google APIs for AI NCII or for any image-generation
        features. The Platform has no AI image-generation product.
      </p>

      <p>
        Gambling involves risk of loss. See{" "}
        <Link href="/terms">Terms &amp; Conditions</Link>,{" "}
        <Link href="/privacy">Privacy Policy</Link>
        {variant === "home" ? (
          <>
            , and <Link href="/about">About Klasshi</Link>
          </>
        ) : null}
        .
      </p>
    </section>
  );
}
