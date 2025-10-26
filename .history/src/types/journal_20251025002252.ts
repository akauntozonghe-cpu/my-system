import { db } from "@lib/firebase";
import { collection, addDoc, onSnapshot, query, orderBy, Timestamp } from "firebase/firestore";
import { useEffect, useState } from "react";
import { JournalEntry } from "@lib/stocktaking/types";

export function useJournal(sessionId: string) {
  const [entries, setEntries] = useState<JournalEntry[]>([]);

  useEffect(() => {
    if (!sessionId) return;
    const q = query(
      collection(db, "stocktakingSessions", sessionId, "journals"),
      orderBy("createdAt", "desc")
    );
    const unsub = onSnapshot(q, (snap) => {
      setEntries(snap.docs.map((doc) => ({ id: doc.id, ...doc.data() } as JournalEntry)));
    });
    return () => unsub();
  }, [sessionId]);

  return entries;
}

export async function addJournalEntry(
  sessionId: string,
  entry: Omit<JournalEntry, "id" | "createdAt">
) {
  await addDoc(collection(db, "stocktakingSessions", sessionId, "journal"), {
    ...entry,
    oldQty: entry.oldQty ?? null,   // ← undefined を null に変換
    newQty: entry.newQty ?? null,   // ← 同じく
    createdAt: new Date().toISOString(),
  });
}