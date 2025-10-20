"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, query, orderBy, getDocs } from "firebase/firestore";

type AuditLog = {
  id: string;
  uid: string;
  userName: string;
  role: string;
  action: string;
  details: any;
  timestamp: any;
};

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);

  useEffect(() => {
    const fetchLogs = async () => {
      const q = query(collection(db, "auditLogs"), orderBy("timestamp", "desc"));
      const snap = await getDocs(q);
      const data = snap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as AuditLog[];
      setLogs(data);
    };
    fetchLogs();
  }, []);

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold mb-4">監査ログ一覧</h1>
      <table className="w-full border-collapse border">
        <thead>
          <tr className="bg-gray-100">
            <th className="border px-2 py-1">日時</th>
            <th className="border px-2 py-1">ユーザーID</th>
            <th className="border px-2 py-1">名前</th>
            <th className="border px-2 py-1">役割</th>
            <th className="border px-2 py-1">操作</th>
            <th className="border px-2 py-1">詳細</th>
          </tr>
        </thead>
        <tbody>
          {logs.map((log) => (
            <tr key={log.id}>
              <td className="border px-2 py-1">
                {log.timestamp?.toDate().toLocaleString("ja-JP")}
              </td>
              <td className="border px-2 py-1">{log.uid}</td>
              <td className="border px-2 py-1">{log.userName}</td>
              <td className="border px-2 py-1">{log.role}</td>
              <td className="border px-2 py-1">{log.action}</td>
              <td className="border px-2 py-1">
                {JSON.stringify(log.details)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}