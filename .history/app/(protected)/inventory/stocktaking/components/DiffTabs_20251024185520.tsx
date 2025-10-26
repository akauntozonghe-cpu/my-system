"use client";

import { useState } from "react";

type Item = {
  productId: string;
  name?: string;
  systemQty: number;
  countedQty?: number;
};

type Props = {
  items: Item[];
};

export default function DiffTabs({ items }: Props) {
  const [activeTab, setActiveTab] = useState<
    "shortage" | "excess" | "match" | "unscanned"
  >("shortage");

  // 分類
  const shortage = items.filter(
    (i) => i.countedQty !== undefined && i.countedQty < i.systemQty
  );
  const excess = items.filter(
    (i) => i.countedQty !== undefined && i.countedQty > i.systemQty
  );
  const match = items.filter(
    (i) => i.countedQty !== undefined && i.countedQty === i.systemQty
  );
  const unscanned = items.filter((i) => i.countedQty === undefined);

  const tabs = [
    { key: "shortage", label: "不足", data: shortage, color: "text-red-600" },
    { key: "excess", label: "過剰", data: excess, color: "text-blue-600" },
    { key: "match", label: "一致", data: match, color: "text-green-600" },
    { key: "unscanned", label: "未入力", data: unscanned, color: "text-gray-500" },
  ] as const;

  return (
    <div className="p-4 border-l w-1/3">
      <h2 className="text-lg font-bold">差異タブ</h2>

      {/* タブ切り替えボタン */}
      <div className="flex space-x-2 mt-2">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`px-3 py-1 rounded ${
              activeTab === t.key
                ? "bg-blue-600 text-white"
                : "bg-gray-200 text-gray-700"
            }`}
          >
            {t.label} ({t.data.length})
          </button>
        ))}
      </div>

      {/* 選択中タブのリスト */}
      <ul className="mt-3 space-y-1">
        {tabs
          .find((t) => t.key === activeTab)
          ?.data.map((item) => {
            const diff =
              item.countedQty !== undefined
                ? item.countedQty - item.systemQty
                : null;
            return (
              <li key={item.productId} className={`${tabs.find(t => t.key === activeTab)?.color}`}>
                {item.name ?? item.productId} →{" "}
                {item.countedQty ?? "未入力"} / {item.systemQty}
                {diff !== null && diff !== 0 && ` (${diff > 0 ? "+" : ""}${diff})`}
              </li>
            );
          })}
      </ul>
    </div>
  );
}