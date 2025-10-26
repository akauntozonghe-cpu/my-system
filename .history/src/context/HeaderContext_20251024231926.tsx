"use client";
import { createContext, useContext, useState, useEffect, ReactNode } from "react";

type HeaderState = {
  userId?: string;
  role?: "admin" | "manager" | "user";
  userName?: string;
  expiresAt?: number;
};

type HeaderContextType = HeaderState & {
  setHeaderInfo: (info: Partial<HeaderState>) => void;
  clearHeaderInfo: () => void;
};

const HeaderContext = createContext<HeaderContextType | null>(null);

export function HeaderProvider({ children }: { children: ReactNode }) {
  const [userId, setUserId] = useState("");
  const [role, setRole] = useState<"user" | "manager">("user");
  const [userName, setUserName] = useState("");
  const [expiresAt, setExpiresAt] = useState(0);

  // --- セッション時間（管理者が定める値、ここでは30分） ---
  const sessionDuration = 30 * 60 * 1000;

  const setHeaderInfo = (info: Partial<HeaderState>) => {
    if (info.userId !== undefined) {
      setUserId(info.userId);
      localStorage.setItem("uid", info.userId);
    }
    if (info.role !== undefined) {
      setRole(info.role);
      localStorage.setItem("role", info.role);
    }
    if (info.userName !== undefined) {
      setUserName(info.userName);
      localStorage.setItem("userName", info.userName);
    }
    if (info.expiresAt !== undefined) {
      setExpiresAt(info.expiresAt);
      localStorage.setItem("expiresAt", String(info.expiresAt));
    }
  };

  const clearHeaderInfo = () => {
    setUserId("");
    setRole("user");
    setUserName("");
    setExpiresAt(0);
    localStorage.clear();
  };

  // --- 初期化時に localStorage から復元 ---
  useEffect(() => {
    const storedUid = localStorage.getItem("uid");
    const storedRole = localStorage.getItem("role");
    const storedName = localStorage.getItem("userName");
    const storedExpires = localStorage.getItem("expiresAt");

    if (storedUid && storedRole && storedName && storedExpires) {
      if (Date.now() < Number(storedExpires)) {
        setUserId(storedUid);
        setRole(storedRole as "user" | "manager");
        setUserName(storedName);
        setExpiresAt(Number(storedExpires));
      } else {
        clearHeaderInfo(); // 有効期限切れならログアウト
      }
    }
  }, []);

  // --- 定期的に有効期限をチェック ---
  useEffect(() => {
    const timer = setInterval(() => {
      if (expiresAt && Date.now() > expiresAt) {
        clearHeaderInfo();
      }
    }, 60 * 1000); // 1分ごとにチェック
    return () => clearInterval(timer);
  }, [expiresAt]);

  // --- 無操作タイマー（クリックやキー入力で延長） ---
  useEffect(() => {
    const resetTimer = () => {
      if (userId) {
        const newExpires = Date.now() + sessionDuration;
        setHeaderInfo({ expiresAt: newExpires });
      }
    };
    window.addEventListener("click", resetTimer);
    window.addEventListener("keydown", resetTimer);
    return () => {
      window.removeEventListener("click", resetTimer);
      window.removeEventListener("keydown", resetTimer);
    };
  }, [userId, sessionDuration]);

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