import { EmailAuthProvider, reauthenticateWithCredential } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { getFirebaseServices } from "./firebase";

export async function saveMemberProfile(memberId: string, updates: Record<string, string>, expectedVersion: number | null, administratorPassword: string) {
  const { auth, db } = getFirebaseServices();
  const actor = auth.currentUser;
  if (!actor?.email) throw new Error("Entre novamente com sua conta administrativa.");
  const url = (await getDoc(doc(db, "settings", "public"))).data()?.externalPushUrl;
  if (typeof url !== "string" || !/^https:\/\/[a-z0-9-]+\.onrender\.com\/?$/.test(url)) throw new Error("O servidor administrativo ainda não foi configurado.");
  if (administratorPassword) {
    try { await reauthenticateWithCredential(actor, EmailAuthProvider.credential(actor.email, administratorPassword)); }
    catch { throw new Error("Não foi possível confirmar sua senha de administrador."); }
  }
  const response = await fetch(`${url.replace(/\/$/, "")}/admin/member-profile`, {
    method: "POST", headers: { Authorization: `Bearer ${await actor.getIdToken(true)}`, "Content-Type": "application/json" },
    body: JSON.stringify({ memberId, updates, expectedVersion }), signal: AbortSignal.timeout(90000),
  });
  const payload: unknown = await response.json().catch(() => null);
  const result = payload && typeof payload === "object" ? payload as Record<string, unknown> : null;
  if (!response.ok) throw new Error(typeof result?.message === "string" ? result.message : (response.status === 404 ? "O servidor está sendo atualizado. Aguarde um momento e tente novamente." : "Não foi possível atualizar o cadastro."));
  if (typeof result?.updatedAtMillis !== "number") throw new Error("Reabra o cadastro para confirmar os dados salvos.");
  return { message: String(result.message || "Cadastro atualizado."), updatedAtMillis: result.updatedAtMillis };
}
