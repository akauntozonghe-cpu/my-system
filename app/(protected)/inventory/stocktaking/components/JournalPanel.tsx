"use client";

import { useJournal } from "@hooks/useJournal";

type Props = { sessionId: string };

export default function JournalPanel({ sessionId }: Props) {
  const entries = useJournal(sessionId);

  return (
    <div className="p-4 bg-gray-50">
      <h2 className="text-lg font-bold">操作履歴</h2>
      <ul className="mt-2 space-y-1 text-sm">
        {entries.map((e) => (
          <li key={e.id} className="border-b pb-1">
            <span className="font-mono text-xs text-gray-500">{e.createdAt}</span>
            <br />
            {e.userId} が {e.action} を実行
            {e.oldValue !== undefined && ` (旧: ${e.oldValue})`}
            {e.newValue !== undefined && ` (新: ${e.newValue})`}
          </li>
        ))}
      </ul>
    </div>
  );
}