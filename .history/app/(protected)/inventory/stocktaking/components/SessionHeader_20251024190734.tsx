type Props = {
  sessionId: string;
  progress?: number;
};

export default function SessionHeader({ sessionId, progress = 0 }: Props) {
  return (
    <header className="p-4 bg-gray-100 border-b flex justify-between">
      <div>
        <h1 className="font-bold">棚卸セッション</h1>
        <p>ID: {sessionId}</p>
      </div>
      <div>
        進捗: {progress}%
      </div>
    </header>
  );
}