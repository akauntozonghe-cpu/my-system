"use client";

import { useState, useEffect, useRef } from "react";
import { db } from "@lib/firebase";
import { doc, getDoc, collection, getDocs, setDoc, onSnapshot } from "firebase/firestore";
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
          quantity: data.quantity ? Number(data.quantity) : 0,
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
        quantity: data.quantity ? Number(data.quantity) : 0,
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
            <option value="">小分類