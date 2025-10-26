"use client";

import { useState, useEffect } from "react";
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
          handleScan(scanBuffer, "barcode");
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
    if (!cameraActive) return;
    const codeReader = new BrowserMultiFormatReader();
    codeReader
      .decodeFromVideoDevice(null, "video", (result, err) => {
        if (result) {
          handleScan(result.getText(), "barcode");
        }
      })
      .catch((err) => console.error(err));
    return () => codeReader.reset();
  }, [cameraActive]);

  // 数量変更処理
  const handleCountChange = async (id: string, value: number) => {
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
  const handleScan = (code: string, type: "barcode" | "qr") => {
    if (type === "barcode") {
      const matches = items.filter((i) => i.barcode === code);
      if (matches.length > 0) {
        setScannedItems(matches);
        setCurrentIndex(0);
        setScanMode("barcode");
        setErrorMessage(null);
      } else {
        setErrorMessage(`バーコード「${code}」は登録されていません`);
        setScanMode("error");
      }
    } else {
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
        <div className="bg-blue-600 h-4 rounded" style={{ width: `${progress}%` }} />
      </div>
      <p>{progress}% 完了</p>

      {/* スキャンモード */}
      {scanMode === "idle" && (
        <div className="space-x-4 mt-4">
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
      )}

      {cameraActive && (
        <div className="mt-4">
          <video id="video" style={{ width: "100%" }} />
          <button
            onClick={() => setCameraActive(false)}
            className="mt-2 px-4 py-2 bg-gray-500 text-white rounded"
          >
            カメラ停止
          </button>
        </div>
      )}

      {scanMode === "barcode" && currentItem && (
        <div className="text-center mt-6">
          <h3 className="text-xl font-bold mb-2">{currentItem.name}</h3>
          <input
            type="number"
            value={currentItem.countedQty ?? ""}
            onChange={(e) =>
              handleCountChange(currentItem.id, Number(e.target.value))
            }
            className="border p-2 text-center w-32"
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
          <p className="mb-4">{