'use client';

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useHeader } from "@context/HeaderContext"; // ← named export ならこのまま
import { db } from "@lib/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

type ItemForm = {
  itemName: string;
  lotNo: string;
  quantity: number;
  key: { [key: string]: any };
};

export default function SingleRegisterPage() {
  const router = useRouter();
  const { role, userName } = useHeader(); // ← role と userName を取得

  const [step, setStep] = useState<"input" | "preview">("input");
  const [form, setForm] = useState<ItemForm>({
    itemName: "",
    lotNo: "",
    quantity: 1,
    key: {},
  });
  const [lastData, setLastData] = useState<ItemForm | null>(null);
  const [highlightFields, setHighlightFields] = useState<string[]>([]);

  // 入力変更
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  // 登録ボタン → プレビューへ
  const handlePreview = () => {
    if (lastData) {
      const changed = Object.keys(form).filter(
        (k) => (form as any)[k] !== (lastData as any)[k]
      );
      setHighlightFields(changed);
    } else {
      setHighlightFields([]);
    }
    setLastData(form);
    setStep("preview");
  };

  // 確定送信
  const handleSubmit = async () => {
    try {
      const status = role === "manager" ? "approved" : "pending";
      await addDoc(collection(db, "items"), {
        ...form,
        createdBy: userName,
        status,
        createdAt: serverTimestamp(),
      });
      alert("1件を登録しました");
      router.push("/inventory/list");
    } catch (err) {
      console.error(err);
      alert("登録に失敗しました");
    }
  };

  // 入力フォーム
  if (step === "input") {
    return (
      <div className="p-6 space-y-4">
        <h2 className="font-bold">単数登録</h2>
        <input
          name="itemName"
          value={form.itemName}
          onChange={handleChange}
          placeholder="商品名"
          className="border p-2 w-full"
        />
        <input
          name="lotNo"
          value={form.lotNo}
          onChange={handleChange}
          placeholder="LotNo"
          className="border p-2 w-full"
        />
        <input
          name="quantity"
          type="number"
          value={form.quantity}
          onChange={handleChange}
          placeholder="数量"
          className="border p-2 w-full"
        />

        <div className="flex gap-4 mt-6">
          <button
            onClick={() => router.back()}
            className="px-4 py-2 bg-gray-200 rounded"
          >
            戻る
          </button>
          <button
            onClick={handlePreview}
            className="px-4 py-2 bg-blue-600 text-white rounded"
          >
            登録
          </button>
        </div>
      </div>
    );
  }

  // プレビュー画面
  if (step === "preview" && lastData) {
    return (
      <div className="p-6">
        <h2 className="font-bold mb-4">登録内容プレビュー</h2>
        <ul>
          {Object.entries(form).map(([k, v]) => {
            const isHighlighted = highlightFields.includes(k);
            return (
              <li
                key={k}
                className={
                  isHighlighted
                    ? "bg-yellow-50 border-l-4 border-yellow-400 pl-2"
                    : ""
                }
              >
                {k}: {String(v)}
              </li>
            );
          })}
        </ul>
        <div className="flex gap-4 mt-6">
          <button
            onClick={() => setStep("input")}
            className="px-4 py-2 bg-gray-200 rounded"
          >
            修正
          </button>
          <button
            onClick={handleSubmit}
            className="px-4 py-2 bg-blue-600 text-white rounded"
          >
            確定
          </button>
        </div>
      </div>
    );
  }

  return null;
}