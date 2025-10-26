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
      <SessionHeader />
      <main className="flex flex-1">
        <ScanPanel />
        <Checklist items={items} />   {/* ← props で渡す */}
        <DiffTabs items={items} />    {/* ← props で渡す */}
      </main>
      <section className="border-t">
        <AiPanel items={items} />     {/* ← 将来的に差異分析用に渡す */}
      </section>
    </div>
  );
}