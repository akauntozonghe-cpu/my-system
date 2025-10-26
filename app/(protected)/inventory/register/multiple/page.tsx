"use client";

import { useEffect, useState } from "react";
import { db } from "src/lib/firebase"; // tsconfig.json の paths に合わせる
import {
  getFirestore,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";
import { useRouter } from "next/navigation";
import Quagga, { QuaggaResult } from "quagga";

const fieldDefinitionsJP: Record<string, string> = {
  managementNumber: "管理番号",
  managementGroupNumber: "管理区別番号",
  janCode: "JANコード",
  lotNo: "Lot.No／製造番号",
  company: "会社名",
  name: "品名",
  location: "保管場所",
  categoryLarge: "大分類",
  categorySmall: "小分類",
  expireAt: "期限",
  quantity: "数量",
  unit: "単位",
  unitCustom: "単位（その他）",
  photos: "写真",
};

export default function MultipleRegisterPage({ userRole = "responsible" }) {
  const router = useRouter();

  const [step, setStep] = useState<"input" | "confirm" | "preview">("input");
  const [history, setHistory] = useState<string[]>([]);
  const [entryCount, setEntryCount] = useState(0);
  const [items, setItems] = useState<any[]>([]);
  const [clearFields, setClearFields] = useState<string[]>([]);

  const [form, setForm] = useState<any>({
    managementNumber: "",
    managementGroupNumber: "",
    janCode: "",
    lotNo: "",
    company: "",
    name: "",
    location: "",
    categoryLarge: "",
    categorySmall: "",
    expireAt: "",
    quantity: "",
    unit: "個",
    unitCustom: "",
    photos: [] as File[],
  });

  // スキャナ用 state
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scanTarget, setScanTarget] = useState<string | null>(null);

  // スキャナ起動
  const startScanner = (field: string) => {
    setScanTarget(field);
    setScannerOpen(true);

    setTimeout(() => {
      Quagga.init(
        {
          inputStream: {
            type: "LiveStream",
            target: document.querySelector("#scanner") as HTMLDivElement,
            constraints: { facingMode: "environment" },
          },
          decoder: { readers: ["ean_reader", "code_128_reader"] },
        },
        (err) => {
          if (err) {
            console.error(err);
            return;
          }
          Quagga.start();
        }
      );

          Quagga.onDetected((result: any) => {
      if (scanTarget && result.codeResult?.code) {
        setForm((prev: any) => ({
          ...prev,
          [scanTarget]: result.codeResult.code,
        }));
      }
      Quagga.stop();
      setScannerOpen(false);
    });
    }, 300);
  };

  // ステップ遷移
  const goToStep = (next: "input" | "confirm" | "preview") => {
    setHistory((prev) => [...prev, step]);
    setStep(next);
  };
  const goBack = () => {
    setHistory((prev) => {
      const last = prev[prev.length - 1];
      if (last) setStep(last as any);
      return prev.slice(0, -1);
    });
  };

  // 入力変更
  const handleChange = (e: any) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  // 写真選択
  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setForm((prev: any) => ({ ...prev, photos: files }));
  };

  // 管理区別番号の自動生成
  useEffect(() => {
    if (form.janCode && form.lotNo) {
      setForm((prev: any) => ({
        ...prev,
        managementGroupNumber: `${form.janCode}-${form.lotNo}`,
      }));
    }
  }, [form.janCode, form.lotNo]);

  // 管理番号のリアルタイム割り当て
  useEffect(() => {
    const assignManagementNumber = async () => {
      if (!form.managementGroupNumber) return;
      const q = query(
        collection(db, "products"),
        where("managementGroupNumber", "==", form.managementGroupNumber),
        orderBy("managementNumber", "desc"),
        limit(1)
      );
      const snap = await getDocs(q);
      let suffix = 1;
      if (!snap.empty) {
        const last = snap.docs[0].data().managementNumber;
        const num = parseInt(last.split("-").pop() || "0", 10);
        suffix = num + 1;
      }
      setForm((prev: any) => ({
        ...prev,
        managementNumber: `${form.managementGroupNumber}-${suffix}`,
      }));
    };
    assignManagementNumber();
  }, [form.managementGroupNumber]);

  // 保存処理
  const saveItems = async () => {
    const promises = items.map((item) =>
      addDoc(collection(db, "products"), {
        ...item,
        unit: item.unit === "その他" ? item.unitCustom : item.unit,
        status: userRole === "manager" ? "approved" : "pending",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    );
    await Promise.all(promises);
    alert("登録が完了しました");
    router.push("/inventory/list");
  };

  // --- 入力画面 ---
  if (step === "input") {
    return (
      <div className="p-6">
        <h2 className="text-xl font-bold">複数登録</h2>
        <h3 className="text-lg font-semibold mb-4">{entryCount + 1}件目</h3>

        <table className="w-full border-collapse">
          <tbody>
            {/* 管理番号 */}
            <tr>
              <th className="p-2 border bg-gray-100 w-40">管理番号</th>
              <td className="p-2 border">
                <input
                  type="text"
                  name="managementNumber"
                  value={form.managementNumber}
                  onChange={handleChange}
                  placeholder="未入力なら自動割り当て"
                  className="border p-1 w-full"
                />
              </td>
            </tr>

            {/* 管理区別番号 */}
            <tr>
              <th className="p-2 border bg-gray-100">管理区別番号</th>
              <td className="p-2 border">
                <input
                  type="text"
                  name="managementGroupNumber"
                  value={form.managementGroupNumber}
                  onChange={handleChange}
                  placeholder="JAN + LotNo、自動生成可"
                  className="border p-1 w-full"
                />
              </td>
            </tr>

            {/* JANコード */}
            <tr>
              <th className="p-2 border bg-gray-100">JANコード</th>
              <td className="p-2 border flex items-center gap-2">
                <input
                  type="text"
                  name="janCode"
                  value={form.janCode}
                  onChange={handleChange}
                  placeholder="バーコード／手入力"
                  className="border p-1 w-full"
                />
                <button
                  type="button"
                  onClick={() => startScanner("janCode")}
                  className="px-2 py-1 text-xs bg-indigo-600 text-white rounded"
                >
                  スキャン開始
                </button>
              </td>
            </tr>

            {/* LotNo */}
            <tr>
              <th className="p-2 border bg-gray-100">
                Lot.No／製造番号 <span className="text-red-500">必須</span>
              </th>
              <td className="p-2 border">
                <input
                  type="text"
                  name="lotNo"
                  value={form.lotNo}
                  onChange={handleChange}
                  className="border p-1 w-full"
                  required
                />
              </td>
            </tr>

            {/* 会社名 */}
            <tr>
              <th className="p-2 border bg-gray-100">会社名</th>
              <td className="p-2 border">
                <input
                  type="text"
                  name="company"
                  value={form.company}
                  onChange={handleChange}
                  className="border p-1 w-full"
                />
              </td>
            </tr>

            {/* 品名 */}
            <tr>
              <th className="p-2 border bg-gray-100">
                品名 <span className="text-red-500">必須</span>
              </th>
              <td className="p-2 border">
                <input onChange={handleChange}
                  className="border p-1 w-full"
                  required
                />
              </td>
            </tr>

            {/* 保管場所 */}
            <tr>
              <th className="p-2 border bg-gray-100">保管場所</th>
              <td className="p-2 border flex items-center gap-2">
                <input
                  type="text"
                  name="location"
                  value={form.location}
                  onChange={handleChange}
                  placeholder="QR／手入力"
                  className="border p-1 w-full"
                />
                <button
                  type="button"
                  onClick={() => startScanner("location")}
                  className="px-2 py-1 text-xs bg-indigo-600 text-white rounded"
                >
                  スキャン開始
                </button>
              </td>
            </tr>

            {/* 大分類 */}
            <tr>
              <th className="p-2 border bg-gray-100">大分類</th>
              <td className="p-2 border flex items-center gap-2">
                <input
                  type="text"
                  name="categoryLarge"
                  value={form.categoryLarge}
                  onChange={handleChange}
                  className="border p-1 w-full"
                />
                <button
                  type="button"
                  onClick={() => startScanner("categoryLarge")}
                  className="px-2 py-1 text-xs bg-indigo-600 text-white rounded"
                >
                  スキャン開始
                </button>
              </td>
            </tr>

            {/* 小分類 */}
            <tr>
              <th className="p-2 border bg-gray-100">小分類</th>
              <td className="p-2 border flex items-center gap-2">
                <input
                  type="text"
                  name="categorySmall"
                  value={form.categorySmall}
                  onChange={handleChange}
                  className="border p-1 w-full"
                />
                <button
                  type="button"
                  onClick={() => startScanner("categorySmall")}
                  className="px-2 py-1 text-xs bg-indigo-600 text-white rounded"
                >
                  スキャン開始
                </button>
              </td>
            </tr>

            {/* 写真 */}
            <tr>
              <th className="p-2 border bg-gray-100">写真</th>
              <td className="p-2 border">
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handlePhotoChange}
                  className="mb-2"
                />
                <div className="flex gap-2 mt-2 flex-wrap">
                  {Array.isArray(form.photos) &&
                    form.photos.slice(0, 5).map((file: File, idx: number) => (
                      <img
                        key={idx}
                        src={URL.createObjectURL(file)}
                        alt={`preview-${idx}`}
                        className="w-20 h-20 object-cover border"
                      />
                    ))}
                  {Array.isArray(form.photos) && form.photos.length > 5 && (
                    <span className="text-sm text-gray-500">
                      +{form.photos.length - 5}枚
                    </span>
                  )}
                </div>
              </td>
            </tr>

            {/* 期限 */}
            <tr>
              <th className="p-2 border bg-gray-100">期限</th>
              <td className="p-2 border">
                <input
                  type="date"
                  name="expireAt"
                  value={form.expireAt}
                  onChange={handleChange}
                  className="border p-1"
                />
              </td>
            </tr>

            {/* 数量 */}
            <tr>
              <th className="p-2 border bg-gray-100">
                数量 <span className="text-red-500">必須</span>
              </th>
              <td className="p-2 border flex items-center gap-2">
                <input
                  type="number"
                  name="quantity"
                  value={form.quantity}
                  onChange={handleChange}
                  className="border p-1 w-32"
                  required
                />
                <select
                  name="unit"
                  value={form.unit}
                  onChange={handleChange}
                  className="border p-1"
                >
                  <option>個</option>
                  <option>袋</option>
                  <option>枚</option>
                  <option>箱</option>
                  <option>パック</option>
                  <option>セット</option>
                  <option>本</option>
                  <option>包</option>
                  <option>その他</option>
                </select>
                {form.unit === "その他" && (
                  <input
                    type="text"
                    name="unitCustom"
                    value={form.unitCustom}
                    onChange={handleChange}
                    placeholder="自由入力"
                    className="border p-1 ml-2"
                  />
                )}
              </td>
            </tr>
          </tbody>
        </table>

        {/* 管理者専用編集UI */}
        {userRole === "manager" && (
          <div className="border p-4 rounded bg-gray-50 mt-6">
            <h3 className="font-semibold mb-2">管理者設定</h3>
            {["janCode", "location", "categoryLarge", "categorySmall"].map(
              (fieldKey) => (
                <div key={fieldKey} className="mb-3">
                  <span className="font-medium mr-2">
                    {fieldDefinitionsJP[fieldKey]}
                  </span>
                  <label className="mr-2">
                    <input type="radio" name={`${fieldKey}-type`} defaultChecked />
                    テキスト
                  </label>
                  <label>
                    <input type="radio" name={`${fieldKey}-type`} />
                    スキャナ
                  </label>
                  <label className="ml-4">
                    <input type="checkbox" />
                    必須
                  </label>
                </div>
              )
            )}
          </div>
        )}

        {/* ボタン群 */}
        <div className="flex gap-4 mt-6">
          <button onClick={goBack} className="px-4 py-2 bg-gray-200 rounded">
            戻る
          </button>
          <button
            onClick={() => goToStep("confirm")}
            className="px-4 py-2 bg-green-600 text-white rounded"
          >
            次へ
          </button>
          <button
            onClick={() => {
              setItems((prev) => [...prev, { ...form }]);
              goToStep("preview");
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded"
          >
            登録
          </button>
        </div>

        {/* スキャナモーダル */}
        {scannerOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
            <div className="bg-white p-4 rounded shadow-lg w-96 relative">
              <h2 className="text-lg font-bold mb-2">バーコードスキャン</h2>
              <div id="scanner-container" className="w-full h-64 bg-black"></div>
              <button
                onClick={() => {
                  Quagga.stop();
                  setScannerOpen(false);
                }}
                className="absolute top-2 right-2 px-2 py-1 bg-red-500 text-white rounded"
              >
                閉じる
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // --- 確認画面 ---
  if (step === "confirm") {
    return (
      <div className="p-6">
        <h2 className="text-lg font-bold mb-2">{entryCount + 1}件目の入力項目確認</h2>
        <p className="text-sm text-gray-600 mb-4">
          チェックを入れた項目は次の入力時にクリアされます。<br />
          「すべてクリア」を押すと一度にすべてのチェックを入れることができます。
        </p>
        <button
          onClick={() => {
            if (clearFields.length === Object.keys(form).length) {
              setClearFields([]);
            } else {
              setClearFields(Object.keys(form));
            }
          }}
          className="px-2 py-1 text-xs bg-red-500 text-white rounded mb-2"
        >
          すべてクリア
        </button>

        <ul className="space-y-1">
          {Object.entries(form).map(([k, v]) => (
            <li key={k} className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={clearFields.includes(k)}
                onChange={() => {
                setClearFields((prev) =>
                  prev.includes(k) ? prev.filter((f) => f !== k) : [...prev, k]
                );
              }}
              />
              <span className="w-40 font-medium">{fieldDefinitionsJP[k] ?? k}</span>
              {k === "photos" && Array.isArray(v) ? (
                <div className="flex gap-2">
                  {v.map((file: File, idx: number) => (
                    <img
                      key={idx}
                      src={URL.createObjectURL(file)}
                      alt={`preview-${idx}`}
                      className="w-16 h-16 object-cover border"
                    />
                  ))}
                </div>
              ) : (
                <span>{String(v)}</span>
              )}
            </li>
          ))}
        </ul>

        <div className="flex gap-4 mt-6">
          <button onClick={goBack} className="px-4 py-2 bg-gray-200 rounded">
            戻る
          </button>
          <button
            onClick={() => {
              const newForm = { ...form };
              clearFields.forEach((f) => (newForm as any)[f] = "");
              setItems((prev) => [...prev, { ...form }]);
              setForm(newForm);
              setEntryCount((prev) => prev + 1);
              setClearFields([]);
              goToStep("input");
            }}
            className="px-4 py-2 bg-green-600 text-white rounded"
          >
            OK
          </button>
        </div>
      </div>
    );
  }

  // --- プレビュー画面 ---
  if (step === "preview") {
    return (
      <div className="p-6">
        <h2 className="text-xl font-bold mb-4">全件プレビュー</h2>

        {items.map((item, idx) => (
          <div key={idx} className="border p-4 mb-4 rounded bg-white shadow">
            <h3 className="font-semibold mb-2">{idx + 1}件目</h3>

            {Object.entries(item).map(([k, v]) => {
              if (k === "_history") return null;
              const label = fieldDefinitionsJP[k] ?? k;
              const oldValue = item._history?.[k];
              const changed = oldValue !== undefined && oldValue !== v;

              return (
                <div key={k} className="flex gap-2 mb-1">
                  <span className="w-40 font-medium">{label}</span>
                  {k === "photos" && Array.isArray(v) ? (
                    <div className="flex gap-2">
                      {v.map((file: File, pi: number) => (
                        <img
                          key={pi}
                          src={URL.createObjectURL(file)}
                          alt={`preview-${pi}`}
                          className="w-16 h-16 object-cover border"
                        />
                      ))}
                    </div>
                  ) : (
                    <span className={changed ? "bg-yellow-100 px-1 rounded" : ""}>
                      {String(v)}
                    </span>
                  )}
                  {changed && (
                    <span className="text-xs text-gray-500 line-through ml-2">
                      {String(oldValue)}
                    </span>
                  )}
                </div>
              );
            })}

            <div className="flex gap-2 mt-2">
              <button
                onClick={() => {
                  const target = items[idx];
                  setForm({ ...target, _history: { ...target } });
                  setItems((prev) => prev.filter((_, i) => i !== idx));
                  goToStep("input");
                }}
                className="px-2 py-1 bg-yellow-500 text-white rounded"
              >
                修正
              </button>
            </div>
          </div>
        ))}

        <div className="flex gap-4 mt-6">
          <button
            onClick={goBack}
            className="px-4 py-2 bg-gray-200 rounded"
          >
            戻る
          </button>
          <button
            onClick={saveItems}
            className="px-4 py-2 bg-blue-600 text-white rounded"
          >
            確定送信
          </button>
        </div>
      </div>
    );
  }

  return null; // 念のためフォールバック
}