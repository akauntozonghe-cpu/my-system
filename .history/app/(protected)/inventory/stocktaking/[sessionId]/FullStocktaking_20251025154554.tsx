"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { db } from "@lib/firebase";
import { doc, getDoc, collection, getDocs, setDoc } from "firebase/firestore";
import { Item, SessionMeta } from "@lib/stocktaking/types";
import { recordJournal } from "@lib/stocktaking/utils";
import { BrowserMultiFormatReader } from "@zxing/library";

export default function FullStocktaking({ sessionId }: { sessionId: string }) {
  const router = useRouter();

  const [meta, setMeta] = useState<SessionMeta | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [confirmed, setConfirmed] = useState(false);

  // スキャン関連
  const [scanMode, setScanMode] = useState<"idle" | "barcode" | "qr" | "error">("idle");
  const [scannedItems, setScannedItems] = useState<Item[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // USBスキャナ入力用バッファ
  const [scanBuffer, setScanBuffer] = useState("");

  // カメラ利用フラグ
  const [cameraActive, setCameraActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // JAN手入力
  const [manualJan, setManualJan] = useState("");

  // スワイプ用
  const [touchStartX, setTouchStartX] = useState<number | null>(null);

  useEffect(() => {
    if (!sessionId) return;

    const load = async () => {
      try {
        const metaSnap = await getDoc(
          doc(db, "stocktakingSessions", sessionId, "meta", "info")
        );
        if (metaSnap.exists()) {
          setMeta(metaSnap.data() as SessionMeta);
        }

        const snap = await getDocs(
          collection(db, "stocktakingSessions", sessionId, "items")
        );
        const loaded: Item[] = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<Item, "id">),
        }));
        setItems(loaded);
      } catch (err) {
        console.error("棚卸データの読み込みに失敗しました:", err);
      }
    };

    load();
  }, [sessionId]);

  // USBスキャナ入力（キーボードイベント）
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Enter") {
        if (scanBuffer.length > 0) {
          handleScan(scanBuffer, "handleScan(code)");
          setScanBuffer("");
        }
      } else {
        setScanBuffer((prev) => prev + e.key);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [scanBuffer]);

  // カメラ読み取り
  useEffect(() => {
    if (!cameraActive || !videoRef.current) return;
    const codeReader = new BrowserMultiFormatReader();
    codeReader
      .decodeFromVideoDevice(null, videoRef.current, (result, err) => {
        if (result) {
          handleScan(result.getText(), "handle");
        }
      })
      .catch((err) => console.error("カメラ起動エラー:", err));
    return () => codeReader.reset();
  }, [cameraActive]);

  // 数量変更処理（nullも許容）
  const handleCountChange = async (id: string, value: number | null) => {
    const target = items.find((i) => i.id === id);
    const oldQty = target?.countedQty ?? null;

    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, countedQty: value } : item))
    );

    await setDoc(
      doc(db, "stocktakingSessions", sessionId, "items", id),
      { countedQty: value },
      { merge: true }
    );

    await recordJournal({
      sessionId,
      itemId: id,
      action: "update",
      oldQty,
      newQty: value,
      userId: "system-user",
    });
  };

  // スキャン処理
  const handleScan = (code: string) => {
  // JANコード判定（8桁 or 13桁の数字のみ）
  const isJan = /^\d{8}$|^\d{13}$/.test(code);

  if (isJan) {
    // バーコード処理
    const matches = items.filter((i) => i.barcode === code);
    if (matches.length > 0) {
      setScannedItems(matches);
      setCurrentIndex(0);
      setScanMode("barcode");
      setErrorMessage(null);
    } else {
      setErrorMessage(`JANコード「${code}」は登録されていません`);
      setScanMode("error");
    }
  } else {
    // QRコード処理
    const matches = items.filter(
      (i) => i.location === code || i.category === code || i.supplier === code
    );
    if (matches.length > 0) {
      setScannedItems(matches);
      setCurrentIndex(0);
      setScanMode("qr");
      setErrorMessage(null);
    } else {
      setErrorMessage(`QRコード「${code}」は登録されていません`);
      setScanMode("error");
    }
  }
};

  const currentItem = scannedItems[currentIndex];

  // 進捗計算
  const completed = items.filter((i) => i.countedQty != null).length;
  const progress = items.length > 0 ? Math.round((completed / items.length) * 100) : 0;

  // 未入力を上にソートしたリスト
  const sortedItems = [...items].sort((a, b) => {
    if (a.countedQty == null && b.countedQty != null) return -1;
    if (a.countedQty != null && b.countedQty == null) return 1;
    return 0;
  });

  // 1. 確認画面
  if (!confirmed) {
    return (
      <div>
        <p>
          保管場所:{" "}
          {meta?.target?.mode === "location"
            ? meta.target.values.join(", ")
            : "全体"}
        </p>
        <p>
          大分類:{" "}
          {meta?.target?.mode === "category"
            ? meta.target.values.join(", ")
            : "全体"}
        </p>
        <button
          onClick={() => setConfirmed(true)}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded"
        >
          確認して棚卸を開始
        </button>
      </div>
    );
  }

  // 2. 棚卸画面
  return (
    <div>
      {/* 進捗バー */}
      <div className="w-full bg-gray-200 rounded h-4 mb-2">
        <div
          className="bg-blue-600 h-4 rounded"
          style={{ width: `${progress}%` }}
        />
      </div>
      <p>{progress}% 完了</p>

      {/* idleモード */}
      {scanMode === "idle" && (
        <div className="space-y-6 mt-4">
          {/* カメラ起動 */}
          <div className="space-x-4">
            <button
              onClick={() => setCameraActive(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded"
            >
              カメラで読み取り開始
            </button>
            <p className="text-sm text-gray-600 mt-2">
              USBスキャナを接続してバーコードを読み取ると自動入力されます
            </p>
          </div>

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

          {/* JANコード手入力欄 */}
          <div className="flex items-center space-x-2">
            <input
              type="text"
              value={manualJan}
              onChange={(e) => setManualJan(e.target.value)}
              placeholder="JANコードを入力"
              className="border p-2 rounded w-48"
            />
            <button
              onClick={() => {
                if (manualJan.trim() !== "") {
                  handleScan(manualJan.trim(), "barcode");
                  setManualJan("");
                }
              }}
                            className="px-4 py-2 bg-green-600 text-white rounded"
            >
              確認
            </button>
          </div>

          {/* 在庫リスト（未入力が上） */}
          <table className="w-full border mt-4">
            <thead>
              <tr>
                <th className="border px-2 py-1">商品</th>
                <th className="border px-2 py-1">保管場所</th>
                <th className="border px-2 py-1">大分類</th>
                <th className="border px-2 py-1">予定数量</th>
                <th className="border px-2 py-1">実棚数量</th>
                <th className="border px-2 py-1">差分</th>
              </tr>
            </thead>
            <tbody>
              {sortedItems.map((item) => {
                const diff =
                  item.countedQty != null ? item.countedQty - item.systemQty : null;
                return (
                  <tr key={item.id}>
                    <td className="border px-2 py-1">{item.name}</td>
                    <td className="border px-2 py-1">{item.location ?? "-"}</td>
                    <td className="border px-2 py-1">{item.category ?? "-"}</td>
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

      {/* バーコード／QRスキャン後の中央表示 */}
      {(scanMode === "barcode" || scanMode === "qr") && currentItem && (
        <div
          className="text-center mt-6"
          onTouchStart={(e) => setTouchStartX(e.touches[0].clientX)}
          onTouchEnd={(e) => {
            if (touchStartX === null) return;
            const deltaX = e.changedTouches[0].clientX - touchStartX;
            if (deltaX > 50) {
              setCurrentIndex((i) => Math.max(0, i - 1));
            } else if (deltaX < -50) {
              setCurrentIndex((i) => Math.min(scannedItems.length - 1, i + 1));
            }
            setTouchStartX(null);
          }}
        >
          <h3 className="text-xl font-bold mb-2">{currentItem.name}</h3>
          <p className="text-sm text-gray-600">
            保管場所: {currentItem.location ?? "-"} ／ 大分類: {currentItem.category ?? "-"}
          </p>
          <input
            type="number"
            min={0}
            value={currentItem.countedQty ?? ""}
            onChange={(e) => {
              const val = e.target.value;
              if (val === "") {
                handleCountChange(currentItem.id, null);
              } else {
                const num = Number(val);
                handleCountChange(currentItem.id, Math.max(0, num));
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

      {/* エラーメッセージ表示 */}
      {scanMode === "error" && errorMessage && (
        <div className="mt-6 text-center text-red-600">
          <p className="mb-4">{errorMessage}</p>
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
          </div>
        </div>
      )}

      {/* 完了ボタン */}
      {progress === 100 && (
        <button
          onClick={async () => {
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
          }}
          className="mt-6 px-4 py-2 bg-green-600 text-white rounded"
        >
          棚卸結果を確定
        </button>
      )}
    </div>
  );
}