"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { db } from "@lib/firebase";
import { doc, getDoc, collection, getDocs, query, orderBy } from "firebase/firestore";

type Session = {
  type: "full" | "partial";
  status: string;
  createdAt: string;
};

type Item = {
  id: string;
  name: string;
  expectedQty: number;
  countedQty: number | null;
};

type Journal = {
  id: string;
  action: string;
  userId: string;
  createdAt: string;
};

export default function StocktakingSessionPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const [session, setSession] = useState<Session | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [journal, setJournal] = useState<Journal[]>([]);

  useEffect(() => {
    if (!sessionId) return;

    const load = async () => {
      // セッション情報
      const sessionSnap = await getDoc(doc(db, "stocktakingSessions", sessionId));
      if (sessionSnap.exists()) {
        setSession(sessionSnap.data() as Session);
      }

      // アイテム一覧
      const itemsSnap = await getDocs(
        collection(db, "stocktakingSessions", sessionId, "items")
      );
      setItems(itemsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Item)));

      // ジャーナル
      const journalSnap = await getDocs(
        query(
          collection(db, "stocktakingSessions", sessionId, "journal"),
          orderBy("createdAt", "asc")
        )
      );
      setJournal(journalSnap.docs.map(d => ({ id: d.id, ...d.data() } as Journal)));
    };

    load();
  }, [sessionId]);

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">棚卸セッション {sessionId}</h1>

      {session && (
        <div className="p-4 border rounded">
          <p>種別: {session.type === "full" ? "一斉棚卸" : "部分棚卸"}</p>
          <p>状態: {session.status}</p>
          <p>開始日時: {new Date(session.createdAt).toLocaleString("ja-JP")}</p>
        </div>
      )}

      <div>
        <h2 className="text-lg font-semibold">棚卸対象</h2>
        <table className="w-full border">
          <thead>
            <tr>
              <th>商品</th>
              <th>予定数量</th>
              <th>実棚数量</th>
            </tr>
          </thead>
          <tbody>
            {items.map(item => (
              <tr key={item.id}>
                <td>{item.name}</td>
                <td>{item.expectedQty}</td>
                <td>{item.countedQty ?? "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div>
        <h2 className="text-lg font-semibold">操作履歴</h2>
        <ul className="list-disc pl-6">
          {journal.map(j => (
            <li key={j.id}>
              {j.createdAt} - {j.userId} が {j.action}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}