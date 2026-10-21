import { EmailAuthProvider, reauthenticateWithCredential } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { getFirebaseServices } from "./firebase";

export async function setMemberPassword(memberId: string, password: string, administratorPassword: string) {
  const { auth, db } = getFirebaseServices();
  const actor = auth.currentUser;
  if (!actor?.email) throw new Error("Entre novamente com sua conta administrativa.");
  if (password.length < 12 || password.length > 128 || !/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/[0-9]/.test(password)) throw new Error("Use ao menos 12 caracteres com maiúscula, minúscula e número.");
  const url = (await getDoc(doc(db, "settings", "public"))).data()?.externalPushUrl;
  if (typeof url !== "string" || !/^https:\/\/[a-z0-9-]+\.onrender\.com\/?$/.test(url)) throw new Error("O servidor administrativo ainda não foi configurado.");
  await reauthenticateWithCredential(actor, EmailAuthProvider.credential(actor.email, administratorPassword));
  const result = await fetch(`${url.replace(/\/$/, "")}/admin/member-password`, { method: "POST", headers: { Authorization: `Bearer ${await actor.getIdToken(true)}`, "Content-Type": "application/json" }, body: JSON.stringify({ memberId, password }), signal: AbortSignal.timeout(90000) });
  const response: unknown = await result.json().catch(() => null);
  const message = response && typeof response === "object" && "message" in response && typeof response.message === "string" ? response.message : "";
  if (!result.ok) throw new Error(message || "Não foi possível alterar a senha.");
  return message || "Senha alterada.";
}
