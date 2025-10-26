export type Item = {
  id: string;                  // Firestore doc.id
  productId: string;           // 商品コード（SKUなど）
  name?: string;               // 商品名（表示用）
  systemQty: number;           // システム上の在庫数
  countedQty: number | null;   // 実棚数: null=未入力, 0=在庫なし, >0=在庫あり
  location?: string;           // 保管場所（棚番号など）
  category?: string;           // 分類（大分類）
  supplier?: string;           // 仕入れ先コード
  barcode?: string;            // 実際に読み取るバーコード（スキャナ入力）
  janCode?: string;            // JANコード（検索キーとして使用）
  status?: "active" | "rejected" | "archived"; // 商品状態（棚卸対象かどうか）
  lotNo?: string;              // ロット番号（任意）
  expiry?: string;             // 賞味期限など（ISO形式）
  createdAt?: string;          // 登録日時（ISO形式）
  createdBy?: {
    uid: string;
    role: "admin" | "responsible" | "viewer";
    username?: string;
  };
};