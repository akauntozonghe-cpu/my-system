// lib/firebase.ts
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAh4NelYVsR40H0s2dWWAiLYa6Tisjb24U",
  authDomain: "my-system-1cb39.firebaseapp.com",
  projectId: "my-system-1cb39",
  storageBucket: "my-system-1cb39.appspot.com", // ← 修正
  messagingSenderId: "761518014871",
  appId: "1:761518014871:web:1d8fb270e92ceb487b44d2",
  measurementId: "G-PGDGT35PTM"
};

// すでに初期化済みならそれを使う
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

const db = getFirestore(app);

export { app, db };