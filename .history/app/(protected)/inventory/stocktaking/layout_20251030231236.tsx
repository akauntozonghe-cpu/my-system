import "./globals.css";
import Header from "@components/Header";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body>
        <Header />   {/* ← ホーム以降は常に表示 */}
        <main>{children}</main>
      </body>
    </html>
  );
}