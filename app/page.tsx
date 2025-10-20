import Link from "next/link";

export default function Home() {
  return (
    <main className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
      <div className="p-10 bg-white rounded-lg shadow text-center">
        <h1 className="text-3xl font-bold mb-4">MY-SYSTEM</h1>
        <p className="mb-6 text-gray-700">資格者専用システムへようこそ</p>
        <Link href="/login">
          <button className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
            ログイン画面へ
          </button>
        </Link>
      </div>
    </main>
  );
}