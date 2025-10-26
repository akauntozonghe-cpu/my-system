import { HeaderProvider } from "@context/HeaderContext";
import Header from "@app/(protected)/Header";

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  return (
    <HeaderProvider>
      <Header />
      {children}
    </HeaderProvider>
  );
}