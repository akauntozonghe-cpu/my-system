// app/(protected)/inventory/stocktaking/components/Checklist.tsx

export default function Checklist() {
  return (
    <div className="w-1/2 p-4 border-l">
      <h2 className="text-lg font-bold">チェックリスト</h2>
      <ul className="mt-2 list-disc list-inside">
        <li>商品A ✅ (-2)</li>
        <li>商品B ✅ (+2)</li>
        <li>商品C ⬜ 未</li>
        <li>商品D ⬜ 未</li>
      </ul>
    </div>
  );
}