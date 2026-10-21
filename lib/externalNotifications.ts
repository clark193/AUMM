import type { Auth } from "firebase/auth";
import { doc, getDoc, type Firestore } from "firebase/firestore";

let lastWake = 0;
/** Solicitação sem conteúdo: nenhum cliente escolhe mensagem ou destinatário. */
export function wakeExternalNotifications({ auth, db }: { auth: Auth; db: Firestore }) {
  if (!auth.currentUser || Date.now() - lastWake < 10000) return;
  lastWake = Date.now();
  void (async () => {
    const url = (await getDoc(doc(db, "settings", "public"))).data()?.externalPushUrl;
    // A URL é configurada pela administração. Tokens só são enviados por HTTPS ao serviço Render.
    if (typeof url !== "string" || !/^https:\/\/[a-z0-9-]+\.onrender\.com\/?$/.test(url)) return;
    const user = auth.currentUser;
    if (!user) return;
    await fetch(`${url.replace(/\/$/, "")}/wake`, { method: "POST", headers: { Authorization: `Bearer ${await user.getIdToken()}` }, signal: AbortSignal.timeout(90000) });
  })().catch(() => { /* O registro no Firebase e os avisos do painel permanecem independentes. */ });
}
