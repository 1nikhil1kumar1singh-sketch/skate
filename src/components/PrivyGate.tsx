"use client";

import { useEffect, useState, type ComponentType, type ReactNode } from "react";

/**
 * Lazily mounts Privy only when NEXT_PUBLIC_PRIVY_APP_ID is set.
 * Demo mode works without a Privy subscription.
 */
export function PrivyGate({ children }: { children: ReactNode }) {
  const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID;
  const [Wrapper, setWrapper] = useState<ComponentType<{
    children: ReactNode;
  }> | null>(null);

  useEffect(() => {
    if (!appId) return;
    let cancelled = false;

    const id = appId;
    void import("@privy-io/react-auth").then(({ PrivyProvider }) => {
      if (cancelled) return;

      function Wrapped({ children }: { children: ReactNode }) {
        return (
          <PrivyProvider
            appId={id}
            config={{
              loginMethods: ["email", "wallet", "google"],
              appearance: {
                theme: "dark",
                accentColor: "#00F0FF",
              },
            }}
          >
            {children}
          </PrivyProvider>
        );
      }

      setWrapper(() => Wrapped);
    });

    return () => {
      cancelled = true;
    };
  }, [appId]);

  if (!appId || !Wrapper) {
    return <>{children}</>;
  }

  return <Wrapper>{children}</Wrapper>;
}
