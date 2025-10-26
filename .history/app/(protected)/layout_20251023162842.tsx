// app/(protected)/layout.tsx
"use client";

import { ReactNode } from "react";

export default function ProtectedLayout({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
    </>
  );
}