// app/layout.tsx
import "./globals.css";
import Header from "@components/Header";
import { HeaderProvider } from "@context/HeaderContext";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "在庫管理システム",
  description: "責任者情報を含む共通レイアウト",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body>
        <HeaderProvider>
          {/* 共通ヘッダー */}
          <Header />

          {/* メインコンテンツ */}
          <main className="pt-16">
            {children}
          </main>
        </HeaderProvider>
      </body>
    </html>
  );
}