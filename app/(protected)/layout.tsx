// app/(protected)/layout.tsx
import Header from "./Header";
import { HeaderProvider } from "./HeaderContext";

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  return (
    <HeaderProvider>
      <div className="min-h-screen flex flex-col bg-gray-50">
        <Header />
        <main className="flex-1 mx-auto max-w-6xl w-full px-4 py-6">
          {children}
        </main>
      </div>
    </HeaderProvider>
  );
}