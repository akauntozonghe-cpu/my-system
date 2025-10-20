export default function DashboardPage() {
  return (
    <main className="p-6 grid grid-cols-3 gap-6">
      <section className="p-6 border rounded-lg shadow bg-white">在庫情報</section>
      <section className="p-6 border rounded-lg shadow bg-white">フリマ情報</section>
      <section className="p-6 border rounded-lg shadow bg-white">期限の近いもの</section>
      <section className="p-6 border rounded-lg shadow bg-white">トレンド情報</section>
      <section className="p-6 border rounded-lg shadow bg-white">AI提案</section>
      <section className="p-6 border rounded-lg shadow bg-white">今日やること</section>
    </main>
  );
}