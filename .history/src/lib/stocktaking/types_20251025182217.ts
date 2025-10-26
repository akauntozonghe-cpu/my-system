// 商品アイテム
export type Item = {
  id: string;
  productId: string;
  name?: string;
  systemQty: number;
  countedQty: number | null;

  // 検索キー
  barcode?: string;       // 読み取る値（物理バーコード）
  janCode?: string;       // 検索キー（JANコード）

  // QRコード検索用
  location?: string;
  majorCategory?: string;
  minorCategory?: string;

  supplier?: string;
  status?: "active" | "rejected" | "archived";
  lotNo?: string;
  expiry?: string;
  createdAt?: string;
  createdBy?: {
    uid: string;
    role: "admin" | "responsible" | "viewer";
    username?: string;
  };
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
  action: "create" | "update" | "delete" | "confirm" | "approve" | "scan-error"; // ← 追加
  oldQty: number | null;
  newQty: number | null;
  userId: string;
  createdAt: string;
  note?: string; // ← 任意の備考
  meta?: Record<string, any>; // ← 端末情報や追加データ
};