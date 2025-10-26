"use client";

import { useEffect, useState } from "react";
import { db } from "@lib/firebase";
import { collection, getDocs, setDoc, doc } from "firebase/firestore";

type Item = {
  id: string;
  name: string;
  stock?: number;
  expectedQty?: number;
  countedQty?: number | null;
};

export default function FullStocktaking({ sessionId }: { sessionId: string }) {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const snap = await getDocs(collection(db, "items"));
      const allItems: Item[] = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<Item, "id">),
      }));

      await Promise.all(
        allItems.map((item) =>
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

      setItems(allItems.map((i) => ({ ...i, expectedQty: i.stock ?? 0, countedQty: null })));
      setLoading(false);
    };

    load();
  }, [sessionId]);

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
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id}>
                <td>{item.name}</td>
                <td>{item.expectedQty}</td>
                <td>{item.countedQty ?? "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}