"use client";

type Props = {
  onSelect: (range: string) => void;
};

export default function PartialStocktakingSelector({ onSelect }: Props) {
  return (
    <div className="space-y-4 border p-4 rounded">
      <p>部分棚卸 - QRコードまたは選択肢で範囲を決定してください</p>

      {/* QRコード読み取り */}
      <div>
        <h2 className="font-semibold">QRコードで範囲指定</h2>
        <button
          onClick={() => onSelect("倉庫A")}
          className="px-4 py-2 bg-green-600 text-white rounded"
        >
          QRコードを読み取る
        </button>
      </div>

      {/* 選択肢から範囲指定 */}
      <div>
        <h2 className="font-semibold">選択肢から範囲指定</h2>
        <select
          onChange={(e) => e.target.value && onSelect(e.target.value)}
          className="border p-2 rounded"
        >
          <option value="">選択してください</option>
          <option value="倉庫A">倉庫A</option>
          <option value="倉庫B">倉庫B</option>
          <option value="大分類X">大分類X</option>
          <option value="小分類Y">小分類Y</option>
        </select>
      </div>
    </div>
  );
}