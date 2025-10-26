// app/(protected)/inventory/stocktaking/[sessionId]/TargetTreeSelector.tsx
import { useState, useRef, useEffect } from "react";

type TargetState = {
  mode: "AND" | "OR";
  locations: string[];
  categoryLarge: string[];
  categorySmall: string[];
};

export function TargetTreeSelector({
  tree,
  target,
  onChange,
}: {
  tree: any;
  target: TargetState;
  onChange: (nt: TargetState) => void;
}) {
  const [openLocations, setOpenLocations] = useState<{ [loc: string]: boolean }>({});
  const [openLarge, setOpenLarge] = useState<{ [key: string]: boolean }>({});

  function SelectAllList({
    options,
    selected,
    onToggle,
  }: {
    options: string[];
    selected: string[];
    onToggle: (val: string, checked: boolean) => void;
  }) {
    const allSelected = options.length > 0 && options.every(o => selected.includes(o));
    const someSelected = options.some(o => selected.includes(o)) && !allSelected;

    const ref = useRef<HTMLInputElement>(null);
    useEffect(() => {
      if (ref.current) ref.current.indeterminate = someSelected;
    }, [someSelected]);

    return (
      <div className="ml-4">
        <label className="block font-semibold">
          <input
            ref={ref}
            type="checkbox"
            checked={allSelected}
            onChange={(e) => {
              const checked = e.target.checked;
              options.forEach(o => onToggle(o, checked));
            }}
          /> すべて選択
        </label>
        {options.map(opt => (
          <label key={opt} className="block">
            <input
              type="checkbox"
              checked={selected.includes(opt)}
              onChange={(e) => onToggle(opt, e.target.checked)}
            /> {opt}
          </label>
        ))}
      </div>
    );
  }

  return (
    <div>
      {Object.entries(tree).map(([loc, largeMap]) => (
        <div key={loc} className="border rounded mb-2">
          {/* 保管場所 */}
          <div
            className="flex justify-between items-center bg-gray-100 px-2 py-1 cursor-pointer"
            onClick={() => setOpenLocations(prev => ({ ...prev, [loc]: !prev[loc] }))}
          >
            <label className="font-semibold">
              <input
                type="checkbox"
                checked={target.locations.includes(loc)}
                onChange={(e) => {
                  const checked = e.target.checked;
                  const newLocs = checked
                    ? [...target.locations, loc]
                    : target.locations.filter(l => l !== loc);
                  onChange({ ...target, locations: newLocs });
                }}
              /> {loc}
            </label>
            <span>{openLocations[loc] ? "▲" : "▼"}</span>
          </div>

          {/* 大分類 */}
          {openLocations[loc] && (
            <div className="ml-6 mt-1">
              <SelectAllList
                options={Object.keys(largeMap)}
                selected={target.categoryLarge}
                onToggle={(val, checked) => {
                  const newLarge = checked
                    ? [...target.categoryLarge, val]
                    : target.categoryLarge.filter(c => c !== val);
                  onChange({ ...target, categoryLarge: newLarge });
                }}
              />

              {Object.entries(largeMap).map(([large, smallMap]) => {
                const key = `${loc}-${large}`;
                return (
                  <div key={large} className="ml-4 border-l pl-2 mt-2">
                    <div
                      className="flex justify-between cursor-pointer"
                      onClick={() => setOpenLarge(prev => ({ ...prev, [key]: !prev[key] }))}
                    >
                      <label>
                        <input
                          type="checkbox"
                          checked={target.categoryLarge.includes(large)}
                          onChange={(e) => {
                            const checked = e.target.checked;
                            const newLarge = checked
                              ? [...target.categoryLarge, large]
                              : target.categoryLarge.filter(c => c !== large);
                            onChange({ ...target, categoryLarge: newLarge });
                          }}
                        /> {large}
                      </label>
                      <span>{openLarge[key] ? "▲" : "▼"}</span>
                    </div>

                    {/* 小分類 */}
                    {openLarge[key] && (
                      <div className="ml-6 mt-1">
                        <SelectAllList
                          options={Object.keys(smallMap)}
                          selected={target.categorySmall}
                          onToggle={(val, checked) => {
                            const newSmall = checked
                              ? [...target.categorySmall, val]
                              : target.categorySmall.filter(s => s !== val);
                            onChange({ ...target, categorySmall: newSmall });
                          }}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}