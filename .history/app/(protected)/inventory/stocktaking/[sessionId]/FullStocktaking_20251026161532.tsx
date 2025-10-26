"use client";

import { useState, useEffect, useRef } from "react";
import { db } from "@lib/firebase";
import { doc, collection, getDocs, setDoc, onSnapshot } from "firebase/firestore";
import { Item } from "@lib/stocktaking/types";
import { BrowserMultiFormatReader } from "@zxing/library";

type Product = {
  id: string;
  name: string;
  location: string;
  categoryLarge: string;
  categorySmall: string;
  quantity: number;
  unit: string;
  janCode: string;
};

export type TargetState = {
  location: string | null;
  categoryLarge: string | null;
  categorySmall: string | null;
};

export default function FullStocktaking({ sessionId }: { sessionId: string }) {
  const [tree, setTree] = useState<any>({});
  const [target, setTarget] = useState<TargetState>({
    location: null,
    categoryLarge: null,
    categorySmall: null,
  });
  const [previewCount, setPreviewCount] = useState<number>(0);
  const [confirmed, setConfirmed] = useState(false);

  const [items, setItems] = useState<Item[]>([]);
  const [scanMode, setScanMode] = useState<"idle" | "barcode" | "error">("idle");
  const [scannedItems, setScannedItems] = useState<Item[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [cameraActive, setCameraActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [manualJan, setManualJan] = useState("");

  const [loading, setLoading] = useState(false);
  const [listMode, setListMode] = useState<"registered" | "all">("registered");

  // --- 初期ロードで products のツリーだけ構築 ---
  useEffect(() => {
    const load = async () => {
      const snap = await getDocs(collection(db, "products"));
      const list: Product[] = snap.docs.map(d => {
        const data = d.data();
        return {
          id: d.id,
          name: data.name ?? "",
          location: data.location ?? "",
          categoryLarge: data.categoryLarge ?? "",
          categorySmall: data.categorySmall ?? "",
          quantity: Number(data.quantity) || 0, // ← 空文字対策
          unit: data.unit ?? "",
          janCode: data.janCode ?? "",
        };
      });

      // ツリー構築
      const t: any = {};
      list.forEach(p => {
        if (!t[p.location]) t[p.location] = { children: {} };
        if (!t[p.location].children[p.categoryLarge]) {
          t[p.location].children[p.categoryLarge] = { children: {} };
        }
        if (!t[p.location].children[p.categoryLarge].children[p.categorySmall]) {
          t[p.location].children[p.categoryLarge].children[p.categorySmall] = { products: [] };
        }
        t[p.location].children[p.categoryLarge].children[p.categorySmall].products.push(p);
      });
      setTree(t);
    };
    load();
  }, [sessionId]);

  // --- 棚卸開始処理 ---
  const handleStart = async () => {
    setLoading(true);

    const snap = await getDocs(collection(db, "products"));
    const list: Product[] = snap.docs.map(d => {
      const data = d.data();
      return {
        id: d.id,
        name: data.name ?? "",
        location: data.location ?? "",
        categoryLarge: data.categoryLarge ?? "",
        categorySmall: data.categorySmall ?? "",
        quantity: Number(data.quantity) || 0,
        unit: data.unit ?? "",
        janCode: data.janCode ?? "",
      };
    });

    const filtered = list.filter(p => {
      if (target.location && p.location !== target.location) return false;
      if (target.categoryLarge && p.categoryLarge !== target.categoryLarge) return false;
      if (target.categorySmall && p.categorySmall !== target.categorySmall) return false;
      return true;
    });

    for (const p of filtered) {
      await setDoc(
        doc(db, "stocktakingSessions", sessionId, "items", p.id),
        {
          name: p.name ?? "",
          location: p.location ?? "",
          categoryLarge: p.categoryLarge ?? "",
          categorySmall: p.categorySmall ?? "",
          systemQty: p.quantity ?? 0,
          unit: p.unit ?? "",
          janCode: p.janCode ?? "",
          countedQty: null,
          status: "pending",
        }
      );
    }

    // items を購読開始
    const unsub = onSnapshot(collection(db, "stocktakingSessions", sessionId, "items"), snap => {
      const list: Item[] = snap.docs.map(d => ({ id: d.id, ...d.data() } as Item));
      setItems(list);
    });

    setLoading(false);
    setConfirmed(true);

    return () => unsub();
  };

  // --- 数量更新処理 ---
  const handleCountChange = async (id: string, qty: number | null) => {
    setItems(prev => prev.map(i => (i.id === id ? { ...i, countedQty: qty } : i)));
    await setDoc(
      doc(db, "stocktakingSessions", sessionId, "items", id),
      { countedQty: qty },
      { merge: true }
    );
  };

  // --- スキャン処理 ---
  const handleScan = (code: string) => {
    const found = items.find(i => i.janCode === code);
    if (found) {
      setScannedItems([found]);
      setScanMode("barcode");
    } else {
      setErrorMessage(`該当商品が見つかりません: ${code}`);
      setScanMode("error");
    }
  };

  // カメラ対応
  useEffect(() => {
    if (!cameraActive || !videoRef.current) return;
    const codeReader = new BrowserMultiFormatReader();
    codeReader.decodeFromVideoDevice(null, videoRef.current, (result, err) => {
      if (result) {
        handleScan(result.getText());
      }
    });
    return () => codeReader.reset();
  }, [cameraActive, items]);

  // --- ローディング表示 ---
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
        <span className="ml-4 text-gray-600">データ読込中...</span>
      </div>
    );
  }

  // --- 確認画面 ---
  if (!confirmed) {
    return (
      <div className="p-6">
        <h2 className="text-xl font-bold mb-4">棚卸対象の確認</h2>

        {/* 保管場所プルダウン */}
        <select
          value={target.location ?? ""}
          onChange={(e) =>
            setTarget({ location: e.target.value || null, categoryLarge: null, categorySmall: null })
          }
          className="border p-2 mr-2"
        >
          <option value="">保管場所を選択</option>
          {Object.keys(tree).map(loc => (
            <option key={loc} value={loc}>{loc}</option>
          ))}
        </select>

        {/* 大分類プルダウン */}
        {target.location && (
          <select
            value={target.categoryLarge ?? ""}
            onChange={(e) =>
              setTarget({ ...target, categoryLarge: e.target.value || null, categorySmall: null })
            }
            className="border p-2 mr-2"
          >
            <option value="">大分類を選択</option>
            {Object.keys(tree[target.location].children).map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        )}

        {/* 小分類プルダウン */}
        {target.location && target.categoryLarge && (
          <select
            value={target.categorySmall ?? ""}
            onChange={(e) =>
              setTarget({ ...target, categorySmall: e.target.value || null })
            }
            className="border p-2"
          >
            <option value="">小分類を選択</option>
            {Object.keys(tree[target.location].children[target.categoryLarge].children).map(small => (
              <option key={small} value={small}>{small}</option>
            ))}
          </select>
        )}

                {/* プレビュー */}
        <div className="mt-4 text-sm text-gray-700">
          <p>
            現在の条件に該当する商品数:{" "}
            <span className="font-bold text-blue-600">{previewCount}</span> 件
          </p>
        </div>

        <button
          onClick={handleStart}
          className="mt-6 px-6 py-3 bg-blue-600 text-white rounded"
        >
          棚卸を開始
        </button>
      </div>
    );
  }

  // --- 棚卸画面 ---
  const displayedItems =
    listMode === "registered"
      ? items.filter(i => i.countedQty != null)
      : items;

  return (
    <div className="p-4">
      <h2 className="text-lg font-bold mb-4">棚卸実施中</h2>
      <p>保管場所: {target.location ?? "全体"}</p>
      <p>大分類: {target.categoryLarge ?? "全体"}</p>
      <p>小分類: {target.categorySmall ?? "全体"}</p>

      {/* 進捗バー */}
      <div className="w-full bg-gray-200 rounded h-4 mb-2">
        <div
          className="bg-blue-600 h-4 rounded"
          style={{
            width: `${
              items.length > 0
                ? Math.round(
                    (items.filter((i) => i.countedQty != null).length /
                      items.length) *
                      100
                  )
                : 0
            }%`,
          }}
        />
      </div>
      <p className="text-sm text-gray-600 mb-4">
        {items.filter((i) => i.countedQty != null).length} / {items.length} 件 完了
      </p>

      {/* スキャンUI */}
      <div className="space-y-4 mb-6">
        <button
          onClick={() => setCameraActive(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded"
        >
          カメラで読み取る
        </button>
        {cameraActive && (
          <div>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              style={{ width: "100%", maxHeight: "300px", background: "#000" }}
            />
            <button
              onClick={() => setCameraActive(false)}
              className="mt-2 px-4 py-2 bg-gray-500 text-white rounded"
            >
              カメラ停止
            </button>
          </div>
        )}

        {/* 手入力欄 */}
        <div className="flex items-center space-x-2">
          <input
            type="text"
            value={manualJan}
            onChange={(e) => setManualJan(e.target.value)}
            placeholder="バーコードを入力"
            className="border p-2 rounded w-48"
          />
          <button
            onClick={() => {
              if (manualJan.trim() !== "") {
                handleScan(manualJan.trim());
                setManualJan("");
              }
            }}
            className="px-4 py-2 bg-green-600 text-white rounded"
          >
            確認
          </button>
        </div>
      </div>

      {/* スキャン結果表示 */}
      {scanMode === "barcode" && scannedItems.length > 0 && (
        <div className="p-4 border mt-4 bg-green-50">
          <h3 className="font-bold">スキャン結果</h3>
          <p>{scannedItems[0].name}</p>
          <p>予定数量: {scannedItems[0].systemQty}</p>
          <input
            type="number"
            min={0}
            value={
              scannedItems[0].countedQty == null || Number.isNaN(scannedItems[0].countedQty)
                ? ""
                : scannedItems[0].countedQty
            }
            onChange={(e) => {
              const num = e.target.value === "" ? null : Number(e.target.value);
              handleCountChange(scannedItems[0].id, Number.isNaN(num) ? null : num);
            }}
            className="border p-1 w-20"
          />
          <button
            onClick={() => setScanMode("idle")}
            className="ml-2 px-3 py-1 bg-blue-600 text-white rounded"
          >
            完了
          </button>
        </div>
      )}

      {scanMode === "error" && (
        <div className="p-4 border mt-4 bg-red-50 text-red-700">
          {errorMessage}
          <button
            onClick={() => setScanMode("idle")}
            className="ml-2 px-3 py-1 bg-gray-600 text-white rounded"
          >
            戻る
          </button>
        </div>
      )}

      {/* 一覧テーブル */}
      {scanMode === "idle" && (
        <div>
          {/* リスト切り替えボタン */}
          <div className="flex justify-between items-center mb-2">
            <h3 className="font-bold">棚卸リスト</h3>
            <button
              onClick={() =>
                setListMode(listMode === "registered" ? "all" : "registered")
              }
              className="px-3 py-1 bg-gray-200 rounded"
            >
              {listMode === "registered" ? "棚卸対象リストを表示" : "登録済みだけ表示"}
            </button>
          </div>

          <table className="w-full border">
            <thead>
              <tr>
                <th className="border px-2 py-1">商品</th>
                <th className="border px-2 py-1">保管場所</th>
                <th className="border px-2 py-1">大分類</th>
                <th className="border px-2 py-1">小分類</th>
                <th className="border px-2 py-1">予定数量</th>
                <th className="border px-2 py-1">実棚数量</th>
                <th className="border px-2 py-1">差分</th>
              </tr>
            </thead>
            <tbody>
              {displayedItems.map((item, index) => {
                const diff =
                  item.countedQty != null
                    ? item.countedQty - item.systemQty
                    : null;
                return (
                  <tr
                    key={`${item.id}-${index}`} // ← key 重複対策
                    className={item.countedQty == null ? "bg-yellow-50" : ""}
                  >
                    <td className="border px-2 py-1">{item.name}</td>
                    <td className="border px-2 py-1">{item.location}</td>
                    <td className="border px-2 py-1">{item.categoryLarge}</td>
                    <td className="border px-2 py-1">{item.categorySmall}</td>
                    <td className="border px-2 py-1">{item.systemQty}</td>
                    <td className="border px-2 py-1">
                      <input
                        type="number"
                        min={0}
                        value={
                          item.countedQty == null || Number.isNaN(item.countedQty)
                            ? ""
                            : item.countedQty
                        }
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === "") {
                            handleCountChange(item.id, null);
                          } else {
                            const num = Math.max(0, Number(val));
                            handleCountChange(item.id, Number.isNaN(num) ? null : num);
                          }
                        }}
                        className="border p-1 w-20"
                      />
                    </td>
                    <td className="border px-2 py-1">
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
        </div>
      )}
    </div>
  );
}