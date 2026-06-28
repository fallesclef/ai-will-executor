import type { Metadata } from "next";
import { GoogleAnalytics } from "@next/third-parties/google";
import "./globals.css";
import { AppProviders } from "@/components/AppProviders";
import { getGaMeasurementId, isGaEnabled } from "@/lib/analytics/config";

export const metadata: Metadata = {
  title: "AI遺囑執行人",
  description: "近未來互動文字遊戲 — 數位遺囑執行審查系統",
  icons: {
    icon: "/logo.png",
    apple: "/logo.png",
  },
};

const gaId = getGaMeasurementId();

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-TW" suppressHydrationWarning>
      <body>
        <AppProviders>{children}</AppProviders>
        {isGaEnabled() && gaId ? <GoogleAnalytics gaId={gaId} /> : null}
      </body>
    </html>
  );
}
