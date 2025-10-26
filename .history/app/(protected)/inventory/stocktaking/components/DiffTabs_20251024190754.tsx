type Item = {
  productId: string;
  name?: string;
  systemQty: number;
  countedQty?: number;
};

type Props = { items: Item[] };

export default function DiffTabs({ items }: Props) {
  // ここで不足・過剰・一致・未入力を分類してタブ表示
}