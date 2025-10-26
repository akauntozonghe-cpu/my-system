"use client";

import { useState, useEffect, useRef } from "react";
import { db } from "@lib/firebase";
import { doc, getDoc, collection, getDocs, setDoc } from "firebase/firestore";
import { Item } from "@lib/stocktaking/types";
import { BrowserMultiFormatReader } from "@zxing/library";
import { TargetTreeSelector } from "./TargetTreeSelector"; // 共通化したツリーUI

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

      // ツリー構造化
      const t: any = {};
      list.forEach(p => {
        if (!t[p.location]) t[p.location] = {};
        if (!t[p.location][p.categoryLarge]) t[p.location][p.categoryLarge] = {};
        if (!t[p.location][p.categoryLarge][p.categorySmall]) {
          t[p.location][p.categoryLarge][p.categorySmall] = [];
        }
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

  // USBスキャナ対応
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Enter") {
        if (scanBuffer.length > 0) {
          handleScan(scanBuffer);
          setScanBuffer("");
        }
      } else {
        setScanBuffer(prev => prev + e.key);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [scanBuffer, items]);

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

  // --- 棚卸対象確認画面 ---
  if (!confirmed) {
    return (
      <div className="p-6">
        <h2 className="text-xl font-bold mb-4">棚卸対象の確認（ツリー形式）</h2>

        <TargetTreeSelector
          tree={tree}
          target={target}
          onChange={(nt) => {
            setTarget(nt);
            saveTarget(nt);
          }}
        />

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
         