import { HeaderProvider } from "@context/HeaderContext";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <HeaderProvider>
      {children}   {/* ← ヘッダーは表示しない */}
    </HeaderProvider>
  );
}