"use client";

import { useState, useEffect, useRef } from "react";
import { db } from "@lib/firebase";
import { doc, getDoc, collection, getDocs, setDoc } from "firebase/firestore";
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
  const [products, setProducts] = useState<Product[]>([]);
  const [tree, setTree] = useState<any>({});
  const [target, setTarget] = useState<TargetState>({
    location: null,
    categoryLarge: null,
    categorySmall: null,
  });
  const [previewCount, setPreviewCount] = useState<number | null>(null);
  const [confirmed, setConfirmed] = useState(false);

  const [items, setItems] = useState<Item[]>([]);
  const [scanMode, setScanMode] = useState<"idle" | "barcode" | "error">("idle");
  const [scannedItems, setScannedItems] = useState<Item[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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

      // 保存済みターゲットを復元
      const metaSnap = await getDoc(doc(db, "stocktakingSessions", sessionId, "meta", "info"));
      if (metaSnap.exists()) {
        const data = metaSnap.data();
        if (data.target) {
          setTarget({
            location: data.target.location ?? null,
            categoryLarge: data.target.categoryLarge ?? null,
            categorySmall: data.target.categorySmall ?? null,
          });
        }
      }
    };
    load();
  }, [sessionId]);

  // --- プレビュー件数計算 ---
  useEffect(() => {
    if (!products) return;
    const count = products.filter(p => {
      if (target.location && p.location !== target.location) return false;
      if (target.categoryLarge && p.categoryLarge !== target.categoryLarge) return false;
      if (target.categorySmall && p.categorySmall !== target.categorySmall) return false;
      return true;
    }).length;
    setPreviewCount(count);
  }, [target, products]);

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
            <span className="font-bold text-blue-600">{previewCount ?? "..."}</span> 件
          </p>
        </div>

        <button
          onClick={() => setConfirmed(true)}
          className="mt-6 px-6 py-3 bg-blue-600 text-white rounded"
        >
          棚卸を開始
        </button>
      </div>
    );
  }

  // --- 棚卸画面 ---
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