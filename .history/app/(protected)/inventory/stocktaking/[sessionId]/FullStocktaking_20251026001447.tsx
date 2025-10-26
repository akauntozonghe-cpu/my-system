"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { db } from "@lib/firebase";
import { doc, getDoc, collection, getDocs, setDoc } from "firebase/firestore";
import { Item } from "@lib/stocktaking/types";
import { recordJournal } from "@lib/stocktaking/utils";
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

  // --- state ---
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
  const [scannedItems, setScannedItems] = useState<Item[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [scanBuffer, setScanBuffer] = useState("");
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
          setTarget(data.target);
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

  // --- 棚卸画面ヘッダ ---
  if (!confirmed) {
    return (
      <div className="p-6">
        <h2 className="text-xl font-bold mb-4">棚卸対象の確認（ツリー形式）</h2>
        {/* ツリー表示（折りたたみ＋親子連動＋indeterminate） */}
        {/* ...ここに前回作った TargetTreeSelector を組み込む... */}

        {/* AND/OR 切り替え */}
        <div className="mt-4">
          <label className="mr-4">
            <input
              type="radio"
              checked={target.mode === "OR"}
              onChange={() => { const nt = {...target, mode:"OR"}; setTarget(nt); saveTarget(nt); }}
            /> OR 条件
          </label>
          <label>
            <input
              type="radio"
              checked={target.mode === "AND"}
              onChange={() => { const nt = {...target, mode:"AND"}; setTarget(nt); saveTarget(nt); }}
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
          {/* 背景クリックで閉じる */}
          <div
            className="flex-1 bg-black bg-opacity-30"
            onClick={() => setDrawerOpen(false)}
          />
          {/* ドロワー内容 */}
          <div className="w-[400px] bg-white p-6 shadow-lg overflow-y-auto">
            <h3 className="text-lg font-bold mb-4">棚卸対象の条件</h3>

            {/* ツリー選択UI（折りたたみ＋親子連動＋indeterminate） */}
            {/* ここに TargetTreeSelector を組み込む */}
            {/* 例: <TargetTreeSelector target={target} onChange={(nt)=>{setTarget(nt); saveTarget(nt);}} /> */}

            {/* AND / OR 切り替え */}
            <div className="mt-4">
              <label className="mr-4">
                <input
                  type="radio"
                  checked={target.mode === "OR"}
                  onChange={() => {
                    const nt = { ...target, mode: "OR" };
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
                    const nt = { ...target, mode: "AND" };
                    setTarget(nt);
                    saveTarget(nt);
                  }}
                /> AND 条件
              </label>
            </div>

            {/* プレビュー件数 */}
            <div className="mt-4 text-sm text-gray-700">
              <p>
                現在の条件に該当する商品数:{" "}
                <span className="font-bold text-blue-600">
                  {previewCount ?? "..."}
                </span>{" "}
                件
              </p>
            </div>

            <div className="flex justify-end mt-6 space-x-2">
              <button
                onClick={() => setDrawerOpen(false)}
                className="px-4 py-2 bg-gray-500 text-white rounded"
              >
                閉じる
              </button>
              <button
                onClick={async () => {
                  await saveTarget(target);
                  setDrawerOpen(false);
                }}
                className="px-4 py-2 bg-green-600 text-white rounded"
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 棚卸画面本体 */}
      <div className="p-4">
        {/* 進捗バー */}
        <div className="w-full bg-gray-200 rounded h-4 mb-2">
          <div
            className="bg-blue-600 h-4 rounded"
            style={{ width: `${items.length > 0 ? Math.round((items.filter(i => i.countedQty != null).length / items.length) * 100) : 0}%` }}
          />
        </div>
        <p className="text-sm text-gray-600 mb-4">
          {items.filter(i => i.countedQty != null).length} / {items.length} 件 完了
        </p>

        {/* idleモード時の一覧 */}
        {scanMode === "idle" && (
          <table className="w-full border">
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
              {items.map(item => {
                const diff = item.countedQty != null ? item.countedQty - item.systemQty : null;
                return (
                  <tr key={item.id} className={item.countedQty == null ? "bg-yellow-50" : ""}>
                    <td className="border px-2 py-1">{item.name}</td>
                    <td className="border px-2 py-1">{item.location}</td>
                    <td className="border px-2 py-1">{item.categoryLarge}</td>
                    <td className="border px-2 py-1">{item.categorySmall}</td>
                    <td className="border px-2 py-1">{item.systemQty}</td>
                    <td className="border px-2 py-1">
                      <input
                        type="number"
                        min={0}
                        value={item.countedQty ?? ""}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === "") {
                            // handleCountChange(item.id, null)
                          } else {
                            const num = Number(val);
                            // handleCountChange(item.id, Math.max(0, num))
                          }
                        }}
                        className="border p-1 w-20"
                      />
                    </td>
                    <td className="border px-2 py-1">
                      {diff !== null ? (
                        <span className={diff === 0 ? "text-gray-600" : diff > 0 ? "text-green-600" : "text-red-600"}>
                          {diff > 0 ? "+" : ""}
                          {diff}
                        </span>
                      ) : "-"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}