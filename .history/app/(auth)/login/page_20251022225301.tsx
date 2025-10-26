"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { getFirestore, collection, query, where, getDocs } from "firebase/firestore";
import { app } from "@lib/firebase";
import { useHeader } from "@context/HeaderContext"; // Context

const db = getFirestore(app);

export default function LoginPage() {
  const router = useRouter();
  const { setHeaderInfo } = useHeader(); // Context から setter を取得
  const [id, setId] = useState("");
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!id) {
      setError("番号を入力してください");
      return;
    }

    try {
      const q = query(collection(db, "users"), where("id", "==", id));
      const snap = await getDocs(q);

      if (!snap.empty) {
        const userDoc = snap.docs[0];
        const uid = userDoc.id;
        const userData = userDoc.data();

        // セッション有効期限（例: 30分）
        const maxSessionMinutes = 30;
        const expiresAt = Date.now() + maxSessionMinutes * 60 * 1000;

        // Context に保存（全画面で参照可能に）
        setHeaderInfo({
        role: userData.role || "user",
        userName: userData.name || "",
        expiresAt,
      });

        // localStorage にも保存（リロード対策）
        localStorage.setItem("uid", uid);
        localStorage.setItem("userName", userData.name || "");
        localStorage.setItem("role", userData.role || "user");
        localStorage.setItem("expiresAt", String(expiresAt));

        // ホームへ遷移
        router.push("/home");
      } else {
        setError("資格者番号が無効です");
      }
    } catch (err) {
      console.error(err);
      setError("認証処理でエラーが発生しました");
    }
  };

  return (
    <main className="min-h-screen bg-gray-100 flex items-center justify-center px-6">
      <form
        onSubmit={handleLogin}
        className="w-[360px] bg-white border rounded-2xl shadow-xl p-8 space-y-6"
      >
        {/* ロゴと説明 */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-extrabold tracking-wide text-gray-800">
            MY-SYSTEM
          </h1>
          <p className="text-gray-600 text-sm">資格者専用システムへようこそ</p>
        </div>

        {/* 入力フォーム */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">
            責任者番号／管理者番号
          </label>
          <input
            type="text"
            value={id}
            onChange={(e) => setId(e.target.value)}
            placeholder="例: 1011"
            className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
        </div>

        {/* エラーメッセージ */}
        {error && <p className="text-red-500 text-sm">{error}</p>}

        {/* ボタン */}
        <button type="submit" className="btn-primary w-full">
          ログイン
        </button>

        {/* セキュリティ表示 */}
        <div className="text-xs text-gray-400 text-center space-y-1">
          <p>監査ログ記録中</p>
          <p>暗号化通信</p>
        </div>
      </form>
    </main>
  );
}