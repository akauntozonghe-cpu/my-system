"use client";

import { useState, useEffect, useRef } from "react";
import { db } from "@lib/firebase";
import { doc, getDoc, collection, getDocs, setDoc } from "firebase/firestore";
import { Item } from "@lib/stocktaking/types";
import { BrowserMultiFormatReader } from "@zxing/library";
import { TargetTreeSelector, TargetState } from "TargetTreeSelector"; 
// ← 型も一緒に import

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

type TargetState = {
  mode: "AND" | "OR";
  locations: string[];
  categoryLarge: string[];
  categorySmall: string[];
};

export default function FullStocktaking({ sessionId }: { sessionId: string }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [tree, setTree] = useState<any>({});
  const [target, setTarget] = useState<TargetState>({
    mode: "OR",
    locations: [],
    categoryLarge: [],
    categorySmall: [],
  });
  const [confirmed, setConfirmed] = useState(false);
  const [loadingMaster, setLoadingMaster] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [previewCount, setPreviewCount] = useState<number | null>(null);

  const [items, setItems] = useState<Item[]>([]);
  const [scanMode, setScanMode] = useState<"idle" | "barcode" | "qr" | "error">("idle");
  const [scannedItems, setScannedItems] = useState<Item[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [scanBuffer, setScanBuffer] = useState("");
  const [cameraActive, setCameraActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [manualJan, setManualJan] = useState("");

  // --- Firestore 保存/復元 ---
  const saveTarget = async (newTarget: TargetState) => {
    await setDoc(
      doc(db, "stocktakingSessions", sessionId, "meta", "info"),
      { target: newTarget },
      { merge: true }
    );
  };

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
          quantity: data.quantity ?? 0,
          unit: data.unit ?? "",
          janCode: data.janCode ?? "",
        };
      });
      setProducts(list);

      // ツリー構造化
      const t: any = {};
      list.forEach(p => {
        if (!t[p.location]) t[p.location] = {};
        if (!t[p.location][p.categoryLarge]) t[p.location][p.categoryLarge] = {};
        if (!t[p.location][p.categoryLarge][p.categorySmall]) {
          t[p.location][p.categoryLarge][p.categorySmall] = [];
        }
        t[p.location][p.categoryLarge][p.categorySmall].push(p);
      });
      setTree(t);

      // 保存済みターゲットを復元
      const metaSnap = await getDoc(doc(db, "stocktakingSessions", sessionId, "meta", "info"));
      if (metaSnap.exists()) {
        const data = metaSnap.data();
        if (data.target) {
          setTarget(data.target as TargetState);
        }
      }
    };
    load();
  }, [sessionId]);

  // --- プレビュー件数計算 ---
  useEffect(() => {
    if (!products || !target) return;
    const count = products.filter(p => {
      const matchLocation = target.locations.length === 0 || target.locations.includes(p.location);
      const matchLarge    = target.categoryLarge.length === 0 || target.categoryLarge.includes(p.categoryLarge);
      const matchSmall    = target.categorySmall.length === 0 || target.categorySmall.includes(p.categorySmall);
      return target.mode === "AND"
        ? matchLocation && matchLarge && matchSmall
        : matchLocation || matchLarge || matchSmall;
    }).length;
    setPreviewCount(count);
  }, [target, products]);

  // --- 開始処理 ---
  const handleStart = async () => {
    setLoadingMaster(true);
    for (const p of products) {
      const matchLocation = target.locations.length === 0 || target.locations.includes(p.location);
      const matchLarge    = target.categoryLarge.length === 0 || target.categoryLarge.includes(p.categoryLarge);
      const matchSmall    = target.categorySmall.length === 0 || target.categorySmall.includes(p.categorySmall);
      const include = target.mode === "AND"
        ? matchLocation && matchLarge && matchSmall
        : matchLocation || matchLarge || matchSmall;
      if (include) {
        await setDoc(
          doc(db, "stocktakingSessions", sessionId, "items", p.id),
          {
            name: p.name,
            location: p.location,
            categoryLarge: p.categoryLarge,
            categorySmall: p.categorySmall,
            systemQty: p.quantity,
            unit: p.unit,
            janCode: p.janCode,
            countedQty: null,
            status: "pending",
          }
        );
      }
    }
    setLoadingMaster(false);
    setConfirmed(true);
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

  // USBスキャナ対応
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Enter") {
        if (scanBuffer.length > 0) {
          handleScan(scanBuffer);
          setScanBuffer("");
        }
      } else {
        setScanBuffer(prev => prev + e.key);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [scanBuffer, items]);

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

  // --- 棚卸対象確認画面 ---
if (!confirmed) {
  return (
    <div className="p-6">
      <h2 className="text-xl font-bold mb-4">棚卸対象の確認（ツリー形式）</h2>

      <TargetTreeSelector
        tree={tree}
        target={target}
        onChange={(nt: TargetState) => {   // ← 型注釈を追加
          setTarget(nt);
          saveTarget(nt);
        }}
      />

      {/* AND/OR 切り替え */}
      <div className="mt-4">
        <label className="mr-4">
          <input
            type="radio"
            checked={target.mode === "OR"}
            onChange={() => {
              const nt: TargetState = { ...target, mode: "OR" }; // ← 型注釈
              setTarget(nt);
              saveTarget(nt);
            }}
          /> OR 条件
        </label>
        <label>
          <input
            type="radio"
            checked={target.mode === "AND"}
            onChange={() => {
              const nt: TargetState = { ...target, mode: "AND" }; // ← 型注釈
              setTarget(nt);
              saveTarget(nt);
            }}
          /> AND 条件
        </label>
      </div>

      {/* プレビュー */}
      <div className="mt-4 text-sm text-gray-700">
        <p>
          現在の条件に該当する商品数:{" "}
          <span className="font-bold text-blue-600">{previewCount ?? "..."}</span> 件
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
  return (
    <div>
      {/* ヘッダ */}
      <div className="flex justify-between items-center p-4 bg-gray-100 border-b">
        <div>
          <h2 className="text-lg font-bold">棚卸実施中</h2>
          <div className="text-sm text-gray-700 mt-1">
            <p>条件モード: {target.mode}</p>
            <p>保管場所: {target.locations.length > 0 ? target.locations.join(", ") : "全体"}</p>
            <p>大分類: {target.categoryLarge.length > 0 ? target.categoryLarge.join(", ") : "全体"}</p>
            <p>小分類: {target.categorySmall.length > 0 ? target.categorySmall.join(", ") : "全体"}</p>
          </div>
        </div>
        <button
          onClick={() => setDrawerOpen(true)}
          className="px-3 py-1 bg-blue-600 text-white rounded"
        >
          条件を編集
        </button>
      </div>

      {/* 条件編集ドロワー */}
      {drawerOpen && (
        <div className="fixed inset-0 flex justify-end z-50">
          <div
            className="flex-1 bg-black bg-opacity-30"
            onClick={() => setDrawerOpen(false)}
          />
          <div className="w-[400px] bg-white p-6 shadow-lg overflow-y-auto">
            <h3 className="text-lg font-bold mb-4">棚卸対象の条件</h3>

            <TargetTreeSelector
              tree={tree}
              target={target}
              onChange={(nt) => {
                setTarget(nt);
                saveTarget(nt);
              }}
            />

            {/* AND / OR 切り替え */}
            <div className="mt-4">
              <label className="mr-4">
                <input
                  type="radio"
                  checked={target.mode === "OR"}
                  onChange={() => {
                    const nt: TargetState = { ...target, mode: "OR" };
                    setTarget(nt);
                    saveTarget(nt);
                  }}
                /> OR 条件
              </label>
              <label>
                <input
                  type="radio"
                  checked={target.mode === "AND"}
                  onChange={() => {
                    const nt: TargetState = { ...target, mode: "AND" };
                    setTarget(nt);
                    saveTarget(nt);
                  }}
                /> AND 条件
              </label>
            </div>

            {/* プレビュー件数 */}
            <div className="mt-4 text-sm text-gray-700">
              <p>
                現在の条件に該当する商品数:{" "}
                <span className="font-bold text-blue-600">
                  {previewCount ?? "..."}
                </span>{" "}
                件
              </p>
            </div>

            <div className="flex justify-end mt-6 space-x-2">
              <button
                onClick={() => setDrawerOpen(false)}
                className="px-4 py-2 bg-gray-500 text-white rounded"
              >
                閉じる
              </button>
              <button
                onClick={async () => {
                  await saveTarget(target);
                  setDrawerOpen(false);
                }}
                className="px-4 py-2 bg-green-600 text-white rounded"
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 棚卸画面本体 */}
      <div className="p-4">
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
              value={scannedItems[0].countedQty ?? ""}
              onChange={(e) => {
                const num = Number(e.target.value);
                // handleCountChange(scannedItems[0].id, num)
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
              {items.map((item) => {
                const diff =
                  item.countedQty != null
                    ? item.countedQty - item.systemQty
                    : null;
                return (
                  <tr
                    key={item.id}
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
                        value={item.countedQty ?? ""}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === "") {
                            // handleCountChange(item.id, null)
                          } else {
                            const num = Number(val);
                            // handleCountChange(item.id, Math.max(0, num))
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
        )}
      </div>
    </div>
  );
}