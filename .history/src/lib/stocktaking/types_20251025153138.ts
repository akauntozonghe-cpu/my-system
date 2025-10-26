// 商品アイテム
export type Item = {
  id: string;            // Firestore doc.id
  productId: string;     // 商品コード
  name?: string;         // 商品名
  systemQty: number;     // システム数量
  countedQty: number | null; // 実在庫数: null=未入力, 0=在庫なし, >0=在庫あり
  location?: string;     // 保管場所
  category?: string;     // 分類
  supplier?: string;     // 仕入れ先
  barcode?: string;      // バーコード
};

// 棚卸しセッションのメタ情報
export type SessionMeta = {
  sessionId: string;
  type: "full" | "partial" | "import"; // import も追加
  target?: {
    mode: "location" | "category" | "supplier" | "qr"; // "qr" も追加
    values: string[];
  };
};

// 操作履歴（ジャーナル）
export type JournalEntry = {
  id?: string;
  sessionId: string;
  itemId: string;
  action: "create" | "update" | "delete" | "confirm" | "approve";
  oldQty: number | null; // null = 未入力
  newQty: number | null; // null = 未入力
  userId: string;
  createdAt: string;     // ISO文字列
};