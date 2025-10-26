"use client";

type Item = {
  productId: string;
  name?: string;
  systemQty: number;
  countedQty?: number;
};

type Props = { items: Item[] };

export default function AiPanel({ items }: Props) {
  const shortage = items.filter(i => i.countedQty !== undefined && i.countedQty < i.systemQty);
  const excess   = items.filter(i => i.countedQty !== undefined && i.countedQty > i.systemQty);

  return (
    <div className="p-4 bg-gray-50">
      <h2 className="text-lg font-bold">AI提案</h2>
      <ul className="mt-2 space-y-1 text-sm">
        {shortage.length > 0 && (
          <li className="text-yellow-700">
            ⚠ 不足アイテムが {shortage.length} 件あります。発注を検討してください。
          </li>
        )}
        {excess.length > 0 && (
          <li className="text-blue-700">
            ℹ 過剰アイテムが {excess.length} 件あります。セールや出品強化を検討してください。
          </li>
        )}
        {shortage.length === 0 && excess.length === 0 && (
          <li className="text-green-700">✅ 特筆すべき差異はありません。</li>
        )}
      </ul>
    </div>
  );
}