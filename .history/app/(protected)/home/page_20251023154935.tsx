import Header from "@components/Header";
import InventoryCard from "@components/cards/InventoryCard";
import MarketCard from "@components/cards/MarketCard";
import DeadlinesCard from "@components/cards/DeadlinesCard";
import TrendsCard from "@components/cards/TrendsCard";
import AICard from "@components/cards/AICard";
import CalendarCard from "@components/cards/CalendarCard";
import TasksCard from "@components/cards/TasksCard";

export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col bg-gray-50">
      {/* 玉座の上部 */}
      <Header />

      {/* ダッシュボード領域 */}
      <section className="flex-1 p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <InventoryCard />
        <MarketCard />
        <DeadlinesCard />
        <TrendsCard />
        <AICard />
        <CalendarCard />
        <TasksCard />
      </section>

      {/* フッター */}
      <footer className="text-center text-xs text-gray-400 py-4 border-t">
        <p>© 2025 MY-SYSTEM — 資格者の誇りと秩序を守る</p>
        <p>v0.1.0</p>
      </footer>
    </main>
  );
}