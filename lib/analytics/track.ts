"use client";

import { sendGAEvent } from "@next/third-parties/google";
import { getGaMeasurementId, isGaEnabledClient } from "./config";

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

function shouldTrack(): boolean {
  if (!isGaEnabledClient()) return false;
  if (
    typeof window !== "undefined" &&
    window.location.pathname.startsWith("/admin")
  ) {
    return false;
  }
  return true;
}

/** Low-level GA4 event — never pass PII (email, names, playerId). */
export function trackGaEvent(
  eventName: string,
  params?: Record<string, string | number | boolean>
): void {
  if (!shouldTrack()) return;
  sendGAEvent("event", eventName, params ?? {});
}

/** SPA route change page_view (complements @next/third-parties initial load). */
export function trackGaPageView(pathname: string): void {
  if (!shouldTrack()) return;
  const id = getGaMeasurementId();
  if (!id || typeof window === "undefined" || !window.gtag) return;
  window.gtag("config", id, { page_path: pathname });
}
