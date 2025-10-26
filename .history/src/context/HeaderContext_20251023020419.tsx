"use client";
import { createContext, useContext, useState, ReactNode } from "react";

type HeaderState = {
  userId: string;
  role: string;
  userName: string;
  expiresAt: number; // セッション有効期限
};

type HeaderContextType = HeaderState & {
  setHeaderInfo: (info: Partial<HeaderState>) => void;
  clearHeaderInfo: () => void;
};

const HeaderContext = createContext<HeaderContextType | null>(null);

export function HeaderProvider({ children }: { children: ReactNode }) {
  const [userId, setUserId] = useState("");   // ← 追加
  const [role, setRole] = useState("user");
  const [userName, setUserName] = useState("");
  const [expiresAt, setExpiresAt] = useState(0);

  const setHeaderInfo = (info: Partial<HeaderState>) => {
    if (info.userId !== undefined) setUserId(info.userId);   // ← 追加
    if (info.role !== undefined) setRole(info.role);
    if (info.userName !== undefined) setUserName(info.userName);
    if (info.expiresAt !== undefined) setExpiresAt(info.expiresAt);
  };

  const clearHeaderInfo = () => {
    setUserId("");   // ← 追加
    setRole("user");
    setUserName("");
    setExpiresAt(0);
  };

  return (
    <HeaderContext.Provider
      value={{ userId, role, userName, expiresAt, setHeaderInfo, clearHeaderInfo }}
    >
      {children}
    </HeaderContext.Provider>
  );
}

export function useHeader() {
  const ctx = useContext(HeaderContext);
  if (!ctx) throw new Error("useHeader must be used within HeaderProvider");
  return ctx;
}