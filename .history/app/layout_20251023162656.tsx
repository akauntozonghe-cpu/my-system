// app/layout.tsx
import Header from "@components/Header";
import { HeaderProvider } from "@context/HeaderContext";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body>
        <HeaderProvider>
          <Header /> {/* ← ここだけに置く */}
          <main className="pt-16">{children}</main>
        </HeaderProvider>
      </body>
    </html>
  );
}