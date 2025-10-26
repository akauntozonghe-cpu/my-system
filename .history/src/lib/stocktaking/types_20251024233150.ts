// lib/stocktaking/types.ts
export type Item = {
  id: string;            // Firestore doc.id
  productId: string;     // 商品コード
  name?: string;         // 商品名（任意）
  systemQty: number;     // システム数量
  countedQty?: number;   // 実際に数えた数量（棚卸）
  location?: string;     // 保管場所
  category?: string;     // 大分類/小分類
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

export type SessionMeta = {
  sessionId: string;
  type: "full" | "partial";
  target?: {
    mode: "location" | "category" | "supplier";
    values: string[];
  };
};