type Item = {
  productId: string;
  name?: string;
  systemQty: number;
  countedQty?: number;
};

type Props = { items: Item[] };

export default function AiPanel({ items }: Props) {
  return (
    <div className="p-4 bg-gray-50">
      <h2 className="text-lg font-bold">AI提案</h2>
      <p className="text-sm text-gray-600">
        現在 {items.length} 件のアイテムを解析対象としています
      </p>
    </div>
  );
}