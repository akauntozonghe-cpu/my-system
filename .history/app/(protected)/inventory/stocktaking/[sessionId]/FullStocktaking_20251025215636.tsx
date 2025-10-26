"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { db } from "@lib/firebase";
import { doc, getDoc, collection, getDocs, setDoc } from "firebase/firestore";
import { Item, SessionMeta } from "@lib/stocktaking/types";
import { recordJournal } from "@lib/stocktaking/utils";
import { BrowserMultiFormatReader } from "@zxing/library";

// 正規化関数
const normalize = (val?: string) => (val ? val.trim().toLowerCase() : "");

// セッション開始時に products → items コピー
const initializeSessionItems = async (sessionId: string) => {
  const snap = await getDocs(collection(db, "products"));
  for (const d of snap.docs) {
    const data = d.data();
    await setDoc(
      doc(db, "stocktakingSessions", sessionId, "items", d.id),
      {
        ...data,
        countedQty: null,
        systemQty: data.quantity ?? 0,
        status: "pending",
      }
    );
  }
};

export default function FullStocktaking({ sessionId }: { sessionId: string }) {
  const router = useRouter();

  // --- state ---
  const [meta, setMeta] = useState<SessionMeta | null>(null);
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

  // --- 初期データ読み込み ---
  useEffect(() => {
    if (!sessionId) return;
    const load = async () => {
      try {
        const metaSnap = await getDoc(doc(db, "stocktakingSessions", sessionId, "meta", "info"));
        if (metaSnap.exists()) setMeta(metaSnap.data() as SessionMeta);

        const snap = await getDocs(collection(db, "stocktakingSessions", sessionId, "items"));
        const loaded: Item[] = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Item, "id">) }));
        setItems(loaded);
      } catch (err) {
        console.error("棚卸データの読み込みに失敗:", err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [sessionId]);

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

  // --- 進捗計算 ---
  const currentItem = scannedItems[currentIndex];
  const completed = items.filter((i) => i.countedQty != null).length;
  const progress = items.length > 0 ? Math.round((completed / items.length) * 100) : 0;
  const sortedItems: Item[] = [...items].sort((a, b) => {
    if (a.countedQty == null && b.countedQty != null) return -1;
    if (a.countedQty != null && b.countedQty == null) return 1;
    return 0;
  });

  // --- ローディング表示 ---
  if (loading) return <div className="p-6 text-center">データ読込中...</div>;

  // --- 確認画面 ---
  if (!confirmed) {
    return (
      <div className="p-6 border rounded bg-white shadow text-center">
        <h2 className="text-xl font-bold mb-4">棚卸対象の確認</h2>
        <p className="mb-2">保管場所: {meta?.target?.mode === "location" ? meta.target.values.join(", ") : "全体"}</p>
        <p className="mb-4">大分類: {meta?.target?.mode === "categoryLarge" ? meta.target.values.join(", ") : "全体"}</p>
        {loadingMaster ? (
          <div className="flex flex-col items-center space-y-2">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-gray-600">マスタを読み込み中...</p>
          </div>
        ) : (
          <button
            onClick={async () => {
              setLoadingMaster(true);
              await initializeSessionItems(sessionId);
              setLoadingMaster(false);
              setConfirmed(true);
            }}
            className="px-6 py-3 bg-blue-600 text-white rounded font-semibold"
          >
            確認して棚卸を開始
          </button>
        )}
      </div>
    );
  }

  // --- 棚卸画面 ---
  return (
    <div>
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

          {/* カメラ映像 */}
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

      {/* スキャン後表示 */}
      {(scanMode === "barcode" || scanMode === "qr") && currentItem && (
        <div className="text-center mt-6">
          <h3 className="text-xl font-bold mb-2">{currentItem?.name ?? "-"}</h3>
          <p className="text-sm text-gray-600">
            JAN: {currentItem?.janCode ?? "-"} ／ 保管場所: {currentItem?.location ?? "-"} ／ 大分類: {currentItem?.categoryLarge ?? "-"} ／ 小分類: {currentItem?.categorySmall ?? "-"}
          </p>
          <input
            type="number"
            min={0}
            value={currentItem?.countedQty ?? ""}
            onChange={(e) => {
              const val = e.target.value;
              if (val === "") {
                handleCountChange(currentItem!.id, null);
              } else {
                const num = Number(val);
                handleCountChange(currentItem!.id, Math.max(0, num));
              }
            }}
            className="border p-2 text-center w-32 mt-2"
          />
          <div className="mt-4 space-x-4">
            <button
              onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
              disabled={currentIndex === 0}
            >
              ← 前へ
            </button>
            <button
              onClick={() =>
                setCurrentIndex((i) =>
                  Math.min(scannedItems.length - 1, i + 1)
                )
              }
              disabled={currentIndex === scannedItems.length - 1}
            >
              次へ →
            </button>
          </div>
          <button
            onClick={() => setScanMode("idle")}
            className="mt-4 px-4 py-2 bg-gray-500 text-white rounded"
          >
            戻る
          </button>
        </div>
      )}

      {/* エラー表示 */}
      {scanMode === "error" && errorMessage && (
        <div className="mt-6 text-center text-red-600">
          <p className="mb-4 font-semibold">{errorMessage}</p>
          <div className="space-x-4">
            <button
              onClick={() => router.push("/inventory/report")}
              className="px-4 py-2 bg-yellow-600 text-white rounded"
            >
              報告
            </button>
            <button
              onClick={() => {
                setScanMode("idle");
                setErrorMessage(null);
              }}
              className="px-4 py-2 bg-gray-500 text-white rounded"
            >
              戻る
            </button>
            <button
              onClick={() =>
                router.push("/inventory/register/single?from=stocktaking")
              }
              className="px-4 py-2 bg-blue-600 text-white rounded"
            >
              登録
            </button>
            <button
              onClick={async () => {
                if (errorMessage) {
                  await recordJournal({
                    sessionId,
                    itemId: "unknown",
                    action: "scan-error",
                    oldQty: null,
                    newQty: null,
                    userId: "system-user",
                    note: `Rescan triggered after error: ${errorMessage}`,
                    meta: {
                      timestamp: new Date().toISOString(),
                      userAgent: navigator.userAgent,
                      platform: navigator.platform,
                    },
                  });
                }
                setErrorMessage(null);
                setScanBuffer("");
                setScanMode("idle");
                setCameraActive(true);
              }}
              className="px-4 py-2 bg-green-600 text-white rounded"
            >
              再スキャン
            </button>
          </div>
        </div>
      )}

      {/* 完了ボタン */}
      {progress === 100 && (
        <button
          onClick={async () => {
            if (!window.confirm("棚卸結果を確定しますか？")) return;
            await setDoc(
              doc(db, "stocktakingSessions", sessionId, "meta", "info"),
              { status: "confirmed" },
              { merge: true }
            );
            await recordJournal({
              sessionId,
              itemId: "all",
              action: "confirm",
              oldQty: null,
              newQty: null,
              userId: "system-user",
            });
            router.push("/inventory/summary");
          }}
          className="mt-6 px-4 py-2 bg-green-600 text-white rounded"
        >
          棚卸結果を確定
        </button>
      )}
    </div>
  );
}