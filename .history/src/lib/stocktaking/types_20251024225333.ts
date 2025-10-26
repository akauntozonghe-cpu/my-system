import { db } from "@lib/firebase";
import { collection, doc, setDoc, getDocs, query, where } from "firebase/firestore";
import { SessionMeta, Item } from "./types";

export async function createStocktakingSession(meta: SessionMeta) {
  const sessionRef = doc(db, "stocktakingSessions", meta.sessionId);
  await setDoc(sessionRef, {
    type: meta.type,
    target: meta.target ?? null,
    createdAt: new Date(),
  });

  const itemsRef = collection(db, "products");
  let q = itemsRef;

  if (meta.type === "partial" && meta.target) {
    q = query(itemsRef, where(meta.target.mode, "in", meta.target.values));
  }

  const snap = await getDocs(q);
  const batchItems = snap.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
    countedQty: undefined,
  }));

  const sessionItemsRef = collection(db, "stocktakingSessions", meta.sessionId, "sessionItems");
  for (const item of batchItems) {
    await setDoc(doc(sessionItemsRef, item.id), item);
  }
}