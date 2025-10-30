// app/layout.tsx
import Header from "@/components/Header";


export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body>
        <Header />   {/* ← ここに共通ヘッダー */}
        <main>{children}</main>
      </body>
    </html>
  );
}