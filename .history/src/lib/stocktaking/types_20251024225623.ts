// lib/stocktaking/types.ts
export type Item = {
  id: string;
  productId: string;
  name?: string;
  systemQty: number;
  countedQty?: number;
  location?: string;
  category?: string;
  supplier?: string;
};

export type SessionMeta = {
  sessionId: string;
  type: "full" | "partial";
  target?: {
    mode: "location" | "category" | "supplier";
    values: string[];
  };
};