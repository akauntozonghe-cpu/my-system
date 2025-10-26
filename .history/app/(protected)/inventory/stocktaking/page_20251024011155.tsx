// app/(protected)/inventory/stocktaking/page.tsx

import ScanPanel from "./components/ScanPanel";
import Checklist from "./components/Checklist";
import DiffTabs from "./components/DiffTabs";
import AiPanel from "./components/AiPanel";
import SessionHeader from "./components/SessionHeader";

export default function StocktakingPage() {
  return (
    <div className="flex flex-col h-screen">
      {/* セッション情報ヘッダー */}
      <SessionHeader />

      {/* メイン作業エリア */}
      <main className="flex flex-1">
        <ScanPanel />
        <Checklist />
      </main>

      {/* 差異まとめ + AI提案 */}
      <section className="border-t">
        <DiffTabs />
        <AiPanel />
      </section>
    </div>
  );
}