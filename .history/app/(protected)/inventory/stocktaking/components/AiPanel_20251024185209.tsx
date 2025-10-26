"use client";

import { useEffect, useState } from "react";

type Suggestion = {
  message: string;
  severity: "info" | "warning" | "critical";
};

export default function AiPanel() {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);

  useEffect(() => {
    // 仮のロジック：ここで差異データを受け取り、AI APIやローカル関数で分析
    const mock: Suggestion[] = [
      { message: "在庫不足の商品が3件あります。発注を検討してください。", severity: "warning" },
      { message: "過剰在庫の商品が2件あります。セールや出品強化を検討してください。", severity: "info" },
    ];
    setSuggestions(mock);
  }, []);

  return (
    <div className="p-4 bg-gray-50">
      <h2 className="text-lg font-bold">AI提案</h2>
      <ul className="mt-2 space-y-1">
        {suggestions.map((s, idx) => (
          <li
            key={idx}
            className={
              s.severity === "critical"
                ? "text-red-600"
                : s.severity === "warning"
                ? "text-yellow-600"
                : "text-blue-600"
            }
          >
            {s.message}
          </li>
        ))}
      </ul>
    </div>
  );
}