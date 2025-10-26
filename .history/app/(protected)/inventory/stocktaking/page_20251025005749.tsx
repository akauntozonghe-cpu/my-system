"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { db } from "@lib/firebase";
import { doc, getDoc, collection, getDocs } from "firebase/firestore";

export default function StocktakingSessionPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const searchParams = useSearchParams();
  const mode = searchParams.get("mode") as "resume" | "full" | "partial" | "import";

  const [items, setItems] = useState<any[]>([]);
  const [message, setMessage] = useState<string>("");

  useEffect(() => {
    if (!sessionId || !mode) return;

    const load = async () => {
      if (mode === "resume") {
        const snap = await getDoc(doc(db, "stocktakingSessions", sessionId));
        if (!snap.exists()) {
          setMessage("作業途中の棚卸はありません");
          return;
        }
        // items 読み込み
        const itemsSnap = await getDocs(collection(db, "stocktakingSessions", sessionId, "items"));
        setItems(itemsSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      }

      if (mode === "full") {
        setMessage("一斉棚卸 - 全商品を読み込み中...");
        // 全商品を読み込む処理
      }

      if (mode === "partial") {
        setMessage("部分棚卸 - QRコードまたは選択肢で範囲を決定してください");
        // QR読み込み or 選択肢UIを表示
      }

      if (mode === "import") {
        setMessage("読込棚卸 - ファイルをアップロードしてください");
        // ファイルアップロードUIを表示
      }
    };

    load();
  }, [sessionId, mode]);

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">
        {mode === "resume" && "途中の棚卸を再開"}
        {mode === "full" && "一斉棚卸"}
        {mode === "partial" && "部分棚卸"}
        {mode === "import" && "読込棚卸"}
      </h1>

      {message && <p>{message}</p>}

      {mode === "import" && (
        <input type="file" accept=".csv,.xlsx" onChange={(e) => console.log(e.target.files)} />
      )}

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