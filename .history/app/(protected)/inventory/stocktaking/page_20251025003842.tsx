"use client";

import { useEffect, useState } from "react";
import { db } from "@lib/firebase";
import {
  collection,
  getDocs,
  query,
  where,
  orderBy,
} from "firebase/firestore";
import { useRouter } from "next/navigation";
import StartSession from "./components/StartSession";

type SessionMeta = {
  id: string;
  type: "full" | "partial";
  createdAt: string;
  status: string;
};

export default function StocktakingStartPage() {
  const [activeSessions, setActiveSessions] = useState<SessionMeta[]>([]);
  const router = useRouter();

  useEffect(() => {
    const fetchActive = async () => {
      const q = query(
        collection(db, "stocktakingSessions"),
        where("status", "==", "in-progress"),
        orderBy("createdAt", "desc")
      );
      const snap = await getDocs(q);
      const sessions = snap.docs.map((doc) => ({
        id: doc.id,
        ...(doc.data() as Omit<SessionMeta, "id">),
      }));
      setActiveSessions(sessions);
    };
    fetchActive();
  }, []);

  const handleResume = () => {
    if (activeSessions.length === 0) {
      alert("現在、進行中の棚卸は存在しません");
      // ここで journal に「再開試行」を記録しても良い
      return;
    }
    // 複数ある場合は最新を再開（必要なら選択画面に拡張可能）
    router.push(`/inventory/stocktaking/${activeSessions[0].id}`);
  };

  return (
    <div className="flex flex-col items-center justify-center h-screen space-y-6">
      <h1 className="text-2xl font-bold">棚卸</h1>

      {/* 常時表示する再開ボタン */}
      <button
        onClick={handleResume}
        className="px-6 py-3 bg-orange-600 text-white rounded"
      >
        途中の棚卸を再開
      </button>

      {/* 進行中セッションがある場合は一覧も表示 */}
      {activeSessions.length > 0 && (
        <div className="space-y-2 mt-4">
          <h2 className="text-lg font-semibold">進行中の棚卸一覧</h2>
          {activeSessions.map((s) => (
            <button
              key={s.id}
              onClick={() => router.push(`/inventory/stocktaking/${s.id}`)}
              className="block w-full px-6 py-3 bg-orange-500 text-white rounded"
            >
              {s.type === "full" ? "一斉棚卸" : "部分棚卸"}  
              （開始: {new Date(s.createdAt).toLocaleString("ja-JP")}）
            </button>
          ))}
        </div>
      )}

      {/* 新規開始 */}
      <div className="mt-6">
        <StartSession />
      </div>
    </div>
  );
}