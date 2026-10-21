"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { REFERRAL_STORAGE_KEY } from "@/lib/referral";

/** Persist `?ref=` so signup can attach the invite. */
export function RefCapture() {
  const params = useSearchParams();

  useEffect(() => {
    const ref = params.get("ref")?.trim();
    if (!ref) return;
    try {
      localStorage.setItem(REFERRAL_STORAGE_KEY, ref.toLowerCase());
    } catch {
      /* ignore */
    }
  }, [params]);

  return null;
}
