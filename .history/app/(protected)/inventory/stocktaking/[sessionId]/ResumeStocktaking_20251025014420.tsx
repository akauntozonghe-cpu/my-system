"use client";

import { useEffect, useState } from "react";
import { db } from "@lib/firebase";
import { collection, getDocs, doc, setDoc } from "firebase/firestore";
import { Item } from "../types";

export default function ResumeStocktaking({ sessionId }: { sessionId: string }) {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const snap = await getDocs(collection(db, "stocktakingSessions", sessionId, "items"));
      const loaded: Item[] = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<Item, "id">),
      }));
      setItems(loaded);
      setLoading(false);
    };
    load();
  }, [sessionId]);

  const handleCountChange = async (id: string, value: number) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, countedQty: value } : item))
    );
    await setDoc(doc(db, "stocktakingSessions", sessionId, "items", id), { countedQty: value }, { merge: true });
  };

  return (
    <div>
      {loading && <p>読み込み中...</p>}
      {items.length > 0 && (
        <table className="w-full border">
          <thead>
            <tr>
              <th>商品</th>
              <th>予定数量</th>
              <th>実棚数量</th>
              <th>差分</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item: Item) => {
              const diff = item.countedQty != null ? item.countedQty - item.systemQty : null;
              return (
                <tr key={item.id}>
                  <td>{item.name}</td>
                  <td>{item.systemQty}</td>
                  <td>
                    <input
                      type="number"
                      value={item.countedQty ?? ""}
                      onChange={(e) => handleCountChange(item.id, Number(e.target.value))}
                      className="border p-1 w-20"
                    />
                  </td>
                  <td>
                    {diff !== null ? (
                      <span className={diff === 0 ? "text-gray-600" : diff > 0 ? "text-green-600" : "text-red-600"}>
                        {diff > 0 ? "+" : ""}
                        {diff}
                      </span>
                    ) : (
                      "-"
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}