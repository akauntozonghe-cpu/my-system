"use client";

import { useState } from "react";
import { db } from "@lib/firebase";
import { doc, setDoc } from "firebase/firestore";
import { SessionMeta } from "@lib/stocktaking/types";

export default function FullStocktaking({ sessionId }: { sessionId: string }) {
  const [locations, setLocations] = useState<string[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [confirmed, setConfirmed] = useState(false);

  const handleConfirm = async () => {
    // target は選択があるときだけ付与する
    const meta: SessionMeta = {
      sessionId,
      type: "full",
      ...(locations.length > 0 || categories.length > 0
        ? {
            target: {
              mode: locations.length > 0 ? "location" : "category",
              values: locations.length > 0 ? locations : categories,
            },
          }
        : {}),
    };

    await setDoc(doc(db, "stocktakingSessions", sessionId, "meta", "info"), meta);
    setConfirmed(true);
  };

  if (!confirmed) {
    return (
      <div>
        <h2 className="text-xl font-bold mb-4">一斉棚卸の対象確認</h2>

        <div className="mb-4">
          <p className="font-semibold">保管場所（未選択なら全体）</p>
          <label>
            <input
              type="checkbox"
              value="倉庫A"
              onChange={(e) =>
                setLocations((prev) =>
                  e.target.checked ? [...prev, "倉庫A"] : prev.filter((v) => v !== "倉庫A")
                )
              }
            />
            倉庫A
          </label>
          <label className="ml-4">
            <input
              type="checkbox"
              value="倉庫B"
              onChange={(e) =>
                setLocations((prev) =>
                  e.target.checked ? [...prev, "倉庫B"] : prev.filter((v) => v !== "倉庫B")
                )
              }
            />
            倉庫B
          </label>
        </div>

        <div className="mb-4">
          <p className="font-semibold">大分類（未選択なら全体）</p>
          <label>
            <input
              type="checkbox"
              value="家電"
              onChange={(e) =>
                setCategories((prev) =>
                  e.target.checked ? [...prev, "家電"] : prev.filter((v) => v !== "家電")
                )
              }
            />
            家電
          </label>
          <label className="ml-4">
            <input
              type="checkbox"
              value="書籍"
              onChange={(e) =>
                setCategories((prev) =>
                  e.target.checked ? [...prev, "書籍"] : prev.filter((v) => v !== "書籍")
                )
              }
            />
            書籍
          </label>
        </div>

        <button
          onClick={handleConfirm}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded"
        >
          確認して棚卸を開始
        </button>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">一斉棚卸</h2>
      {/* ここに items テーブルを表示 */}
    </div>
  );
}