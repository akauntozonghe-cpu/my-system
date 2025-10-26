"use client";

import { Item } from "@lib/stocktaking/types";  // ← 型を import

type Props = { items: Item[] };

export default function AiPanel({ items }: Props) {
  const shortage = items.filter(
    (i) => i.countedQty !== undefined && i.countedQty < i.systemQty
  );
  const excess = items.filter(
    (i) => i.countedQty !== undefined && i.countedQty > i.systemQty
  );

  return (
    <div className="p-4 bg-gray-50">
      <h2 className="text-lg font-bold">AI提案</h2>
      <ul className="mt-2 space-y-1 text-sm">
        {shortage.length > 0 && (
          <li className="text-yellow-700">
            ⚠ 不足アイテム {shortage.length} 件 → 仕入れ候補
          </li>
        )}
        {excess.length > 0 && (
          <li className="text-blue-700">
            ℹ 過剰アイテム {excess.length} 件 → フリマ候補
          </li>
        )}
        {shortage.length === 0 && excess.length === 0 && (
          <li className="text-green-700">✅ 差異なし</li>
        )}
      </ul>
    </div>
  );
}