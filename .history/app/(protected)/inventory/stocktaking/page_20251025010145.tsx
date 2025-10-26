"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function StocktakingStartPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleStart = async (mode: "resume" | "full" | "partial" | "import") => {
    setLoading(true);
    try {
      // Firestore に新しいセッションを作成する処理や
      // 進行中セッションを探す処理をここに書く
      // 例: const sessionId = await createSession(mode);
      const sessionId = "dummy-session-id"; // 仮

      // mode をクエリパラメータで渡す
      router.push(`/inventory/stocktaking/${sessionId}?mode=${mode}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-screen space-y-6">
      <h1 className="text-2xl font-bold">棚卸</h1>

      {loading && <p>準備中…</p>}

      <div className="space-y-4">
        <button
          onClick={() => handleStart("resume")}
          className="px-6 py-3 bg-orange-600 text-white rounded"
        >
          途中の棚卸を再開
        </button>

        <button
          onClick={() => handleStart("full")}
          className="px-6 py-3 bg-blue-600 text-white rounded"
        >
          一斉棚卸を開始
        </button>

        <button
          onClick={() => handleStart("partial")}
          className="px-6 py-3 bg-green-600 text-white rounded"
        >
          部分棚卸を開始
        </button>

        <button
          onClick={() => handleStart("import")}
          className="px-6 py-3 bg-purple-600 text-white rounded"
        >
          読込棚卸を開始
        </button>
      </div>
    </div>
  );
}