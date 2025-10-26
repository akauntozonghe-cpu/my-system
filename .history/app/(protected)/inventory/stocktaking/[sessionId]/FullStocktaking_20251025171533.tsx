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

  // --- state 定義 ---
  const [meta, setMeta] = useState<SessionMeta | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [confirmed, setConfirmed] = useState(false);
  const [scanMode, setScanMode] = useState<"idle" | "barcode" | "qr" | "error">("idle");
  const [scannedItems, setScannedItems] = useState<Item[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [scanBuffer, setScanBuffer] = useState("");
  const [cameraActive, setCameraActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [manualJan, setManualJan] = useState("");

  // --- Firestore 読み込み ---
  useEffect(() => {
    if (!sessionId) return;
    const load = async () => {
      const metaSnap = await getDoc(doc(db, "stocktakingSessions", sessionId, "meta", "info"));
      if (metaSnap.exists()) setMeta(metaSnap.data() as SessionMeta);

      const snap = await getDocs(collection(db, "stocktakingSessions", sessionId, "items"));
      const loaded: Item[] = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Item, "id">) }));
      setItems(loaded);
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

  // --- 数量変更処理 ---
  const handleCountChange = async (id: string, value: number | null) => {
    const target = items.find((i) => i.id === id);
    const oldQty = target?.countedQty ?? null;
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, countedQty: value } : item)));
    await setDoc(doc(db, "stocktakingSessions", sessionId, "items", id), { countedQty: value }, { merge: true });
    await recordJournal({ sessionId, itemId: id, action: "update", oldQty, newQty: value, userId: "system-user" });
  };

  // --- エラーログ記録 ---
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
    const isJan = /^\d{8}$|^\d{13}$/.test(code);

    if (isJan) {
      const matches = items.filter((i) => i.barcode === code || i.janCode === code);
      if (matches.length > 0) {
        setScannedItems(matches); setCurrentIndex(0); setScanMode("barcode");
        setErrorMessage(null); setCameraActive(false);
      } else {
        setErrorMessage(`バーコード「${code}」は登録されていません。`);
        setScanMode("error"); setCameraActive(false);
        await logScanError(code, "バーコード未登録");
      }
    } else if (code.startsWith("http://") || code.startsWith("https://")) {
      setErrorMessage(`「${code}」は登録されていません（URL形式）。`);
      setScanMode("error"); setCameraActive(false);
      await logScanError(code, "URL未登録");
    } else {
      const matches = items.filter((i) => i.location === code || i.category === code || i.supplier === code);
      if (matches.length > 0) {
        setScannedItems(matches); setCurrentIndex(0); setScanMode("qr");
        setErrorMessage(null); setCameraActive(false);
      } else {
        setErrorMessage(`QRコード「${code}」は登録されていません。`);
        setScanMode("error"); setCameraActive(false);
        await logScanError(code, "QRコード未登録");
      }
    }
  };

  const currentItem = scannedItems[currentIndex];

  // --- 進捗計算 ---
  const completed = items.filter((i) => i.countedQty != null).length;
  const progress = items.length > 0 ? Math.round((completed / items.length) * 100) : 0;
  const sortedItems = [...items].sort((a, b) => {
    if (a.countedQty == null && b.countedQty != null) return -1;
    if (a.countedQty != null && b.countedQty == null) return 1;
    return 0;
  });

  // --- return 部分 ---
  if (!confirmed) {
    return (
      <div className="p-6 border rounded bg-white shadow">
        {/* 確認画面 */}
      </div>
    );
  }

  return (
    <div>
      {/* 棚卸画面 */}
      {/* idleモード、スキャン後表示、エラー表示、完了ボタン */}
    </div>
  );
}