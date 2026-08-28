import { addDoc, collection, doc, getDoc, serverTimestamp } from "firebase/firestore";
import { getFirebaseServices } from "./firebase";

export type AuditInput = { action: string; resource: string; resourceId: string; description: string; metadata?: Record<string, string | number | boolean | null> };

export async function writeAdminAudit(input: AuditInput) {
  const { auth, db } = getFirebaseServices(); const user = auth.currentUser;
  if (!user) return;
  const [access, member] = await Promise.all([getDoc(doc(db, "adminRoles", user.uid)), getDoc(doc(db, "associados", user.uid))]);
  await addDoc(collection(db, "auditLogs"), {
    ...input,
    actorUid: user.uid,
    actorName: String(access.data()?.fullName || member.data()?.fullName || user.displayName || user.email || "Usuário"),
    actorEmail: String(access.data()?.email || user.email || ""),
    actorRole: String(access.data()?.role || member.data()?.role || "Associado"),
    actorLevel: Number(access.data()?.level || 0),
    timestamp: serverTimestamp(),
  });
}
