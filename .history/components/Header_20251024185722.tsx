"use client";

import { useEffect, useState, useRef } from "react";
import Image from "next/image";
import { Bell, Menu, X } from "lucide-react";
import { useRouter, usePathname } from "next/navigation";
import { db } from "@lib/firebase";
import {
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import { logAction } from "@lib/logging";

export default function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const [time, setTime] = useState<string>("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState<number>(0);
  const [userName, setUserName] = useState<string>("未登録");
  const [role, setRole] = useState<string | null>(null);
  const [uid, setUid] = useState<string | null>(null);
  const [lastLogout, setLastLogout] = useState<Date | null>(null);
  const [showUserModal, setShowUserModal] = useState(false);
  const [inputId, setInputId] = useState("");
  const [roleChoice, setRoleChoice] = useState<"switch" | "promote" | null>(null);
  const [isManager, setIsManager] = useState(false);
  const [error, setError] = useState("");
  const menuRef = useRef<HTMLDivElement>(null);

  // 現在時刻を更新
  useEffect(() => {
    const updateTime = () => setTime(formatDateTime(new Date()));
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  // 外側クリックでメニューを閉じる
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    if (menuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuOpen]);

  // 日付フォーマット
  const formatDateTime = (date: Date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    const weekday = ["日", "月", "火", "水", "木", "金", "土"][date.getDay()];
    const hh = String(date.getHours()).padStart(2, "0");
    const mm = String(date.getMinutes()).padStart(2, "0");
    const ss = String(date.getSeconds()).padStart(2, "0");
    return `${y}年${m}月${d}日（${weekday}） ${hh}:${mm}:${ss}`;
  };

  // ユーザー切替処理
  const handleUserSwitch = async () => {
    setError("");
    try {
      const q = query(collection(db, "users"), where("id", "==", inputId));
      const snap = await getDocs(q);

      if (snap.empty) {
        setError("番号が無効です");
        setIsManager(false);
        return;
      }

      const userDoc = snap.docs[0];
      const data = userDoc.data();

      let newRole = "responsible";
      let actionType = "login";

      if (data.role === "manager") {
        if (!roleChoice) {
          setError("切替か昇格を選んでください");
          return;
        }
        newRole = "manager";
        actionType = roleChoice === "switch" ? "switch" : "promote";
      }

      // localStorage に保存
      localStorage.setItem("role", newRole);
      localStorage.setItem("uid", userDoc.id);
      localStorage.setItem("userName", data.name);

      // state 更新
      setRole(newRole);
      setUid(userDoc.id);
      setUserName(data.name);

      // 監査ログを記録
      await logAction(userDoc.id, data.name, newRole, actionType, {
        inputId,
        roleChoice,
      });

      // 状態クリア
      setInputId("");
      setIsManager(false);
      setRoleChoice(null);
      setShowUserModal(false);
    } catch (err) {
      console.error(err);
      setError("処理中にエラーが発生しました");
    }
  };

  const menuItems = [
    { label: "ホーム", path: "/home" },
    { label: "登録", path: "/inventory/register" },
    { label: "一覧", path: "/inventory/list" },
    { label: "フリマ", path: "/market" },
    { label: "棚卸", path: "/inventory/stocktaking" },
    { label: "報告", path: "/report" },
    { label: "管理者", path: "/admin" },
    { label: "ログアウト", path: "/logout" },
  ];

  return (
    <header className="w-full flex items-center justify-between px-6 py-3 bg-white border-b shadow-sm">
      {/* 左：アイコン＋タイトル */}
      <div
        className="flex items-center gap-2 cursor-pointer"
        onClick={() => router.push("/home")}
      >
        <Image src="/icon-192.png" alt="logo" width={32} height={32} />
        <span className="font-bold text-lg text-black">在庫管理</span>
      </div>

      {/* 中央：現在時刻＋最終ログアウト */}
      <div className="text-sm text-gray-600 font-medium text-center">
        <div>{time}</div>
        <div className="text-xs text-gray-400">
          最終ログアウト: {lastLogout ? formatDateTime(lastLogout) : "未記録"}
        </div>
      </div>

      {/* 右：責任者名＋権限バッジ＋通知＋メニュー */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => setShowUserModal(true)}
          className="px-3 py-1 rounded-full border border-gray-300 text-sm font-medium text-gray-800 bg-white flex items-center gap-2"
        >
          {uid ? (
            <>
              <span>{userName}</span>
              <span
                className={`px-2 py-0.5 rounded text-xs font-semibold ${
                  role === "manager"
                    ? "bg-red-100 text-red-700"
                    : "bg-blue-100 text-blue-700"
                }`}
              >
                {role === "manager" ? "管理者" : "責任者"}
              </span>
            </>
          ) : (
            "責任者登録"
          )}
        </button>

        {/* 通知ベル */}
        <div className="relative cursor-pointer">
          <Bell className="w-5 h-5 text-gray-700" />
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full px-1">
            3
          </span>
        </div>

        {/* ハンバーガーメニュー */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => {
              setMenuOpen(!menuOpen);
              setFocusedIndex(0);
            }}
            onKeyDown={(e) => {
              if (e.key === "Escape") setMenuOpen(false);
            }}
            className="p-2 rounded-md bg-gray-100 hover:bg-gray-200 border border-gray-300"
          >
            {menuOpen ? (
              <X className="w-6 h-6 text-gray-700" />
            ) : (
              <Menu className="w-6 h-6 text-gray-700" />
            )}
          </button>
          {menuOpen && (
            <div
              role="menu"
              className="absolute right-0 mt-2 w-48 bg-white border rounded-lg shadow-lg z-50"
            >
              {menuItems
                .filter((item) => !(item.label === "管理者" && role !== "manager"))
                .map((item, idx) => (
                  <button
                    key={item.label}
                    role="menuitem"
                    tabIndex={0}
                    onClick={async () => {
                      if (item.label === "ログアウト") {
                        setLastLogout(new Date());
                        if (typeof window !== "undefined") {
                          localStorage.clear();
                        }
                        await logAction(uid, userName, role, "logout");
                        setUid(null);
                        setRole(null);
                        setUserName("未登録");
                        setShowUserModal(true);
                      }
                      router.push(item.path);
                      setMenuOpen(false);
                                       }}
                    onKeyDown={async (e) => {
                      if (e.key === "ArrowDown") {
                        e.preventDefault();
                        setFocusedIndex((prev) =>
                          prev + 1 < menuItems.length ? prev + 1 : 0
                        );
                      } else if (e.key === "ArrowUp") {
                        e.preventDefault();
                        setFocusedIndex((prev) =>
                          prev - 1 >= 0 ? prev - 1 : menuItems.length - 1
                        );
                      } else if (e.key === "Enter") {
                        e.preventDefault();
                        if (item.label === "ログアウト") {
                          setLastLogout(new Date());
                          if (typeof window !== "undefined") {
                            localStorage.clear();
                          }
                          await logAction(uid, userName, role, "logout");
                          setUid(null);
                          setRole(null);
                          setUserName("未登録");
                          setShowUserModal(true);
                        }
                        router.push(item.path);
                        setMenuOpen(false);
                      } else if (e.key === "Escape") {
                        setMenuOpen(false);
                      }
                    }}
                    className={`block w-full text-left px-4 py-2 text-sm border-b last:border-b-0 ${
                      idx === focusedIndex
                        ? "bg-blue-100 font-semibold text-blue-700"
                        : pathname === item.path
                        ? "bg-blue-50 text-blue-700"
                        : "hover:bg-gray-100"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

            {/* 責任者番号登録モーダル */}
      {showUserModal && (
        <div
          className="fixed inset-0 bg-black/30 flex items-center justify-center z-50"
          onKeyDown={(e) => {
            if (uid && e.key === "Escape") {
              setShowUserModal(false);
            }
          }}
        >
          <div
            className="bg-white rounded-xl shadow-lg p-6 w-96 pointer-events-auto"
            role="dialog"
            aria-modal="true"
          >
            <h2 className="font-bold mb-4">責任者番号登録</h2>
            {/* 入力やラジオボタンなど */}
            {error && <p className="text-red-500 text-sm mb-2">{error}</p>}

            <div className="flex justify-end gap-2">
              {uid && (
                <button
                  onClick={() => setShowUserModal(false)}
                  className="px-4 py-2 bg-gray-200 rounded"
                >
                  キャンセル
                </button>
              )}
              <button
                onClick={handleUserSwitch}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                登録
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}