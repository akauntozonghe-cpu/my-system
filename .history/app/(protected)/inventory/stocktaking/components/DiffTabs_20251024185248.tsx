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
  const [activeTab, setActiveTab] = useState<"shortage" | "excess" | "match" | "unscanned">("shortage");

  const shortage = items.filter(i => i.countedQty !== undefined && i.countedQty < i.systemQty);
  const excess   = items.filter(i => i.countedQty !== undefined && i.countedQty > i.systemQty);
  const match    = items.filter(i => i.countedQty !== undefined && i.countedQty === i.systemQty);
  const unscanned= items.filter(i => i.countedQty === undefined);

  const tabs = [
    { key: "shortage", label: "不足", data: shortage },
    { key: "excess", label: "過剰", data: excess },
    { key: "match", label: "一致", data: match },
    { key: "unscanned", label: "未入力", data: unscanned },
  ] as const;

  return (
    <div className="p-4 border-l w-1/3">
      <h2 className="text-lg font-bold">差異タブ</h2>
      <div className="flex space-x-2 mt-2">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`px-3 py-1 rounded ${activeTab === t.key ? "bg-blue-600 text-white" : "bg-gray-200"}`}
          >
            {t.label} ({t.data.length})
          </button>
        ))}
      </div>
      <ul className="mt-3 space-y-1">
        {tabs.find(t => t.key === activeTab)?.data.map(item => (
          <li key={item.productId} className="text-sm">
            {item.name ?? item.productId} → {item.countedQty ?? "未入力"} / {item.systemQty}
          </li>
        ))}
      </ul>
    </div>
  );
}