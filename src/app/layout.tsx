import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import { Orbitron, Space_Grotesk } from "next/font/google";
import { Providers } from "@/components/Providers";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { MobileDock } from "@/components/MobileDock";
import { OfferPopup } from "@/components/OfferPopup";
import { SiteInsights } from "@/components/SiteInsights";
import "./globals.css";

const display = Orbitron({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["600", "700", "800"],
});

const body = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-body",
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Klasshi — Solana USDC Casino",
  description:
    "Klasshi is an online casino for adults (18+): deposit USDC/USDT on Solana, play provably fair originals (mines, limbo, crash, dice, and more), and withdraw. Google Sign-In is used only to create and secure your account—not for image generation or AI NCII.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#05060a",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable} h-full`}>
      <body className="min-h-full antialiased app-shell">
        <Providers>
          <SiteHeader />
          <div className="app-main">{children}</div>
          <SiteFooter />
          <MobileDock />
          <Suspense fallback={null}>
            <OfferPopup />
          </Suspense>
          <Suspense fallback={null}>
            <SiteInsights />
          </Suspense>
        </Providers>
      </body>
    </html>
  );
}
