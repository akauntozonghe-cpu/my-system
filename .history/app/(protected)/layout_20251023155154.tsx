// app/layout.tsx
import Header from "@components/Header";
import { HeaderProvider } from "@context/HeaderContext";

export default function RootLayout({ children }) {
  return (
    <html lang="ja">
      <body>
        <HeaderProvider>
          <Header />
          <main className="pt-16">{children}</main> {/* ヘッダー高さ分の余白 */}
        </HeaderProvider>
      </body>
    </html>
  );
}