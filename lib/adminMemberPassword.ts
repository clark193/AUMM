import { EmailAuthProvider, reauthenticateWithCredential } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { getFirebaseServices } from "./firebase";

export async function setMemberPassword(memberId: string, password: string, administratorPassword: string) {
  const { auth, db } = getFirebaseServices();
  const actor = auth.currentUser;
  if (!actor?.email) throw new Error("Entre novamente com sua conta administrativa.");
  if (password.length < 8 || password.length > 128) throw new Error("Use de 8 a 128 caracteres.");
  if (!administratorPassword) throw new Error("Informe sua senha de login de administrador.");
  const url = (await getDoc(doc(db, "settings", "public"))).data()?.externalPushUrl;
  if (typeof url !== "string" || !/^https:\/\/[a-z0-9-]+\.onrender\.com\/?$/.test(url)) throw new Error("O servidor administrativo ainda não foi configurado.");
  try {
    await reauthenticateWithCredential(actor, EmailAuthProvider.credential(actor.email, administratorPassword));
  } catch (error) {
    const code = (error as { code?: string }).code;
    if (["auth/invalid-credential", "auth/wrong-password", "auth/invalid-login-credentials"].includes(code || "")) throw new Error("Sua senha de login de administrador está incorreta.");
    if (code === "auth/too-many-requests") throw new Error("Muitas tentativas. Aguarde um pouco antes de confirmar sua senha novamente.");
    throw error;
  }
  const result = await fetch(`${url.replace(/\/$/, "")}/admin/member-password`, { method: "POST", headers: { Authorization: `Bearer ${await actor.getIdToken(true)}`, "Content-Type": "application/json" }, body: JSON.stringify({ memberId, password }), signal: AbortSignal.timeout(90000) });
  const response: unknown = await result.json().catch(() => null);
  const message = response && typeof response === "object" && "message" in response && typeof response.message === "string" ? response.message : "";
  if (!result.ok) throw new Error(message || "Não foi possível alterar a senha.");
  return message || "Senha alterada.";
}
