import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI遺囑執行人",
  description: "近未來互動文字遊戲 — 數位遺囑執行審查系統",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-TW">
      <body>{children}</body>
    </html>
  );
}
