import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI遺囑執行人 · 母親的刪除請求",
  description: "近未來互動文字遊戲 — AI 遺囑執行審查系統",
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
