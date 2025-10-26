import { Item, JournalEntry } from "@lib/stocktaking/types";
import { addDoc, collection } from "firebase/firestore";
import { db } from "@lib/firebase";

// 差分計算
export function calcDiff(item: Item): number | null {
  if (item.countedQty == null) return null;
  return item.countedQty - item.systemQty;
}

// ジャーナル記録
export async function recordJournal(
  entry: Omit<JournalEntry, "id" | "createdAt">
) {
  await addDoc(
    collection(db, "stocktakingSessions", entry.sessionId, "journal"),
    {
      ...entry,
      createdAt: new Date().toISOString(),
    }
  );
}