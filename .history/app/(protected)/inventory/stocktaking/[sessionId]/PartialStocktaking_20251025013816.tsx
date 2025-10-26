"use client";

import { useState } from "react";
import { db } from "@lib/firebase";
import {
  collection,
  getDocs,
  query,
  where,
  setDoc,
  doc,
} from "firebase/firestore";
import PartialStocktakingSelector from "../components/PartialStocktakingSelector";

type Item = {
  id: string;
  name: string;
  stock?: number;
  expectedQty?: number;
  countedQty?: number | null;
};

export default function PartialStocktaking({ sessionId }: { sessionId: string }) {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("部分棚卸 - 範囲を選択してください");

  const handleSelect = async (range: string) => {
    setLoading(true);
    setMessage(`${range} の棚卸を開始します`);

    const q = query(collection(db, "items"), where("warehouse", "==", range));
    const snap = await getDocs(q);

    const rangeItems: Item[] = snap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<Item, "id">),
      countedQty: null,
    }));

    await Promise.all(
      rangeItems.map((item) =>
        setDoc(
          doc(db, "stocktakingSessions", sessionId, "items", item.id),
          {
            name: item.name ?? "不明商品",
            expectedQty: item.stock ?? 0,
            countedQty: null,
          },
          { merge: true }
        )
      )
    );

    setItems(rangeItems.map((i) => ({ ...i, expectedQty: i.stock ?? 0 })));
    setLoading(false);
  };

  // 実棚数量を更新する関数
  const handleCountChange = async (id: string, value: number) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, countedQty: value } : item
      )
    );

    await setDoc(
      doc(db, "stocktakingSessions", sessionId, "items", id),
      { countedQty: value },
      { merge: true }
    );
  };

  return (
    <div>
      {loading && <p className="text-blue-600">読み込み中...</p>}
      <p>{message}</p>

      <PartialStocktakingSelector onSelect={handleSelect} />

      {items.length > 0 && (
        <table className="w-full border mt-4">
          <thead>
            <tr>
              <th className="border px-2 py-1">商品</th>
              <th className="border px-2 py-1">予定数量</th>
              <th className="border px-2 py-1">実棚数量</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id}>
                <td className="border px-2 py-1">{item.name}</td>
                <td className="border px-2 py-1">{item.expectedQty}</td>
                <td className="border px-2 py-1">
                  <input
                    type="number"
                    className="border p-1 w-20"
                    value={item.countedQty ?? ""}
                    onChange={(e) =>
                      handleCountChange(item.id, Number(e.target.value))
                    }
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}