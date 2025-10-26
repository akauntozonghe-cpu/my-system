"use client";

import { useState } from "react";
import { updateItemCount, addJournalEntry } from "@lib/stocktaking";

type Props = {
  sessionId: string;
};

export default function ScanPanel({ sessionId }: Props) {
  const [code, setCode] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code) return;

    const productId = code;
    const countedQty = 1; // 仮に1個カウントとする

    await updateItemCount(sessionId, productId, countedQty);
    await addJournalEntry(sessionId, productId, "user-001", undefined, countedQty);

    setCode("");
  };

  return (
    <div className="w-1/3 p-4 border-r">
      <h2 className="text-lg font-bold">スキャンパネル</h2>
      <form onSubmit={handleSubmit} className="mt-2 flex space-x-2">
        <input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="JANコードを入力"
          className="border p-2 flex-1"
        />
        <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded">
          登録
        </button>
      </form>
    </div>
  );
}