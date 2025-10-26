export type Item = {
  id: string;            // Firestore doc.id
  productId: string;     // 商品コード
  name?: string;         // 商品名
  systemQty: number;     // システム数量
  countedQty?: number;   // 実在庫数
  location?: string;     // 保管場所
  category?: string;     // 分類
  supplier?: string;     // 仕入れ先
};

export type SessionMeta = {
  sessionId: string;
  type: "full" | "partial";
  target?: {
    mode: "location" | "category" | "supplier";
    values: string[];
  };
};

export type JournalEntry = {
  id?: string;
  sessionId: string;
  itemId: string;
  action: "create" | "update" | "delete" | "confirm" | "approve";
  oldQty: number | null;   // ← undefined ではなく null
  newQty: number | null;
  userId: string;
  createdAt: string;
};