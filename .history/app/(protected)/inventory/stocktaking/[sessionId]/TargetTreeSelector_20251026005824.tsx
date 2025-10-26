import { useState } from "react";

type Product = {
  id: string;
  name: string;
  location: string;
  categoryLarge: string;
  categorySmall: string;
  quantity: number;
  unit: string;
  janCode: string;
};

export type TargetState = {
  mode: "AND" | "OR";
  locations: string[];
  categoryLarge: string[];
  categorySmall: string[];
};

// ツリー構造の型定義
type TreeType = Record<
  string, // location
  Record<
    string, // categoryLarge
    Record<
      string, // categorySmall
      Product[]
    >
  >
>;

export function TargetTreeSelector({
  tree,
  target,
  onChange,
}: {
  tree: TreeType;
  target: TargetState;
  onChange: (nt: TargetState) => void;
}) {
  const selectedLoc = target.locations[0] ?? "";
  const selectedLarge = target.categoryLarge[0] ?? "";
  const selectedSmall = target.categorySmall[0] ?? "";

  return (
    <div className="space-y-4">
      {/* 保管場所 */}
      <div>
        <label className="block font-semibold mb-1">保管場所</label>
        <select
          value={selectedLoc}
          onChange={(e) => {
            const val = e.target.value;
            onChange({
              ...target,
              locations: val ? [val] : [],
              categoryLarge: [],
              categorySmall: [],
            });
          }}
          className="border rounded p-2 w-full"
        >
          <option value="">すべて</option>
          {Object.keys(tree).map((loc) => (
            <option key={loc} value={loc}>
              {loc}
            </option>
          ))}
        </select>
      </div>

      {/* 大分類 */}
      <div>
        <label className="block font-semibold mb-1">大分類</label>
        <select
          value={selectedLarge}
          onChange={(e) => {
            const val = e.target.value;
            onChange({
              ...target,
              categoryLarge: val ? [val] : [],
              categorySmall: [],
            });
          }}
          className="border rounded p-2 w-full"
          disabled={!selectedLoc}
        >
          <option value="">すべて</option>
          {selectedLoc &&
            Object.keys(tree[selectedLoc] ?? {}).map((large) => (
              <option key={large} value={large}>
                {large}
              </option>
            ))}
        </select>
      </div>

      {/* 小分類 */}
      <div>
        <label className="block font-semibold mb-1">小分類</label>
        <select
          value={selectedSmall}
          onChange={(e) => {
            const val = e.target.value;
            onChange({
              ...target,
              categorySmall: val ? [val] : [],
            });
          }}
          className="border rounded p-2 w-full"
          disabled={!selectedLoc || !selectedLarge}
        >
          <option value="">すべて</option>
          {selectedLoc &&
            selectedLarge &&
            Object.keys(tree[selectedLoc]?.[selectedLarge] ?? {}).map((small) => (
              <option key={small} value={small}>
                {small}
              </option>
            ))}
        </select>
      </div>
    </div>
  );
}