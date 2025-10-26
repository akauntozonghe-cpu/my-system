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
  return (
    <div className="p-4 border-l w-1/3">
      <h2 className="text-lg font-bold">差異タブ</h2>
      {/* ...タブ切り替えと分類表示... */}
    </div>
  );
}