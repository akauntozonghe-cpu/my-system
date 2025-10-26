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
  setDoc,
} from "firebase/firestore";

// 部分棚卸の範囲選択UI
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
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!sessionId) return;

    const load = async () => {
      try {
        if (mode === "resume") {
          setLoading(true);
          const snap = await getDoc(doc(db, "stocktakingSessions", sessionId));
          if (!snap.exists()) {
            setMessage("途中の棚卸はありません");
            setLoading(false);
            return;
          }
          const itemsSnap = await getDocs(
            collection(db, "stocktakingSessions", sessionId, "items")
          );
          setItems(itemsSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
          setMessage("");
          setLoading(false);
        }

        if (mode === "full") {
          setLoading(true);
          setMessage("一斉棚卸 - 全商品を読み込み中...");

          // 全商品を取得
          const allItemsSnap = await getDocs(collection(db, "items"));
          const allItems = allItemsSnap.docs.map((d) => ({
            id: d.id,
            ...d.data(),
          }));

          // 並列でセッションにコピー
          await Promise.all(
            allItems.map((item) =>
              setDoc(
                doc(db, "stocktakingSessions", sessionId, "items", item.id),
                {
                  name: item.name,
                  expectedQty: item.stock,
                  countedQty: null,
                },
                { merge: true }
              )
            )
          );

          // state に反映
          setItems(
            allItems.map((i) => ({
              id: i.id,
              name: i.name,
              expectedQty: i.stock,
              countedQty: null,
            }))
          );

          setMessage("");
          setLoading(false);
        }

        if (mode === "import") {
          setMessage("読込棚卸 - ファイルをアップロードしてください");
        }
      } catch (err: any) {
        console.error(err);
        setError("データ読み込みでエラーが発生しました");
        setLoading(false);
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

      {/* ローディングスピナー */}
      {loading && (
        <div className="flex items-center space-x-2 text-blue-600">
          <svg
            className="animate-spin h-5 w-5 text-blue-600"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            ></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
            ></path>
          </svg>
          <span>読み込み中...</span>
        </div>
      )}

      {message && <p>{message}</p>}

      {/* 部分棚卸の範囲選択 */}
      {mode === "partial" && (
        <PartialStocktakingSelector
          onSelect={async (range) => {
            setLoading(true);
            setMessage(`${range} の棚卸を開始します`);
            await recordJournal(`partial-start:${range}`);
            // TODO: Firestoreから range に該当する商品を読み込む処理
            setLoading(false);
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
              setLoading(true);
              setMessage(`ファイル ${file.name} を読み込み中...`);
              // TODO: CSV/Excel をパースして items に展開
              setLoading(false);
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