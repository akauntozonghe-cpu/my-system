"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
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

type TargetState = {
  mode: "AND" | "OR";
  locations: string[];
  categoryLarge: string[];
  categorySmall: string[];
};

export default function FullStocktaking({ sessionId }: { sessionId: string }) {
  const router = useRouter();

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
      const list: Product[] = snap.docs.map(d => ({ id: d.id, ...d.data() } as Product));
      setProducts(list);

      // ツリー構造化
      const t: any = {};
      list.forEach(p => {
        if (!t[p.location]) t[p.location] = {};
        if (!t[p.location][p.categoryLarge]) t[p.location][p.categoryLarge] = {};
        if (!t[p.location][p.categoryLarge][p.categorySmall]) t[p.location][p.categoryLarge][p.categorySmall] = [];
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

  // --- 棚卸対象確認画面 ---
  if (!confirmed) {
    return (
      <div className="p-6">
        <h2 className="text-xl font-bold mb-4">棚卸対象の確認（ツリー形式）</h2>

        {/* ツリー表示は省略（TargetTreeSelector を組み込む） */}

        {/* AND/OR 切り替え */}
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

        {/* プレビュー */}
        <div className="mt-4 text-sm text-gray-700">
          <p>現在の条件に該当する商品数: <span className="font-bold text-blue-600">{previewCount ?? "..."}</span> 件</p>
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

      {/* ドロワー */}
      {drawerOpen && (
        <div className="fixed inset-0 flex justify-end z-50">
          <div
            className="flex-1 bg-black bg-opacity-30"
            onClick={() => setDrawerOpen(false)}
          />
          <div className="w-[400px] bg-white p-6 shadow-lg overflow-y-auto">
            <h3 className="text-lg font-bold mb-4">棚卸対象の条件</h3>

            {/* ツリー選択UIをここに組み込む */}

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
                    const