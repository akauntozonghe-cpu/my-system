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

  // セッションデータ読み込み
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

  // カメラ起動／停止
  useEffect(() => {
    if (!cameraActive || !videoRef.current) return;
    const codeReader = new BrowserMultiFormatReader();

    codeReader.decodeFromConstraints(
      {
        video: {
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          facingMode: "environment",
        },
      },
      videoRef.current,
      (result, err) => {
        if (result) {
          handleScan(result.getText());
        }
      }
    );

    return () => codeReader.reset();
  }, [cameraActive]);

  // 数量変更処理
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

  // エラーログ記録
  const logScanError = async (code: string, type: string) => {
    await recordJournal({
      sessionId,
      itemId: "unknown",
      action: "scan-error",
      oldQty: null,
      newQty: null,
      userId: "system-user",
      note: `未登録${type}: ${code}`,
      meta: {
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        platform: navigator.platform,
      },
    });
  };

  // スキャン処理
  const handleScan = async (code: string) => {
    if (!code || code.trim() === "") return;

    const isJan = /^\d{8}$|^\d{13}$/.test(code);

    if (isJan) {
      const matches = items.filter((i) => i.barcode === code);
      if (matches.length > 0) {
        setScannedItems(matches);
        setCurrentIndex(0);
        setScanMode("barcode");
        setErrorMessage(null);
        setCameraActive(false); // 成功で停止
      } else {
        setErrorMessage(`バーコード「${code}」は登録されていません。`);
        setScanMode("error");
        setCameraActive(false);
        await logScanError(code, "バーコード未登録");
      }
    } else if (code.startsWith("http://") || code.startsWith("https://")) {
      setErrorMessage(`「${code}」は登録されていません（URL形式）。`);
      setScanMode("error");
      setCameraActive(false);
      await logScanError(code, "URL未登録");
    } else {
      const matches = items.filter(
        (i) => i.location === code || i.category === code || i.supplier === code
      );
      if (matches.length > 0) {
        setScannedItems(matches);
        setCurrentIndex(0);
        setScanMode("qr");
        setErrorMessage(null);
        setCameraActive(false);
      } else {
        setErrorMessage(`QRコード「${code}」は登録されていません。`);
        setScanMode("error");
        setCameraActive(false);
        await logScanError(code, "QRコード未登録");
      }
    }
  };

  const currentItem = scannedItems[currentIndex];

  // 進捗計算
  const completed = items.filter((i) => i.countedQty != null).length;
  const progress = items.length > 0 ? Math.round((completed / items.length) * 100) : 0;

  // 未入力を上にソート
  const sortedItems = [...items].sort((a, b) => {
    if (a.countedQty == null && b.countedQty != null) return -1;
    if (a.countedQty != null && b.countedQty == null) return 1;
    return 0;
  });

  // 1. 確認画面
  if (!confirmed) {
    return (
      <div className="p-6 border rounded bg-white shadow">
        <h2 className="text-xl font-bold mb-4">棚卸対象の確認</h2>
        <p className="mb-2">
          保管場所:{" "}
          {meta?.target?.mode === "location"
            ? meta.target.values.join(", ")
            : "全体"}
        </p>
        <p className="mb-4">
          大分類:{" "}
          {meta?.target?.mode === "category"
            ? meta.target.values.join(", ")
            : "全体"}
        </p>
        <button
          onClick={() => setConfirmed(true)}
          className="px-6 py-3 bg-blue-600 text-white rounded font-semibold"
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
          <button
            onClick={() => setCameraActive(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded"
          >
            カメラで読み取る
          </button>
         