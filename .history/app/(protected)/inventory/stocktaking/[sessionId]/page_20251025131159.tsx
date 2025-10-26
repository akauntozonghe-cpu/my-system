"use client";

import { useParams, useSearchParams, useRouter } from "next/navigation";
import FullStocktaking from "./FullStocktaking";
import PartialStocktaking from "./PartialStocktaking";
import ResumeStocktaking from "./ResumeStocktaking";
import ImportStocktaking from "./ImportStocktaking"; // ← 同じフォルダなので ./ に統一

export default function StocktakingSessionPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const mode =
    (searchParams.get("mode") as "resume" | "full" | "partial" | "import") ??
    "resume";

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">
          {mode === "resume" && "途中の棚卸を再開"}
          {mode === "full" && "一斉棚卸"}
          {mode === "partial" && "部分棚卸"}
          {mode === "import" && "読込棚卸"}
        </h1>
        <button
          onClick={() => router.push("/inventory/stocktaking")}
          className="px-4 py-2 bg-gray-500 text-white rounded"
        >
          ← 戻る
        </button>
      </div>

      {mode === "resume" && <ResumeStocktaking sessionId={sessionId!} />}
      {mode === "full" && <FullStocktaking sessionId={sessionId!} />}
      {mode === "partial" && <PartialStocktaking sessionId={sessionId!} />}
      {mode === "import" && <ImportStocktaking sessionId={sessionId!} />}
    </div>
  );
}