// src/hooks/useJournal.ts
"use client";

import { useEffect, useState } from "react";
import { db } from "@/src/lib/firebase";
import {
  collection,
  addDoc,
  onSnapshot,
  query,
  orderBy,
  Timestamp,
} from "firebase/firestore";

export type JournalEntry = {
  id?: string;
  sessionId: string;
  itemId: string;
  action: "create" | "update" | "delete";
  oldValue?: number;
  newValue?: number;
  userId: string;
  createdAt: string;
};

export function useJournal(sessionId: string) {
  const [entries, setEntries] = useState<JournalEntry[]>([]);

  useEffect(() => {
    if (!sessionId) return;

    const q = query(
      collection(db, "stocktakingSessions", sessionId, "journals"),
      orderBy("createdAt", "desc")
    );

    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map(
        (doc) => ({ id: doc.id, ...doc.data() } as JournalEntry)
      );
      setEntries(data);
    });

    return () => unsub();
  }, [sessionId]);

  return entries;
}

export async function addJournalEntry(
  sessionId: string,
  entry: Omit<JournalEntry, "id" | "createdAt">
) {
  await addDoc(collection(db, "stocktakingSessions", sessionId, "journals"), {
    ...entry,
    createdAt: Timestamp.now().toDate().toISOString(),
  });
}