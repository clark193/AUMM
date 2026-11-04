import type { Auth } from "firebase/auth";
import { doc, getDoc, type Firestore } from "firebase/firestore";

/** Wakes the existing service; article contents always come from Firestore. */
export async function requestNewsPublication({ auth, db }: { auth: Auth; db: Firestore }): Promise<boolean> {
  try {
    const user = auth.currentUser;
    if (!user) return false;
    const url = (await getDoc(doc(db, "settings", "public"))).data()?.externalPushUrl;
    if (typeof url !== "string" || !/^https:\/\/[a-z0-9-]+\.onrender\.com\/?$/.test(url)) return false;
    const response = await fetch(`${url.replace(/\/$/, "")}/wake`, { method: "POST", headers: { Authorization: `Bearer ${await user.getIdToken()}` }, signal: AbortSignal.timeout(90000) });
    const state = response.headers.get("X-AUMM-News-Publisher");
    return (response.ok || response.status === 429) && Boolean(state && ["starting", "queued", "publishing", "submitted", "retrying"].includes(state));
  } catch { return false; }
}
