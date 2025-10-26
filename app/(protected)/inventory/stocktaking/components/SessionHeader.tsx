"use client";

type Props = {
  sessionId: string;
  progress: number;
  total: number;
};

export default function SessionHeader({ sessionId, progress = 0 }: Props) {
  return (
    <header className="p-4 bg-gray-100 border-b flex justify-between">
      <div>
        <h1 className="font-bold">棚卸セッション</h1>
        <p>ID: {sessionId}</p>
      </div>
      <div className="flex items-center space-x-2">
        <span>進捗: {progress}%</span>
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