import { useState, useRef, useEffect } from "react";

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
  selectedPaths: string[][]; // [["倉庫A","食品","飲料"], ["倉庫B","日用品"]]
};

// 汎用ツリーノード型
type TreeNode = {
  children?: Record<string, TreeNode>;
  products?: Product[];
};

type TreeType = Record<string, TreeNode>;

// 再帰的に描画するコンポーネント
function TreeNodeView({
  label,
  node,
  path,
  target,
  onChange,
}: {
  label: string;
  node: TreeNode;
  path: string[];
  target: TargetState;
  onChange: (nt: TargetState) => void;
}) {
  const [open, setOpen] = useState(false);

  // このノード配下が選択されているか判定
  const isSelected = target.selectedPaths.some(
    (p) => p.length === path.length && p.every((seg, i) => seg === path[i])
  );

  const toggleSelect = (checked: boolean) => {
    let newPaths = [...target.selectedPaths];
    if (checked) {
      newPaths.push(path);
    } else {
      newPaths = newPaths.filter(
        (p) => !(p.length === path.length && p.every((seg, i) => seg === path[i]))
      );
    }
    onChange({ ...target, selectedPaths: newPaths });
  };

  return (
    <div className="ml-4">
      <div
        className="flex justify-between items-center cursor-pointer"
        onClick={() => setOpen(!open)}
      >
        <label>
          <input
            type="checkbox"
            checked={isSelected}
            onChange={(e) => toggleSelect(e.target.checked)}
          />{" "}
          {label}
        </label>
        {node.children && <span>{open ? "▲" : "▼"}</span>}
      </div>

      {open && node.children && (
        <div className="ml-6 mt-1">
          {Object.entries(node.children).map(([childLabel, childNode]) => (
            <TreeNodeView
              key={childLabel}
              label={childLabel}
              node={childNode}
              path={[...path, childLabel]}
              target={target}
              onChange={onChange}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function TargetTreeSelector({
  tree,
  target,
  onChange,
}: {
  tree: TreeType;
  target: TargetState;
  onChange: (nt: TargetState) => void;
}) {
  return (
    <div>
      {Object.entries(tree).map(([label, node]) => (
        <TreeNodeView
          key={label}
          label={label}
          node={node}
          path={[label]}
          target={target}
          onChange={onChange}
        />
      ))}
    </div>
  );
}