// 商品アイテム
export type Item = {
  id: string;
  productId: string;
  name?: string;
  systemQty: number;
  countedQty: number | null; // ← null を明示的に許容
  location?: string;
  category?: string;
  supplier?: string;
  barcode?: string;
};

// 棚卸しセッションのメタ情報
export type SessionMeta = {
  sessionId: string;
  type: "full" | "partial" | "import"; // import も追加しておくと便利
  target?: {
    mode: "location" | "category" | "supplier" | "qr"; // ← "qr" を追加
    values: string[];
  };
};

// 操作履歴（ジャーナル）
export type JournalEntry = {
  id?: string;
  sessionId: string;
  itemId: string;
  action: "create" | "update" | "delete" | "confirm" | "approve";
  oldQty: number | null;   // undefined ではなく null
  newQty: number | null;
  userId: string;
  createdAt: string;
};