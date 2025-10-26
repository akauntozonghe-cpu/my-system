"use client";

import { useState } from "react";
import { updateItemCount } from "@/src/lib/stocktaking";

export default function ScanPanel() {
  const [itemId, setItemId] = useState("");
  const [qty, setQty] = useState<number | null>(null);
  const sessionId = "20251024-001"; // 仮のセッションID
  const userId = "user01"; // 仮のユーザーID

  const handleSubmit = async () => {
    if (!itemId || qty === null) return;
    await updateItemCount(sessionId, itemId, qty, userId);
    alert(`商品 ${itemId} の実在庫 ${qty} を保存しました`);
    setItemId("");
    setQty(null);
  };

  return (
    <div className="w-1/2 p-4">
      <h2 className="text-lg font-bold">商品スキャン／実在庫入力</h2>
      <div className="mt-4 space-y-2">
        <input
          type="text"
          placeholder="商品ID (JANコードなど)"
          value={itemId}
          onChange={(e) => setItemId(e.target.value)}
          className="border p-2 w-full"
        />
        <input
          type="number"
          placeholder="実在庫数"
          value={qty ?? ""}
          onChange={(e) => setQty(Number(e.target.value))}
          className="border p-2 w-full"
        />
        <button
          onClick={handleSubmit}
          className="bg-blue-600 text-white px-4 py-2 rounded"
        >
          保存
        </button>
      </div>
    </div>
  );
}