"use client";

import { db } from "@lib/firebase";
import {
  collection,
  addDoc,
  onSnapshot,
  query,
  orderBy,
  Timestamp,
} from "firebase/firestore";
import { useEffect, useState } from "react";

/**
 * JournalEntry 型
 * Firestore は undefined を保存できないので、必ず null 許容にする
 */
export type JournalEntry = {
  id?: string;
  sessionId: string;
  itemId: string;
  action: "create" | "update" | "delete" | "confirm" | "approve";
  oldQty: number | null;
  newQty: number | null;
  userId: string;
  createdAt: string;
};

/**
 * undefined を null に変換するユーティリティ
 */
function sanitize<T>(obj: T): T {
  return JSON.parse(
    JSON.stringify(obj, (_, v) => (v === undefined ? null : v))
  );
}

/**
 * 指定セッションの Journal を購読する Hook
 */
export function useJournal(sessionId: string) {
  const [entries, setEntries] = useState<JournalEntry[]>([]);

  useEffect(() => {
    if (!sessionId) return;
    const q = query(
      collection(db, "stocktakingSessions", sessionId, "journals"),
      orderBy("createdAt", "desc")
    );
    const unsub = onSnapshot(q, (snap) => {
      setEntries(
        snap.docs.map(
          (doc) => ({ id: doc.id, ...doc.data() } as JournalEntry)
        )
      );
    });
    return () => unsub();
  }, [sessionId]);

  return entries;
}

/**
 * Journal に新しいエントリを追加する
 */
export async function addJournalEntry(
  sessionId: string,
  entry: Omit<JournalEntry, "id" | "createdAt">
) {
  const safeEntry: JournalEntry = {
    ...entry,
    oldQty: entry.oldQty ?? null,
    newQty: entry.newQty ?? null,
    createdAt: new Date().toISOString(),
  };

  await addDoc(
    collection(db, "stocktakingSessions", sessionId, "journals"),
    sanitize(safeEntry)
  );
}