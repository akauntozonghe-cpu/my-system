"use client";

import { createContext, useContext, useEffect, useState } from "react";

type HeaderState = {
  userName: string | null;
  uid: string | null;
  role: string | null;
  screenTitle: string;
  setScreenTitle: (t: string) => void;
};

const HeaderContext = createContext<HeaderState | null>(null);

export function HeaderProvider({ children }: { children: React.ReactNode }) {
  const [userName, setUserName] = useState<string | null>(null);
  const [uid, setUid] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [screenTitle, setScreenTitle] = useState<string>("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setUserName(localStorage.getItem("userName"));
      setUid(localStorage.getItem("uid"));
      setRole(localStorage.getItem("role"));
    }
  }, []);

  return (
    <HeaderContext.Provider value={{ userName, uid, role, screenTitle, setScreenTitle }}>
      {children}
    </HeaderContext.Provider>
  );
}

export function useHeader() {
  const ctx = useContext(HeaderContext);
  if (!ctx) throw new Error("useHeader must be used within HeaderProvider");
  return ctx;
}