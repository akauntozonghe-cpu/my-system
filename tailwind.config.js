// tailwind.config.js
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        gold: "#c5a64a",        // 高級感の金色（承認ボタンや強調ラベル）
        indigoDeep: "#3c4b9a",  // 未来感の藍色（ヘッダーや見出し）
        silver: "#c0c0c0",      // 儀式的な補助色（境界線や背景）
        crimson: "#a83232",     // 警告・エラー用の深紅
      },
      boxShadow: {
        luxe: "0 10px 30px rgba(0,0,0,0.12)",   // 儀式的な重厚感
        innerGlow: "inset 0 0 10px rgba(197,166,74,0.6)", // 金色の内側発光
      },
      borderRadius: {
        card: "1rem",     // カード用の角丸
        modal: "1.25rem", // モーダル用の角丸
      },
      fontFamily: {
        heading: ["'Noto Serif JP'", "serif"], // 儀式的な見出し用
        body: ["'Noto Sans JP'", "sans-serif"], // 読みやすい本文用
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: 0 },
          "100%": { opacity: 1 },
        },
        slideUp: {
          "0%": { transform: "translateY(20px)", opacity: 0 },
          "100%": { transform: "translateY(0)", opacity: 1 },
        },
      },
      animation: {
        fadeIn: "fadeIn 0.3s ease-out",
        slideUp: "slideUp 0.4s ease-out",
      },
    },
  },
  plugins: [],
};