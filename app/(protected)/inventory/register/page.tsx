"use client";

import Link from "next/link";

export default function RegisterModeSelector() {
  return (
    <div className="p-6 space-y-6">
      <h2 className="text-xl font-bold">登録モードを選択してください</h2>
      <div className="flex gap-6">
        <Link
          href="/inventory/register/single"
          className="px-6 py-3 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          単数登録
        </Link>
        <Link
          href="/inventory/register/multiple"
          className="px-6 py-3 bg-green-600 text-white rounded hover:bg-green-700"
        >
          複数登録
        </Link>
      </div>
    </div>
  );
}