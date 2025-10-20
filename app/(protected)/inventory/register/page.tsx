"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useHeader } from "../../HeaderContext";
import { db } from "@/lib/firebase";
import {
  collection,
  addDoc,
  serverTimestamp,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import { BrowserMultiFormatReader } from "@zxing/library";

type ItemForm = {
  managementId: string;
  categoryId: string;
  location: string;
  majorCategory: string;
  minorCategory: string;
  janCode: string;
  company: string;
  name: string;
  lotNo: string;
  expiry: string;
  quantity: number;
  unit: string;
  inputMethod?: "manual_input" | "external_scanner" | "camera_scan";
};

export default function RegisterFlow() {
  const router = useRouter();
  const { setScreenTitle, role, userName } = useHeader();

  const [mode, setMode] = useState<"single" | "multiple" | null>(null);
  const [form, setForm] = useState<ItemForm>(initialForm());
  const [preview, setPreview] = useState(false);
  const [items, setItems] = useState<ItemForm[]>([]);
  const [scannerOpen, setScannerOpen] = useState<null | keyof ItemForm>(null);

  // 管理者編集モード用
  const [extraFields, setExtraFields] = useState<string[]>([]);

  useEffect(() => {
    setScreenTitle("商品登録フロー");
    return () => setScreenTitle("");
  }, [setScreenTitle]);

  function initialForm(): ItemForm {
    return {
      managementId: "",
      categoryId: "",
      location: "",
      majorCategory: "",
      minorCategory: "",
      janCode: "",
      company: "",
      name: "",
      lotNo: "",
      expiry: "",
      quantity: 1,
      unit: "個",
      inputMethod: "manual_input",
    };
  }

  // 入力変更
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm((prev) => {
      let updated = { ...prev, [name]: value };

      // categoryId 自動生成
      if (name === "janCode" || name === "lotNo") {
        if (updated.janCode && updated.lotNo) {
          updated.categoryId = `${updated.janCode}-${updated.lotNo}`;
        } else if (updated.janCode) {
          updated.categoryId = `${updated.janCode}-UNDEF`;
        } else if (updated.lotNo) {
          updated.categoryId = `UNDEF-${updated.lotNo}`;
        } else {
          updated.categoryId = `UNDEF-${Date.now()}`;
        }
      }

      // 外部スキャナ検知
      if (name === "janCode" && /^\d{8,13}$/.test(value)) {
        updated.inputMethod = "external_scanner";
      }

      return updated;
    });
  };

  // 管理番号ユニーク生成
const generateManagementId = async (categoryId: string): Promise<string> => {
  if (!categoryId) {
    return `UNDEF-${Date.now()}`; // categoryId が未確定なら暫定
  }

  // Firestore から同じ categoryId の管理番号を取得
  const q = query(collection(db, "items"), where("categoryId", "==", categoryId));
  const snapshot = await getDocs(q);
  const existingIds = snapshot.docs.map((doc) => doc.data().managementId as string);

  // まずは categoryId 自体を候補に
  let newId = categoryId;
  let counter = 1;

  // 既存と重複していたら -1, -2… を付与
  while (existingIds.includes(newId)) {
    newId = `${categoryId}-${counter}`;
    counter++;
  }

  return newId;
};

  // カメラスキャン（モーダル）
  const startCameraScan = async (field: keyof ItemForm) => {
    setScannerOpen(field);
    const codeReader = new BrowserMultiFormatReader();
    try {
      const result = await codeReader.decodeOnceFromVideoDevice(undefined, "videoElement");
      const scannedValue = result.getText();
      setForm((prev) => ({
        ...prev,
        [field]: scannedValue,
        inputMethod: "camera_scan",
        ...(field === "janCode" && prev.lotNo
          ? { categoryId: `${scannedValue}-${prev.lotNo}` }
          : {}),
      }));
      setScannerOpen(null);
    } catch (err) {
      console.error("Scan failed", err);
      alert("スキャンに失敗しました");
      setScannerOpen(null);
    }
  };

  const handlePreview = async () => {
    if (!form.name || !form.lotNo) {
      alert("必須項目（品名・Lot.No）を入力してください");
      return;
    }
    if (!form.managementId) {
      const newId = await generateManagementId(form.categoryId);
      setForm((prev) => ({ ...prev, managementId: newId }));
    }
    setPreview(true);
  };

  const handleSubmit = async (finalItems: ItemForm[]) => {
    try {
      for (const f of finalItems) {
        const status = role === "manager" ? "approved" : "pending";
        const docRef = await addDoc(collection(db, "items"), {
          ...f,
          createdBy: userName,
          status,
          createdAt: serverTimestamp(),
        });
        await addDoc(collection(db, "auditLogs"), {
          action: "register_item",
          itemId: docRef.id,
          user: userName,
          role,
          timestamp: serverTimestamp(),
          details: `status=${status}`,
          inputMethod: f.inputMethod,
        });
      }
      alert(`${finalItems.length}件の商品を送信しました`);
      setForm(initialForm());
      setItems([]);
      setMode(null);
      router.push("/inventory/list");
    } catch (err) {
      console.error(err);
      alert("登録に失敗しました");
    }
  };

  // 管理者編集モード操作
  const addField = (fieldName: string) => {
    setExtraFields((prev) => [...prev, fieldName]);
  };
  const removeField = (fieldName: string) => {
    setExtraFields((prev) => prev.filter((f) => f !== fieldName));
  };

  // --- 画面遷移 ---
  if (!mode) {
    return (
      <div className="p-6 space-y-4">
        <h2 className="text-lg font-bold">登録モード選択</h2>
        <button onClick={() => setMode("single")} className="px-4 py-2 bg-blue-600 text-white rounded">
          単数登録
        </button>
        <button onClick={() => setMode("multiple")} className="px-4 py-2 bg-green-600 text-white rounded">
          複数登録
        </button>
      </div>
    );
  }

  if (preview) {
    return (
      <div className="p-6 space-y-4">
        <h2 className="text-lg font-bold">プレビュー確認</h2>
        <ul className="space-y-1">
          {Object.entries(form).map(([k, v]) => (
            <li key={k}>
              {k}: {String(v)}
            </li>
          ))}
        </ul>
        <div className="flex gap-4 mt-4">
          <button onClick={() => setPreview(false)} className="px-4 py-2 bg-gray-200 rounded">
            修正
          </button>
          <button
            onClick={() => {
              if (mode === "single") {
                handleSubmit([form]);
              } else {
                setItems((prev) => [...prev, form]);
                setForm(initialForm());
                setPreview(false);
              }
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded"
          >
            {mode === "single" ? "登録確定" : "次へ"}
          </button>
        </div>
      </div>
    );
  }

  if (mode === "multiple" && items.length > 0 && form.name === "" && form.lotNo === "") {
    return (
      <div className="p-6 space-y-4">
        <h2 className="text-lg font-bold">複数登録プレビュー</h2>
        {items.map((it, idx) => (
          <div key={idx} className="border p-2">
            <strong>{idx + 1}件目</strong>
            <ul>
              {Object.entries(it).map(([k, v]) => (
                <li key={k}>
                  {k}: {String(v)}
                </li>
              ))}
            </ul>
          </div>
        ))}
        <div className="flex gap-4 mt-4">
          <button onClick={() => setForm(initialForm())} className="px-4 py-2 bg-gray-200 rounded">
            追加登録
          </button>
                    <button onClick={() => handleSubmit(items)} className="px-4 py-2 bg-blue-600 text-white rounded">
            全件確定
          </button>
        </div>
      </div>
    );
  }

  // 入力フォーム（入力しやすい順番）
  return (
    <div className="p-6 space-y-4">
      {/* 品名 */}
      <div>
        <label className="block font-medium">品名 (必須)</label>
        <input
          type="text"
          name="name"
          value={form.name}
          onChange={handleChange}
          className="border p-2 w-full"
          required
        />
      </div>

      {/* 会社名 */}
      <div>
        <label className="block font-medium">会社名</label>
        <input
          type="text"
          name="company"
          value={form.company}
          onChange={handleChange}
          className="border p-2 w-full"
        />
      </div>

      {/* JANコード */}
      <div>
        <label className="block font-medium">JANコード</label>
        <div className="flex gap-2">
          <input
            type="text"
            name="janCode"
            value={form.janCode}
            onChange={handleChange}
            className="border p-2 w-full"
            placeholder="スキャンまたは手入力"
          />
          <button
            type="button"
            onClick={() => startCameraScan("janCode")}
            className="px-2 py-1 bg-gray-300 rounded"
          >
            📷
          </button>
        </div>
      </div>

      {/* LotNo */}
      <div>
        <label className="block font-medium">Lot.No (必須)</label>
        <input
          type="text"
          name="lotNo"
          value={form.lotNo}
          onChange={handleChange}
          className="border p-2 w-full"
          required
        />
      </div>

      {/* 管理区別番号 */}
      <div>
        <label className="block font-medium">管理区別番号</label>
        <input
          type="text"
          name="categoryId"
          value={form.categoryId}
          onChange={handleChange}
          className="border p-2 w-full"
          placeholder="自動生成（編集可）"
        />
      </div>

      {/* 管理番号 */}
      <div>
        <label className="block font-medium">管理番号</label>
        <input
          type="text"
          name="managementId"
          value={form.managementId}
          onChange={handleChange}
          className="border p-2 w-full"
          placeholder="自動生成（編集可）"
        />
      </div>

      {/* 保管場所 */}
      <div>
        <label className="block font-medium">保管場所</label>
        <div className="flex gap-2">
          <input
            type="text"
            name="location"
            value={form.location}
            onChange={handleChange}
            className="border p-2 w-full"
            placeholder="スキャンまたは手入力"
          />
          <button
            type="button"
            onClick={() => startCameraScan("location")}
            className="px-2 py-1 bg-gray-300 rounded"
          >
            📷
          </button>
        </div>
      </div>

      {/* 大分類 */}
      <div>
        <label className="block font-medium">大分類</label>
        <div className="flex gap-2">
          <input
            type="text"
            name="majorCategory"
            value={form.majorCategory}
            onChange={handleChange}
            className="border p-2 w-full"
            placeholder="スキャンまたは手入力"
          />
          <button
            type="button"
            onClick={() => startCameraScan("majorCategory")}
            className="px-2 py-1 bg-gray-300 rounded"
          >
            📷
          </button>
        </div>
      </div>

      {/* 小分類 */}
      <div>
        <label className="block font-medium">小分類</label>
        <div className="flex gap-2">
          <input
            type="text"
            name="minorCategory"
            value={form.minorCategory}
            onChange={handleChange}
            className="border p-2 w-full"
            placeholder="スキャンまたは手入力"
          />
          <button
            type="button"
            onClick={() => startCameraScan("minorCategory")}
            className="px-2 py-1 bg-gray-300 rounded"
          >
            📷
          </button>
        </div>
      </div>

      {/* 期限 */}
      <div>
        <label className="block font-medium">期限</label>
        <input
          type="date"
          name="expiry"
          value={form.expiry}
          onChange={handleChange}
          className="border p-2 w-full"
        />
      </div>

      {/* 数量・単位 */}
      <div className="flex gap-2">
        <div className="flex-1">
          <label className="block font-medium">数量</label>
          <input
            type="number"
            name="quantity"
            value={form.quantity}
            onChange={handleChange}
            className="border p-2 w-full"
          />
        </div>
        <div>
          <label className="block font-medium">単位</label>
          <select
            name="unit"
            value={form.unit}
            onChange={handleChange}
            className="border p-2"
          >
            <option value="個">個</option>
            <option value="枚">枚</option>
            <option value="パック">パック</option>
            <option value="袋">袋</option>
            <option value="セット">セット</option>
            <option value="箱">箱</option>
            <option value="包">包</option>
            <option value="本">本</option>
          </select>
        </div>
      </div>

      {/* 管理者編集モード */}
      {role === "manager" && (
        <div className="mt-6 border-t pt-4">
          <h3 className="font-bold mb-2">管理者編集モード</h3>
          <button
            onClick={() => addField("supplierCode")}
            className="px-2 py-1 bg-green-500 text-white rounded mr-2"
          >
            項目追加
          </button>
          <button
            onClick={() => removeField("minorCategory")}
            className="px-2 py-1 bg-red-500 text-white rounded"
          >
            小分類を削除
          </button>
        </div>
      )}

      {/* ボタン群 */}
      <div className="flex justify-between mt-6">
        <button
          type="button"
          onClick={() => {
            const confirmed = window.confirm("入力内容は破棄されます。よろしいですか？");
            if (confirmed) {
              setForm(initialForm());
              setMode(null);
            }
          }}
          className="px-4 py-2 bg-gray-200 rounded"
        >
          戻る
        </button>
        <button
          type="button"
          onClick={handlePreview}
          className="px-4 py-2 bg-blue-600 text-white rounded"
        >
          登録
        </button>
      </div>

      {/* スキャナモーダル */}
      {scannerOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
          <div className="bg-white p-4 rounded shadow-lg relative w-96">
            <h2 className="text-lg font-bold mb-2">スキャナ</h2>
            <video id="videoElement" style={{ width: "100%" }} />
            <div className="flex justify-end mt-2">
              <button
                onClick={() => setScannerOpen(null)}
                className="px-3 py-1 bg-gray-300 rounded"
              >
                閉じる
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}