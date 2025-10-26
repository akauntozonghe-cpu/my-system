"use client";

import { useState, useEffect } from "react";
import { db } from "@lib/firebase";
import { doc, getDoc, collection, getDocs, setDoc } from "firebase/firestore";
import { Item, SessionMeta } from "@lib/stocktaking/types";
import { recordJournal } from "@lib/stocktaking/utils";

export default function FullStocktaking({ sessionId }: { sessionId: string }) {
  const [meta, setMeta] = useState<SessionMeta | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [confirmed, setConfirmed] = useState(false);

  useEffect(() => {
    const load = async () => {
      const metaSnap = await getDoc(
        doc(db, "stocktakingSessions", sessionId, "meta", "info")
      );
      if (metaSnap.exists()) {
        setMeta(metaSnap.data() as SessionMeta);
      }

      const snap = await getDocs(
        collection(db, "stocktakingSessions", sessionId, "items")
      );
      const loaded: Item[] = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<Item, "id">),
      }));
      setItems(loaded);
    };
    load();
  }, [sessionId]);

  const handleCountChange = async (id: string, value: number) => {
    const target = items.find((i) => i.id === id);
    const oldQty = target?.countedQty ?? null;

    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, countedQty: value } : item))
    );

    await setDoc(
      doc(db, "stocktakingSessions", sessionId, "items", id),
      { countedQty: value },
      { merge: true }
    );

    await recordJournal({
      sessionId,
      itemId: id,
      action: "update",
      oldQty,
      newQty: value,
      userId: "system-user",
    });
  };

  const completed = items.filter((i) => i.countedQty != null).length;
  const progress = items.length > 0 ? Math.round((completed / items.length) * 100) : 0;

  // 1. 確認画面
  if (!confirmed) {
    return (
      <div>
        <h2 className="text-xl font-bold mb-4">一斉棚卸の対象確認</h2>
        <p>
          保管場所:{" "}
          {meta?.target?.mode === "location"
            ? meta.target.values.join(", ")
            : "全体"}
        </p>
        <p>
          大分類:{" "}
          {meta?.target?.mode === "category"
            ? meta.target.values.join(", ")
            : "全体"}
        </p>
        <button
          onClick={() => setConfirmed(true)}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded"
        >
          確認して棚卸を開始
        </button>
      </div>
    );
  }

  // 2. 棚卸画面
  return (
    <div>
      <h2 className="text-xl font-bold mb-4">一斉棚卸</h2>
      <p className="mb-2 text-gray-700">
        対象: {meta?.target ? `${meta.target.mode}: ${meta.target.values.join(", ")}` : "全体"}
      </p>

      {/* 進捗バー */}
      <div className="w-full bg-gray-200 rounded h-4 mb-2">
        <div className="bg-blue-600 h-4 rounded" style={{ width: `${progress}%` }} />
      </div>
      <p>{progress}% 完了</p>

      {/* 棚卸テーブル */}
      <table className="w-full border mt-4">
        <thead>
          <tr>
            <th>商品</th>
            <th>予定数量</th>
            <th>実棚数量</th>
            <th>差分</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => {
            const diff =
              item.countedQty != null ? item.countedQty - item.systemQty : null;
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

      {/* 完了ボタン */}
      {progress === 100 && (
        <button
          onClick={() =>
            recordJournal({
              sessionId,
              itemId: "all",
              action: "confirm",
              oldQty: null,
              newQty: null,
              userId: "system-user",
            })
          }
          className="mt-6 px-4 py-2 bg-green-600 text-white rounded"
        >
          棚卸結果を確定
        </button>
      )}
    </div>
  );
}