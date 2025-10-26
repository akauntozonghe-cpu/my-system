import ScanPanel from "./components/ScanPanel";
import Checklist from "./components/Checklist";
import DiffTabs from "./components/DiffTabs";
import AiPanel from "./components/AiPanel";
import SessionHeader from "./components/SessionHeader";

export default function StocktakingPage() {
  return (
    <div className="flex flex-col h-screen">
      <SessionHeader />
      <main className="flex flex-1">
        <ScanPanel />
        <Checklist />
      </main>
      <section className="border-t">
        <DiffTabs />
        <AiPanel />
      </section>
    </div>
  );
}