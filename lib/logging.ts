// lib/logging.ts
import { db } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

export const logAction = async (
  uid: string | null,
  userName: string,
  role: string | null,
  action: string,
  details: any = {}
) => {
  try {
    await addDoc(collection(db, "auditLogs"), {
      uid: uid || "unknown",
      userName,
      role: role || "guest",
      action,
      details,
      timestamp: serverTimestamp(),
    });
  } catch (err) {
    console.error("監査ログ記録に失敗しました", err);
  }
};