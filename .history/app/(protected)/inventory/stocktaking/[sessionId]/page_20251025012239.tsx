"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { db } from "@lib/firebase";
import {
  doc,
  getDoc,
  collection,
  getDocs,
  addDoc,
} from "firebase/firestore";

// 部分棚卸の範囲選択UIを別ファイルに切り出している場合
import PartialStocktakingSelector from "../components/PartialStocktakingSelector";

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

        if (mode === "import") {
          setMessage("読込棚卸 - ファイルをアップロードしてください");
          // TODO: ファイルアップロードUIを表示
        }
      } catch (err: any) {
        console.error(err);
        setError("データ読み込みでエラーが発生しました");
      }
    };

    load();
  }, [sessionId, mode]);

  // journal 記録用
  const recordJournal = async (action: string) => {
    if (!sessionId) return;
    await addDoc(collection(db, "stocktakingSessions", sessionId, "journal"), {
      action,
      userId: "currentUser", // TODO: 実際のログインユーザーIDに置き換え
      createdAt: new Date().toISOString(),
    });
  };

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

      {/* 部分棚卸の範囲選択 */}
      {mode === "partial" && (
        <PartialStocktakingSelector
          onSelect={async (range) => {
            setMessage(`${range} の棚卸を開始します`);
            await recordJournal(`partial-start:${range}`);
            // TODO: Firestoreから range に該当する商品を読み込む処理
          }}
        />
      )}

      {/* 読込棚卸のファイルアップロードUI */}
      {mode === "import" && (
        <input
          type="file"
          accept=".csv,.xlsx"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) {
              setMessage(`ファイル ${file.name} を読み込み中...`);
              // TODO: CSV/Excel をパースして items に展開
            }
          }}
        />
      )}

      {/* アイテム一覧 */}
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