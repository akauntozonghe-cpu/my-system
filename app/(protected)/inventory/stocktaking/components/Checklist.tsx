"use client";

import { Item } from "@lib/stocktaking/types";

type Props = { items: Item[] };

export default function Checklist({ items }: Props) {
  return (
    <div className="w-1/3 p-4 border-l">
      <h2 className="text-lg font-bold">チェックリスト</h2>
      <ul className="mt-2 space-y-1">
        {items.map((item) => {
          // 差分計算（countedQty が null の場合は差分なし）
          const diff =
            item.countedQty != null ? item.countedQty - item.systemQty : null;

          // 状態表示（null = 未入力, 0以上 = 済）
          const status = item.countedQty == null ? "⬜ 未" : "✅ 済";

          // 差分に応じた色分け
          const color =
            diff === null
              ? "text-gray-500"
              : diff < 0
              ? "text-red-500"
              : diff > 0
              ? "text-blue-500"
              : "text-green-600";

          return (
            <li key={item.id} className={`list-none ${color}`}>
              {item.name ?? item.productId} {status}
              {diff !== null && ` (${diff >= 0 ? "+" : ""}${diff})`}
            </li>
          );
        })}
      </ul>
    </div>
  );
}