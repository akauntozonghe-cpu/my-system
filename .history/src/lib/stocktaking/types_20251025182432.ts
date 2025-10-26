// 商品アイテム
export type Item = {
  id: string;                  // Firestore doc.id
  productId: string;           // 商品コード（SKUなど）
  name?: string;               // 商品名（表示用）
  systemQty: number;           // システム上の在庫数
  countedQty: number | null;   // 実棚数: null=未入力, 0=在庫なし, >0=在庫あり

  // 検索キー
  barcode?: string;            // 読み取る値（物理バーコード）
  janCode?: string;            // 検索キー（JANコード）

  // QRコード検索用
  location?: string;           // 保管場所
  majorCategory?: string;      // 大分類
  minorCategory?: string;      // 小分類

  supplier?: string;           // 仕入れ先コード
  status?: "active" | "rejected" | "archived" | "counted"; // 棚卸状態
  lotNo?: string;              // ロット番号
  expiry?: string;             // 賞味期限（ISO形式）

  createdAt?: string | Date;   // 登録日時
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