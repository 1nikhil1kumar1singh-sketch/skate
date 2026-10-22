"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import Script from "next/script";

/**
 * Page-view beacon for Klasshi admin traffic + optional GA4 / Tawk chat.
 */
export function SiteInsights() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const gaId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID?.trim();
  const tawkId = process.env.NEXT_PUBLIC_TAWK_PROPERTY_ID?.trim();

  useEffect(() => {
    const path =
      pathname +
      (searchParams?.toString() ? `?${searchParams.toString()}` : "");
    void fetch("/api/analytics/pageview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        path,
        referrer: typeof document !== "undefined" ? document.referrer : "",
      }),
      keepalive: true,
    }).catch(() => undefined);

    if (gaId && typeof window !== "undefined") {
      const w = window as Window & {
        gtag?: (...args: unknown[]) => void;
        dataLayer?: unknown[];
      };
      w.dataLayer = w.dataLayer || [];
      w.gtag =
        w.gtag ||
        function gtag(...args: unknown[]) {
          w.dataLayer?.push(args);
        };
      w.gtag("config", gaId, { page_path: path });
    }
  }, [pathname, searchParams, gaId]);

  return (
    <>
      {gaId ? (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
            strategy="afterInteractive"
          />
          <Script id="ga4-init" strategy="afterInteractive">
            {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${gaId}');`}
          </Script>
        </>
      ) : null}
      {tawkId ? (
        <Script id="tawk-widget" strategy="afterInteractive">
          {`var Tawk_API=Tawk_API||{},Tawk_LoadStart=new Date();
(function(){var s1=document.createElement("script"),s0=document.getElementsByTagName("script")[0];
s1.async=true;s1.src='https://embed.tawk.to/${tawkId}';
s1.charset='UTF-8';s1.setAttribute('crossorigin','*');
s0.parentNode.insertBefore(s1,s0);})();`}
        </Script>
      ) : null}
    </>
  );
}
