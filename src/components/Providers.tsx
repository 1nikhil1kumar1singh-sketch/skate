"use client";

import { Suspense } from "react";
import { SkateProvider } from "@/hooks/useSkate";
import { PrivyGate } from "@/components/PrivyGate";
import { RefCapture } from "@/components/RefCapture";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <PrivyGate>
      <SkateProvider>
        <Suspense fallback={null}>
          <RefCapture />
        </Suspense>
        {children}
      </SkateProvider>
    </PrivyGate>
  );
}
