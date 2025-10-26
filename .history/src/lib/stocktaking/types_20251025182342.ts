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
  status?: "active" | "rejected" | "archived" | "counted";
  lotNo?: string;
  expiry?: string;
  createdAt?: string | Date;
  createdBy?: {
    uid: string;
    role: "admin" | "responsible" | "viewer";
    username?: string;
  };
};

// 棚卸しセッションのメタ情報
export type SessionMeta = {
  sessionId: string;
  type: "full" | "partial" | "import";
  target?: {
    mode: "location" | "majorCategory" | "minorCategory" | "supplier" | "qr";
    values: string[];
  };
};

// 操作履歴（ジャーナル）
export type JournalEntry = {
  id?: string;
  sessionId: string;
  itemId: string;
  action:
    | "create"
    | "update"
    | "delete"
    | "confirm"
    | "approve"
    | "scan-error"
    | "count"
    | "rescan";
  oldQty: number | null;
  newQty: number | null;
  userId: string;
  createdAt: string | Date;
  note?: string;
  meta?: Record<string, any>;
};