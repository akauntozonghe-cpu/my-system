// 商品アイテム
export type Item = {
  id: string;                  // Firestore doc.id
  productId: string;           // 商品コード（SKUなど）
  name?: string;               // 商品名（表示用）
  systemQty: number;           // システム上の在庫数
  countedQty: number | null;   // 実棚数: null=未入力, 0=在庫なし, >0=在庫あり

  // 検索キー関連
  barcode?: string;            // 実際に読み取るバーコード（スキャナ入力）
  janCode?: string;            // JANコード（検索キーとして使用）

  // QRコード検索用
  location?: string;           // 保管場所（棚番号など）
  majorCategory?: string;      // 大分類
  minorCategory?: string;      // 小分類

  // 商品属性
  category?: string;           // 旧: 分類（大分類）→ majorCategory に統合推奨
  supplier?: string;           // 仕入れ先コード
  status?: "active" | "rejected" | "archived"; // 商品状態（棚卸対象かどうか）
  lotNo?: string;              // ロット番号（任意）
  expiry?: string;             // 賞味期限など（ISO形式）

  // 監査情報
  createdAt?: string;          // 登録日時（ISO形式）
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