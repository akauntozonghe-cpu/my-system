"use client";

import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/src/lib/firebase";

type Item = {
  productId: string;
  name: string;
  systemQty: number;
  countedQty?: number;
};

export default function Checklist() {
  const [items, setItems] = useState<Item[]>([]);
  const sessionId = "20251024-001"; // 仮のセッションID

  useEffect(() => {
    const fetchItems = async () => {
      const snap = await getDocs(
        collection(db, `stocktakingSessions/${sessionId}/sessionItems`)
      );
      const data = snap.docs.map((doc) => doc.data() as Item);
      setItems(data);
    };
    fetchItems();
  }, []);

  return (
    <div className="w-1/2 p-4 border-l">
      <h2 className="text-lg font-bold">チェックリスト</h2>
      <ul className="mt-2 space-y-1">
        {items.map((item) => {
          const diff =
            item.countedQty !== undefined
              ? item.countedQty - item.systemQty
              : null;
          const status = item.countedQty === undefined ? "⬜ 未" : "✅ 済";
          const color =
            diff === null
              ? "text-gray-500"
              : diff < 0
              ? "text-red-500"
              : diff > 0
              ? "text-blue-500"
              : "text-green-600";

          return (
            <li key={item.productId} className={`list-none ${color}`}>
              {item.name ?? item.productId} {status}
              {diff !== null && ` (${diff >= 0 ? "+" : ""}${diff})`}
            </li>
          );
        })}
      </ul>
    </div>
  );
}