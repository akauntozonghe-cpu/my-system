"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { db } from "@lib/firebase";
import { doc, getDoc, collection, getDocs } from "firebase/firestore";

export default function StocktakingSessionPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const mode =
    (searchParams.get("mode") as "resume" | "full" | "partial" | "import") ??
    "resume";

  const [items, setItems] = useState<any[]>([]);
  const [message, setMessage] = useState<string>("読み込み中...");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionId) return;

    const load = async () => {
      try {
        if (mode === "resume") {
          const snap = await getDoc(doc(db, "stocktakingSessions", sessionId));
          if (!snap.exists()) {
            setMessage("作業途中の棚卸はありません");
            return;
          }
          const itemsSnap = await getDocs(
            collection(db, "stocktakingSessions", sessionId, "items")
          );
          setItems(itemsSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
          setMessage("");
        }

        if (mode === "full") {
          setMessage("一斉棚卸 - 全商品を読み込み中...");
          // TODO: 全商品読み込み処理
        }

        if (mode === "partial") {
          setMessage("部分棚卸 - QRコードまたは選択肢で範囲を決定してください");
        }

        if (mode === "import") {
          setMessage("読込棚卸 - ファイルをアップロードしてください");
        }
      } catch (err: any) {
        console.error(err);
        setError("データ読み込みでエラーが発生しました");
      }
    };

    load();
  }, [sessionId, mode]);

  if (error) return <div className="p-6 text-red-600">{error}</div>;

  return (
    <div className="p-6 space-y-6">
      {/* 戻るボタン */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">
          {mode === "resume" && "途中の棚卸を再開"}
          {mode === "full" && "一斉棚卸"}
          {mode === "partial" && "部分棚卸"}
          {mode === "import" && "読込棚卸"}
        </h1>
        <button
          onClick={() => router.push("/inventory/stocktaking")}
          className="px-4 py-2 bg-gray-500 text-white rounded"
        >
          ← 戻る
        </button>
      </div>

      {message && <p>{message}</p>}

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