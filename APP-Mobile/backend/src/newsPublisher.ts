import type { Firestore } from "firebase-admin/firestore";
import { GitHubNewsPublisher, publicArticle, type Article } from "./newsPublishing.js";

export function startNewsPublisher(db: Firestore) {
  const token = process.env.GITHUB_NEWS_TOKEN;
  let status = token ? "starting" : "not-configured", running = false, stopping = false, revision = 0;
  let desired: Article[] | undefined, debounce: ReturnType<typeof setTimeout> | undefined, syncedRevision = -1;
  const publisher = token ? new GitHubNewsPublisher(token) : undefined;
  async function drain() {
    if (!publisher || running || stopping || !desired || revision === syncedRevision) return;
    running = true; const current = revision;
    try {
      status = "publishing";
      const result = await publisher.publish(desired);
      status = "submitted";
      // Private operational state, no tokens, user identities or article text.
      await db.doc("externalPushState/newsPublisher").set({ state: "submitted", commit: result.commit, checkedAt: new Date() }, { merge: true });
      syncedRevision = current;
    } catch { status = "retrying"; console.error("Publicação automática de notícias pendente; nova tentativa programada."); }
    finally { running = false; if (!stopping && revision !== current) schedule(); }
  }
  function schedule() { if (!publisher || stopping) return; if (debounce) clearTimeout(debounce); debounce = setTimeout(() => void drain(), 3000); }
  // Complete collection snapshot recovers edits/deletes during sleep and does not depend on a time horizon.
  const stop = publisher ? db.collection("news").onSnapshot(snapshot => {
    try {
      desired = snapshot.docs.map(doc => publicArticle(doc.id, doc.data())).filter((x): x is Article => Boolean(x));
      revision++; status = "queued"; schedule();
    } catch { desired = undefined; status = "invalid-data"; }
  }, () => { desired = undefined; status = "listener-error"; }) : undefined;
  const retry = publisher ? setInterval(() => void drain(), 60000) : undefined;
  return { status: () => status, wake: schedule, stop() { stopping = true; stop?.(); if (debounce) clearTimeout(debounce); if (retry) clearInterval(retry); } };
}
