"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { db } from "@lib/firebase";
import { doc, getDoc, collection, getDocs, setDoc } from "firebase/firestore";
import { Item, SessionMeta } from "@lib/stocktaking/types";
import { recordJournal } from "@lib/stocktaking/utils";
import { BrowserMultiFormatReader } from "@zxing/library";

const normalize = (val?: string) => (val ? val.trim().toLowerCase() : "");

// --- products → items コピー ---
const copySelectedProducts = async (sessionId: string, products: any[], selected: {[id:string]: boolean}) => {
  for (const p of products) {
    if (!selected[p.id]) continue;
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
};

export default function FullStocktaking({ sessionId }: { sessionId: string }) {
  const router = useRouter();

  // --- state ---
  const [meta, setMeta] = useState<SessionMeta | null>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [selected, setSelected] = useState<{[id:string]: boolean}>({});
  const [items, setItems] = useState<Item[]>([]);
  const [confirmed, setConfirmed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMaster, setLoadingMaster] = useState(false);

  const [scanMode, setScanMode] = useState<"idle" | "barcode" | "qr" | "error">("idle");
  const [scannedItems, setScannedItems] = useState<Item[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [scanBuffer, setScanBuffer] = useState("");
  const [cameraActive, setCameraActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [manualJan, setManualJan] = useState("");

  // --- products 読み込み ---
  useEffect(() => {
    const loadProducts = async () => {
      const snap = await getDocs(collection(db, "products"));
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setProducts(list);
      const initSel: {[id:string]: boolean} = {};
      list.forEach(p => { initSel[p.id] = true; });
      setSelected(initSel);
      setLoading(false);
    };
    loadProducts();
  }, []);

  // --- items 読み込み（confirmed後） ---
  useEffect(() => {
    if (!confirmed) return;
    const loadItems = async () => {
      const snap = await getDocs(collection(db, "stocktakingSessions", sessionId, "items"));
      const loaded: Item[] = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Item, "id">) }));
      setItems(loaded);
    };
    loadItems();
  }, [confirmed, sessionId]);

  // --- USBスキャナ入力 ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Enter") {
        if (scanBuffer.length > 0) {
          handleScan(scanBuffer);
          setScanBuffer("");
        }
      } else {
        setScanBuffer((prev) => prev + e.key);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [scanBuffer]);

  // --- カメラ起動 ---
  useEffect(() => {
    if (!cameraActive || !videoRef.current) return;
    const codeReader = new BrowserMultiFormatReader();
    codeReader.decodeFromConstraints(
      { video: { width: { ideal: 1920 }, height: { ideal: 1080 }, facingMode: "environment" } },
      videoRef.current,
      (result) => { if (result) handleScan(result.getText()); }
    );
    return () => codeReader.reset();
  }, [cameraActive]);

  // --- 数量変更 ---
  const handleCountChange = async (id: string, value: number | null) => {
    const target = items.find((i) => i.id === id);
    const oldQty = target?.countedQty ?? null;
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, countedQty: value } : item)));
    await setDoc(doc(db, "stocktakingSessions", sessionId, "items", id), { countedQty: value }, { merge: true });
    await recordJournal({ sessionId, itemId: id, action: "update", oldQty, newQty: value, userId: "system-user" });
  };

  // --- エラーログ ---
  const logScanError = async (code: string, type: string) => {
    await recordJournal({
      sessionId, itemId: "unknown", action: "scan-error",
      oldQty: null, newQty: null, userId: "system-user",
      note: `未登録${type}: ${code}`,
      meta: { timestamp: new Date().toISOString(), userAgent: navigator.userAgent, platform: navigator.platform }
    });
  };

  // --- スキャン処理 ---
  const handleScan = async (code: string) => {
    if (!code || code.trim() === "") return;
    const isNumeric = /^\d+$/.test(code);
    if (isNumeric) {
      const matches = items.filter((i: Item) => String(i.janCode) === String(code));
      if (matches.length > 0) {
        setScannedItems(matches); setCurrentIndex(0); setScanMode("barcode"); setErrorMessage(null); setCameraActive(false);
      } else {
        setErrorMessage(`JANコード「${code}」に対応する商品が登録されていません。`);
        setScanMode("error"); setCameraActive(false); await logScanError(code, "JAN未登録");
      }
    } else {
      const matches = items.filter((i: Item) =>
        normalize(i.location) === normalize(code) ||
        normalize(i.categoryLarge) === normalize(code) ||
        normalize(i.categorySmall) === normalize(code)
      );
      if (matches.length > 0) {
        setScannedItems(matches); setCurrentIndex(0); setScanMode("qr"); setErrorMessage(null); setCameraActive(false);
      } else {
        setErrorMessage(`QRコード「${code}」に対応する商品が登録されていません。`);
        setScanMode("error"); setCameraActive(false); await logScanError(code, "QR未登録");
      }
    }
  };

  // --- 進捗 ---
  const currentItem = scannedItems[currentIndex];
  const completed = items.filter((i) => i.countedQty != null).length;
  const progress = items.length > 0 ? Math.round((completed / items.length) * 100) : 0;
  const sortedItems: Item[] = [...items].sort((a, b) => {
    if (a.countedQty == null && b.countedQty != null) return -1;
    if (a.countedQty != null && b.countedQty == null) return 1;
    return 0;
  });

  // --- 確認画面 ---
  if (!confirmed) {
    return (
      <div className="p-6">
        <h2 className="text-xl font-bold mb-4">棚卸対象の確認</h2>
        {loadingMaster ? (
          <div className="flex flex-col items-center space-y-2">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-gray-600">データを読み込み中...</p>
          </div>
        ) : (
          <>
            <table className="w-full border mb-4">
              <thead>
                                <tr>
                  <th className="border px-2 py-1">対象</th>
                  <th className="border px-2 py-1">商品名</th>
                  <th className="border px-2 py-1">保管場所</th>
                  <th className="border px-2 py-1">大分類</th>
                  <th className="border px-2 py-1">小分類</th>
                  <th className="border px-2 py-1">数量</th>
                  <th className="border px-2 py-1">単位</th>
                  <th className="border px-2 py-1">JAN</th>
                </tr>
              </thead>
              <tbody>
                {products.map(p => (
                  <tr key={p.id}>
                    <td className="border px-2 py-1 text-center">
                      <input
                        type="checkbox"
                        checked={selected[p.id] ?? false}
                        onChange={(e) =>
                          setSelected(prev => ({ ...prev, [p.id]: e.target.checked }))
                        }
                      />
                    </td>
                    <td className="border px-2 py-1">{p.name}</td>
                    <td className="border px-2 py-1">{p.location}</td>
                    <td className="border px-2 py-1">{p.categoryLarge}</td>
                    <td className="border px-2 py-1">{p.categorySmall}</td>
                    <td className="border px-2 py-1">{p.quantity}</td>
                    <td className="border px-2 py-1">{p.unit}</td>
                    <td className="border px-2 py-1">{p.janCode}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <button
              onClick={async () => {
                setLoadingMaster(true);
                await copySelectedProducts(sessionId, products, selected);
                setLoadingMaster(false);
                setConfirmed(true);
              }}
              className="px-6 py-3 bg-blue-600 text-white rounded font-semibold"
            >
              棚卸を開始
            </button>
          </>
        )}
      </div>
    );
  }

  // --- 棚卸画面 ---
  return (
    <div>
      {/* 進捗バー */}
      <div className="w-full bg-gray-200 rounded h-4 mb-2">
        <div className="bg-blue-600 h-4 rounded" style={{ width: `${progress}%` }} />
      </div>
      <p>{progress}% 完了</p>

      {/* idleモード */}
      {scanMode === "idle" && (
        <div className="space-y-6 mt-4">
          <button
            onClick={() => setCameraActive(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded"
          >
            カメラで読み取る
          </button>
          <p className="text-sm text-gray-600 mt-2">
            USBスキャナを接続してバーコードを読み取ると自動入力されます
          </p>

          {cameraActive && (
            <div className="mt-4">
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

          {/* 在庫リスト */}
          <table className="w-full border mt-4">
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
              {sortedItems.map((item: Item) => {
                const diff = item.countedQty != null ? item.countedQty - item.systemQty : null;
                return (
                  <tr key={item.id} className={item.countedQty == null ? "bg-yellow-50" : ""}>
                    <td className="border px-2 py-1">{item.name}</td>
                    <td className="border px-2 py-1">{item.location ?? "-"}</td>
                    <td className="border px-2 py-1">{item.categoryLarge ?? "-"}</td>
                    <td className="border px-2 py-1">{item.categorySmall ?? "-"}</td>
                    <td className="border px-2 py-1">{item.systemQty}</td>
                    <td className="border px-2 py-1">
                      <input
                        type="number"
                        min={0}
                        value={item.countedQty ?? ""}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === "") {
                            handleCountChange(item.id, null);
                          } else {
                            const num = Number(val);
                            handleCountChange(item.id, Math.max(0, num));
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

      {/* スキャン後表示・エラー表示・完了ボタンは前回のコードと同じ構成 */}
      {/* ...省略（前回提示済みの scanMode === "barcode"/"qr"/"error" 部分と完了ボタン）... */}
    </div>
  );
}