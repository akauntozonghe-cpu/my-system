"use client";

import { useRouter } from "next/navigation";
import { doc, setDoc } from "firebase/firestore";
import { db } from "@lib/firebase";
import { v4 as uuid } from "uuid";

export default function StartSession() {
  const router = useRouter();

  const startSession = async (type: "full" | "partial") => {
    const sessionId = new Date().toISOString().slice(0,10).replace(/-/g,"") 
      + "-" + uuid().slice(0,3);

    // Firestoreにセッションメタを保存
    await setDoc(doc(db, "stocktakingSessions", sessionId), {
      sessionId,
      type,
      createdAt: new Date().toISOString(),
      status: "in-progress",
    });

    // 部分棚卸なら対象条件を選択する画面に遷移してもOK
    router.push(`/inventory/stocktaking/${sessionId}`);
  };

  return (
    <div className="flex flex-col items-center justify-center h-screen space-y-6">
      <h1 className="text-2xl font-bold">棚卸を開始</h1>
      <button
        onClick={() => startSession("full")}
        className="px-6 py-3 bg-blue-600 text-white rounded"
      >
        一斉棚卸を開始
      </button>
      <button
        onClick={() => startSession("partial")}
        className="px-6 py-3 bg-green-600 text-white rounded"
      >
        部分棚卸を開始
      </button>
    </div>
  );
}