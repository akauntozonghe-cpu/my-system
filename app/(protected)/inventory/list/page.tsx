"use client";

import { useEffect, useState } from "react";
import { db } from "src/lib/firebase";
import {
  getFirestore,
  collection,
  query,
  where,
  getDocs,
  orderBy,
  updateDoc,
  doc,
  addDoc,
  deleteDoc,
  serverTimestamp,
  setDoc
} from "firebase/firestore";
import { logAction } from "src/lib/logging";

type Item = {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  status: string;
  expiry?: string;
  createdAt?: any;
};

export default function ItemListPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [role, setRole] = useState<string | null>(null);
  const uid =
    typeof window !== "undefined" ? localStorage.getItem("uid") : null;
  const userName =
    typeof window !== "undefined" ? localStorage.getItem("userName") : null;

  // ロールを localStorage から取得
  useEffect(() => {
    if (typeof window !== "undefined") {
      setRole(localStorage.getItem("role"));
    }
  }, []);

  // Firestore からデータ取得
  useEffect(() => {
    const fetchItems = async () => {
      if (!role) return;

      try {
        let q;
        if (role === "manager") {
          // 管理者 → 全件
          q = query(collection(db, "items"), orderBy("createdAt", "desc"));
        } else {
          // 責任者 → 承認済みのみ
          q = query(
            collection(db, "items"),
            where("status", "==", "approved"),
            orderBy("createdAt", "desc")
          );
        }

        const snap = await getDocs(q);
        const data = snap.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Item[];

        setItems(data);
      } catch (err) {
        console.error("Firestore取得エラー:", err);
      }
    };

    fetchItems();
  }, [role]);

  // 承認処理
  const handleApprove = async (id: string, name: string) => {
    try {
      const itemRef = doc(db, "items", id);
      await updateDoc(itemRef, { status: "approved" });

      await logAction(uid, userName || "unknown", role, "approve_item", {
        itemId: id,
        name,
        newStatus: "approved",
      });

      setItems((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, status: "approved" } : item
        )
      );
    } catch (err) {
      console.error("承認エラー:", err);
    }
  };

  // 差し戻し処理
  const handleReject = async (id: string, name: string) => {
    try {
      const itemRef = doc(db, "items", id);
      await updateDoc(itemRef, { status: "rejected" });

      await logAction(uid, userName || "unknown", role, "reject_item", {
        itemId: id,
        name,
        newStatus: "rejected",
      });

      setItems((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, status: "rejected" } : item
        )
      );
    } catch (err) {
      console.error("差し戻しエラー:", err);
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold mb-4">商品一覧</h1>
      <table className="w-full border-collapse border">
        <thead>
          <tr className="bg-gray-100">
            <th className="border px-2 py-1">品名</th>
            <th className="border px-2 py-1">数量</th>
            <th className="border px-2 py-1">期限</th>
            <th className="border px-2 py-1">状態</th>
            {role === "manager" && (
              <th className="border px-2 py-1">操作</th>
            )}
          </tr>
        </thead>
        <tbody>
          {items.length === 0 ? (
            <tr>
              <td
                colSpan={role === "manager" ? 5 : 4}
                className="text-center py-4 text-gray-500"
              >
                データがありません
              </td>
            </tr>
          ) : (
            items.map((item) => (
              <tr key={item.id}>
                <td className="border px-2 py-1">{item.name}</td>
                <td className="border px-2 py-1">
                  {item.quantity} {item.unit}
                </td>
                <td className="border px-2 py-1">{item.expiry || "-"}</td>
                <td
                  className={`border px-2 py-1 ${
                    item.status === "pending"
                      ? "text-orange-600"
                      : item.status === "approved"
                      ? "text-green-600"
                      : "text-red-600"
                  }`}
                >
                  {item.status === "pending"
                    ? "承認待ち"
                    : item.status === "approved"
                    ? "承認済み"
                    : "差し戻し"}
                </td>
                {role === "manager" && (
                  <td className="border px-2 py-1 space-x-2">
                    {item.status === "pending" && (
                      <>
                        <button
                          onClick={() => handleApprove(item.id, item.name)}
                          className="px-2 py-1 bg-green-500 text-white rounded"
                        >
                          承認
                        </button>
                        <button
                          onClick={() => handleReject(item.id, item.name)}
                          className="px-2 py-1 bg-red-500 text-white rounded"
                        >
                          差し戻し
                        </button>
                      </>
                    )}
                  </td>
                )}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}