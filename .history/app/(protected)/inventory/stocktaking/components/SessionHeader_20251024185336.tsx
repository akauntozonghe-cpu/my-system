"use client";

type Props = {
  sessionId?: string;
  date?: string;
  progress?: number; // 0〜100
};

export default function SessionHeader({
  sessionId = "20251024-001",
  date = "2025-10-24",
  progress = 0,
}: Props) {
  return (
    <header className="flex items-center justify-between p-4 bg-gray-100 border-b">
      <div>
        <h1 className="text-xl font-bold">棚卸セッション</h1>
        <p className="text-sm text-gray-600">
          ID: {sessionId} ／ 日付: {date}
        </p>
      </div>
      <div className="flex items-center space-x-2">
        <span className="text-sm text-gray-700">進捗 {progress}%</span>
        <div className="w-32 bg-gray-300 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </header>
  );
}