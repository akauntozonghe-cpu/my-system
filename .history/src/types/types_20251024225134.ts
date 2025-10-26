// 商品情報（棚卸対象）
export type Item = {
  id: string;               // Firestore の doc.id
  productId: string;        // JANコードなど
  name?: string;            // 商品名
  systemQty: number;        // システム上の在庫数
  countedQty?: number;      // 実棚卸数（未入力なら undefined）
  location?: string;        // 保管場所（例：倉庫A-棚1）
  category?: string;        // 大分類（例：食品、衣料）
  supplier?: string;        // 仕入れ先
};

// 棚卸セッションのメタ情報
export type SessionMeta = {
  sessionId: string;        // セッションID（例：20251024-001）
  type: "full" | "partial"; // 一斉 or 部分棚卸
  target?: {
    mode: "location" | "category" | "supplier"; // 部分棚卸の対象軸
    values: string[];       // 対象値（例：["倉庫A-棚1", "倉庫A-棚2"]）
  };
};

// ジャーナル（日誌）記録
export type JournalEntry = {
  productId: string;
  oldQty: number | null;    // 登録前の数量（null許容）
  newQty: number;           // 登録後の数量
  reason?: string;          // 差異理由（任意）
  evidence?: string[];      // 写真・音声URL（任意）
  approvedBy?: string;      // 承認者ID（任意）
  timestamp: Date;
};