"use client";

import Link from "next/link";

export default function AdminPage() {
  return (
    <div className="p-6">
      <h1 className="text-xl font-bold mb-4">管理者メニュー</h1>
      <ul className="space-y-2">
        <li>
          <Link
            href="/admin/logs"
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            監査ログを見る
          </Link>
        </li>
        {/* 他の管理者機能もここに追加 */}
      </ul>
    </div>
  );
}