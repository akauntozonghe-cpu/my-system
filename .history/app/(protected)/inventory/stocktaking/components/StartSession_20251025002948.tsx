"use client";

import { useEffect, useState } from "react";
import { db } from "@lib/firebase";
import { collection, getDocs, query, where } from "firebase/firestore";
import Link from "next/link";
import StartSession from "../components/StartSession";

export default function StocktakingStartPage() {
  const [activeSession, setActiveSession] = useState<string | null>(null);

  useEffect(() => {
    const fetchActive = async () => {
      const q = query(
        collection(db, "stocktakingSessions"),
        where("status", "==", "in-progress")
      );
      const snap = await getDocs(q);
      if (!snap.empty) {
        // 進行中セッションがあれば最初のものを表示
        setActiveSession(snap.docs[0].id);
      }
    };
    fetchActive();
  }, []);

  return (
    <div className="flex flex-col items-center justify-center h-screen space-y-6">
      <h1 className="text-2xl font-bold">棚卸を開始</h1>

      {/* 進行中セッションがある場合 */}
      {activeSession && (
        <Link
          href={`/inventory/stocktaking/${activeSession}`}
          className="px-6 py-3 bg-orange-600 text-white rounded"
        >
          途中の棚卸を再開
        </Link>
      )}

      {/* 新規開始ボタン */}
      <StartSession />
    </div>
  );
}