import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { setTimeout as sleep } from "node:timers/promises";
import { fileURLToPath } from "node:url";
process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8080";
process.env.GCLOUD_PROJECT = "demo-aumm-external";
const require = createRequire(new URL("../backend/package.json", import.meta.url));
const { initializeApp, deleteApp } = require("firebase-admin/app");
const { getFirestore, Timestamp } = require("firebase-admin/firestore");
const app = initializeApp({ projectId: "demo-aumm-external" });
const db = getFirestore();
const uid = `external-server-${Date.now()}`;
const endpoint = "http://127.0.0.1:8788";
let child;
async function eventually(check, label) {
  for (let attempt = 0; attempt < 100; attempt++) {
    try { if (await check()) return; } catch { }
    await sleep(300);
  }
  throw Error(label);
}
async function start() {
  const env = { ...process.env, AUMM_EXTERNAL_PUSH: "true", GOOGLE_CLOUD_PROJECT: "demo-aumm-external", PORT: "8788" };
  delete env.FIREBASE_SERVICE_ACCOUNT; delete env.GOOGLE_APPLICATION_CREDENTIALS;
  child = spawn(process.execPath, [fileURLToPath(new URL("../backend/lib/backend/src/server.js", import.meta.url))], { env, stdio: ["ignore", "pipe", "pipe"] });
  const errors = [];
  child.stderr.on("data", data => errors.push(data.toString()));
  await eventually(async () => (await fetch(endpoint + "/health")).status === 200, "Servidor não iniciou: " + errors.join(""));
}
async function stop() {
  if (!child || child.exitCode !== null) return;
  const current = child;
  current.kill();
  await new Promise(resolve => current.once("exit", resolve));
  child = null;
}
try {
  await start();
  assert.equal((await fetch(endpoint + "/wake", { method: "POST" })).status, 401);
  assert.equal((await fetch(endpoint + "/wake", { method: "POST", headers: { Origin: "https://evil.example" } })).status, 403);
  assert.equal((await fetch(endpoint + "/anything")).status, 404);
  await db.doc(`mobileSubscriptions/${uid}`).set({ uid, news: true, nearbyHelp: true, requestUpdates: true, communications: true, city: "Blumenau", cityKey: "blumenau" });
  const source = db.doc(`news/${uid}`);
  await source.set({ status: "published", title: "Notícia do servidor local", publishedAt: Timestamp.now(), createdAt: Timestamp.now(), updatedAt: Timestamp.now() });
  const notices = () => db.collection(`mobileInbox/${uid}/items`).get();
  await eventually(async () => (await notices()).docs.some(item => item.data().kind === "news" && item.data().pushStatus === "skipped"), "Publicação não gerou aviso pelo servidor externo");
  const count = (await notices()).size;
  await stop();
  await start();
  await sleep(1000);
  assert.equal((await notices()).size, count);
  await source.update({ title: "Edição sem novo aviso", updatedAt: Timestamp.now() });
  await eventually(async () => (await db.doc(`externalPushState/news_${uid}`).get()).data()?.source?.title === "Edição sem novo aviso", "Estado não atualizado após reinício");
  assert.equal((await notices()).size, count);
  // Sem aparelho habilitado: nenhum envio a FCM real é feito neste teste.
  console.log("Servidor externo: HTTP autenticado, listener real, criação de aviso, ausência de duplicação após reinício e edição: aprovados no emulador.");
} finally { await stop(); await db.terminate(); await deleteApp(app); }
