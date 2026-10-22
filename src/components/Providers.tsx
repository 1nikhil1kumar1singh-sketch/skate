"use client";

import { Suspense } from "react";
import { SkateProvider } from "@/hooks/useSkate";
import { PrivyGate } from "@/components/PrivyGate";
import { RefCapture } from "@/components/RefCapture";
import { AuthModalProvider } from "@/components/AuthModal";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <PrivyGate>
      <SkateProvider>
        <AuthModalProvider>
          <Suspense fallback={null}>
            <RefCapture />
          </Suspense>
          {children}
        </AuthModalProvider>
      </SkateProvider>
    </PrivyGate>
  );
}
