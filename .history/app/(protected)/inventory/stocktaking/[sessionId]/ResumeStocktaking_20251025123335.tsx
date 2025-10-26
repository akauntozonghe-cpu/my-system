"use client";

import { useEffect, useState } from "react";
import { db } from "@lib/firebase";
import { collection, getDocs, doc, setDoc, addDoc } from "firebase/firestore";
import { Item, JournalEntry } from "@lib/stocktaking/types";

export default function ResumeStocktaking({ sessionId }: { sessionId: string }) {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const snap = await getDocs(
        collection(db, "stocktakingSessions", sessionId, "items")
      );
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
    const target = items.find((i) => i.id === id);
    const oldQty = target?.countedQty ?? null;

    // state 更新
    setItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, countedQty: value } : item
      )
    );

    // Firestore 更新
    await setDoc(
      doc(db, "stocktakingSessions", sessionId, "items", id),
      { countedQty: value },
      { merge: true }
    );

    // Journal 記録
    const entry: Omit<JournalEntry, "id" | "createdAt"> = {
      sessionId,
      itemId: id,
      action: "update",
      oldQty,
      newQty: value,
      userId: "system-user", // ← 実際は認証ユーザーIDを入れる
    };

    await addDoc(
      collection(db, "stocktakingSessions", sessionId, "journal"),
      {
        ...entry,
        createdAt: new Date().toISOString(),
      }
    );
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
              const diff =
                item.countedQty != null
                  ? item.countedQty - item.systemQty
                  : null;
              return (
                <tr key={item.id}>
                  <td>{item.name}</td>
                  <td>{item.systemQty}</td>
                  <td>
                    <input
                      type="number"
                      value={item.countedQty ?? ""}
                      onChange={(e) =>
                        handleCountChange(item.id, Number(e.target.value))
                      }
                      className="border p-1 w-20"
                    />
                  </td>
                  <td>
                    {diff !== null ? (
                      <span
                        className={
                          diff === 0
                            ? "text-gray-600"
                            : diff > 0
                            ? "text-green-600"
                            : "text-red-600"
                        }
                      >
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