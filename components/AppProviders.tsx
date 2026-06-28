"use client";

import { LocaleProvider } from "@/lib/i18n/context";
import { AnalyticsTracker } from "@/components/AnalyticsTracker";

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <LocaleProvider>
      <AnalyticsTracker />
      {children}
    </LocaleProvider>
  );
}
