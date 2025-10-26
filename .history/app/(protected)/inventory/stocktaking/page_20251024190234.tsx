"use client";

import { useEffect, useState } from "react";
import { db } from "@lib/firebase";
import { collection, onSnapshot } from "firebase/firestore";

import ScanPanel from "./components/ScanPanel";
import Checklist from "./components/Checklist";
import DiffTabs from "./components/DiffTabs";
import AiPanel from "./components/AiPanel";
import SessionHeader from "./components/SessionHeader";

type Item = {
  productId: string;
  name?: string;
  systemQty: number;
  countedQty?: number;
};

export default function StocktakingPage() {
  const [items, setItems] = useState<Item[]>([]);
  const sessionId = "20251024-001";

  useEffect(() => {
    const q = collection(db, "stocktakingSessions", sessionId, "sessionItems");
    const unsub = onSnapshot(q, (snap) => {
      setItems(snap.docs.map((doc) => doc.data() as Item));
    });
    return () => unsub();
  }, [sessionId]);

  return (
    <div className="flex flex-col h-screen">
      <SessionHeader sessionId={sessionId} progress={items.length} />
      <main className="flex flex-1">
        <ScanPanel sessionId={sessionId} />
        <Checklist items={items} />
        <DiffTabs items={items} />
      </main>
      <section className="border-t">
        <AiPanel items={items} />
      </section>
    </div>
  );
}