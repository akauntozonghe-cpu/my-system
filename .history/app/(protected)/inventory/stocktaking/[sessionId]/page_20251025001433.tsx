"use client";

import { useEffect, useState } from "react";
import { db } from "@lib/firebase";
import { collection, onSnapshot } from "firebase/firestore";

import { Item } from "@lib/stocktaking/types";
import SessionHeader from "../components/SessionHeader";
import ScanPanel from "../components/ScanPanel";
import Checklist from "../components/Checklist";
import DiffTabs from "../components/DiffTabs";
import AiPanel from "../components/AiPanel";
import JournalPanel from "../components/JournalPanel";

export default function StocktakingPage() {
  const [items, setItems] = useState<Item[]>([]);
  const sessionId = "20251024-001";

  useEffect(() => {
    const q = collection(db, "stocktakingSessions", sessionId, "sessionItems");
    const unsub = onSnapshot(q, (snap) => {
      setItems(snap.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Item)));
    });
    return () => unsub();
  }, [sessionId]);

  return (
    <div className="flex flex-col h-screen">
      <SessionHeader
        sessionId={sessionId}
        progress={items.filter((i) => i.countedQty !== undefined).length}
        total={items.length}
      />
      <main className="flex flex-1">
        <ScanPanel sessionId={sessionId} />
        <Checklist items={items} />
        <DiffTabs items={items} />
      </main>
      <section className="border-t">
        <AiPanel items={items} />
      </section>
      <section className="border-t">
        <JournalPanel sessionId={sessionId} />
      </section>
    </div>
  );
}