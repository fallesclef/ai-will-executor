"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { trackGaPageView } from "@/lib/analytics/track";
import { trackLobbyView } from "@/lib/analytics/events";
import { useLocale } from "@/lib/i18n/context";

/** Client-side page views + lobby funnel step. Skips /admin. */
export function AnalyticsTracker() {
  const pathname = usePathname();
  const { locale } = useLocale();

  useEffect(() => {
    if (pathname.startsWith("/admin")) return;
    trackGaPageView(pathname);
    if (pathname === "/") {
      trackLobbyView(locale);
    }
  }, [pathname, locale]);

  return null;
}
