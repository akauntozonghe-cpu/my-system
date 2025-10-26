"use client";

import { useState } from "react";
import { db } from "@lib/firebase";
import { collection, doc, setDoc } from "firebase/firestore";
import { Item, JournalEntry } from "@lib/stocktaking/types";
import { recordJournal } from "@lib/stocktaking/utils";

export default function ImportStocktaking({ sessionId }: { sessionId: string }) {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(false);

  // CSVファイルを読み込んで items にセット
  const handleImport = async (file: File) => {
    setLoading(true);

    const text = await file.text();
    const rows = text.split("\n").map((line) => line.split(","));

    // 例: CSV = productId,name,countedQty
    const imported: Item[] = rows.map((cols, idx) => ({
      id: `import-${idx}`,
      productId: cols[0],
      name: cols[1],
      systemQty: 0, // CSVにはシステム数量がない想定
      countedQty: Number(cols[2]),
    }));

    setItems(imported);

    // Firestoreに保存 & Journal記録
    for (const item of imported) {
      const ref = doc(collection(db, "stocktakingSessions", sessionId, "items"), item.productId);
      await setDoc(ref, item, { merge: true });

      await recordJournal({
        sessionId,
        itemId: item.productId,
        action: "create",
        oldQty: null,
        newQty: item.countedQty ?? null,
        userId: "system-user", // 実際は認証ユーザーID
      });
    }

    setLoading(false);
  };

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">インポート棚卸</h2>
      <input
        type="file"
        accept=".csv"
        onChange={(e) => e.target.files && handleImport(e.target.files[0])}
      />
      {loading && <p>インポート中...</p>}
      {items.length > 0 && (
        <table className="w-full border mt-4">
          <thead>
            <tr>
              <th>商品コード</th>
              <th>商品名</th>
              <th>実棚数量</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id}>
                <td>{item.productId}</td>
                <td>{item.name}</td>
                <td>{item.countedQty}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}