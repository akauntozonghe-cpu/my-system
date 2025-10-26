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
                 