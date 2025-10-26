import { db } from "@lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";

export async function updateItemCount(sessionId: string, productId: string, countedQty: number) {
  const ref = doc(db, "stocktakingSessions", sessionId, "sessionItems", productId);
  const snap = await getDoc(ref);
  const data = snap.data();
  const oldQty = data?.countedQty;

  await setDoc(ref, {
    ...data,
    countedQty,
  });

  await setDoc(
    doc(db, "stocktakingSessions", sessionId, "journal", `${Date.now()}`),
    {
      productId,
      oldQty: oldQty ?? null,
      newQty: countedQty,
      timestamp: new Date(),
    }
  );
}