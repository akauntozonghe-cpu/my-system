// app/(protected)/layout.tsx
import { ReactNode } from "react";
import Header from "@components/Header";
import { HeaderProvider } from "@context/HeaderContext";

export default function ProtectedLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ja">
      <body>
        <HeaderProvider>
          <Header />
          <main className="pt-16">{children}</main>
        </HeaderProvider>
      </body>
    </html>
  );
}