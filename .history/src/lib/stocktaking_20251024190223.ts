import { db } from "@lib/firebase";
import { doc, updateDoc, setDoc } from "firebase/firestore";

/**
 * 棚卸し数量を更新
 */
export async function updateItemCount(
  sessionId: string,
  productId: string,
  countedQty: number
) {
  const ref = doc(db, "stocktakingSessions", sessionId, "sessionItems", productId);
  await setDoc(ref, { countedQty }, { merge: true });
}

/**
 * ジャーナルに記録
 */
export async function addJournalEntry(
  sessionId: string,
  productId: string,
  userId: string,
  oldQty: number | undefined,
  newQty: number
) {
  const ref = doc(db, "stocktakingSessions", sessionId, "journal", `${Date.now()}`);
  await setDoc(ref, {
    productId,
    userId,
    oldQty,
    newQty,
    timestamp: new Date(),
  });
}