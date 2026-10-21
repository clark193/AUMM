import { createServer } from "node:http";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, Timestamp, type DocumentSnapshot } from "firebase-admin/firestore";
import {
  mobileAdminEmergency, mobileCleanupSupportChat, mobileCommunicationPublished,
  mobileExpireConfirmations, mobileNewsPublished, mobileSupportChanged,
} from "./index.js";

if (process.env.AUMM_EXTERNAL_PUSH !== "true") throw new Error("Defina AUMM_EXTERNAL_PUSH=true para executar o servidor externo.");
const db = getFirestore();
const sources = ["news", "communications", "supportRequests", "emergencyAdminSignals"] as const;
type SourceName = typeof sources[number];
const pending = new Map<string, DocumentSnapshot>();
const running = new Set<string>();
let ready = false, stopping = false;
const stops: (() => void)[] = [];
const now = () => Timestamp.now();
const time = (value: unknown) => (value as Timestamp | undefined)?.toMillis?.() || 0;

// O estado mínimo sobrevive ao repouso/reinício da hospedagem gratuita.
function minimal(data: Record<string, unknown>) {
  return Object.fromEntries(["status", "title", "audience", "city", "ownerUid", "helperUid", "createdAt", "publishedAt", "updatedAt", "expiresAt", "acceptedAt", "confirmedAt", "incidentId", "chatId"]
    .filter(key => data[key] !== undefined).map(key => [key, data[key]]));
}

async function processSource(collection: SourceName, snapshot: DocumentSnapshot, since: number) {
  if (!snapshot.exists) return;
  const stateRef = db.doc(`externalPushState/${collection}_${snapshot.id}`);
  const prior = await stateRef.get();
  const after = minimal(snapshot.data()!);
  if (prior.data()?.sourceVersion === snapshot.updateTime?.toMillis()) return;
  const previous = prior.data()?.source || null;
  let before = previous;
  const eventTime = time(after.updatedAt) || time(after.publishedAt) || time(after.createdAt);
  // Primeira instalação não dispara avisos históricos para a base inteira.
  if (eventTime >= since) {
    if (collection === "supportRequests" && before?.status !== after.status) {
      // Se o serviço esteve em repouso, recupera o último marco ainda válido do pedido.
      const fallback: Record<string, string> = { awaiting_confirmation: "open", accepted: "awaiting_confirmation", resolved: "accepted", cancelled: "open" };
      if (fallback[String(after.status)]) before = { ...after, status: fallback[String(after.status)] };
    }
    const event = { params: { id: snapshot.id }, time: new Date(eventTime || Date.now()).toISOString(),
      data: { before: { data: () => before }, after: snapshot } };
    const handler = collection === "news" ? mobileNewsPublished : collection === "communications" ? mobileCommunicationPublished
      : collection === "supportRequests" ? mobileSupportChanged : mobileAdminEmergency;
    await handler.run(event as Parameters<typeof handler.run>[0]);
    if (collection === "supportRequests") await mobileCleanupSupportChat.run(event as Parameters<typeof mobileCleanupSupportChat.run>[0]);
  }
  await stateRef.set({ source: after, sourceVersion: snapshot.updateTime?.toMillis() || 0, processedAt: now() });
}

async function drain(since: number) {
  for (const [key, snapshot] of pending) {
    if (stopping || running.has(key)) continue;
    running.add(key);
    try {
      await processSource(snapshot.ref.parent.id as SourceName, snapshot, since);
      if (pending.get(key) === snapshot) pending.delete(key);
    } catch {
      // Não registrar documentos, tokens ou contatos no log do provedor.
      console.error("Falha no processamento de um aviso; nova tentativa em até 15 segundos.");
    } finally { running.delete(key); }
  }
}

const cutoffRef = db.doc("externalPushState/control");
const since = await db.runTransaction(async tx => {
  const record = await tx.get(cutoffRef);
  if (record.exists) return time(record.data()?.enabledAt);
  const enabledAt = now(); tx.create(cutoffRef, { enabledAt }); return enabledAt.toMillis();
});
for (const collection of sources) {
  // Uma consulta por fonte, em tempo real; nenhum polling de GPS ou dados privados.
  const field = "updatedAt";
  const horizon = Timestamp.fromMillis(Math.max(since, Date.now() - 25 * 3600000));
  stops.push(db.collection(collection).where(field, ">=", horizon).onSnapshot(snapshot => {
    for (const change of snapshot.docChanges()) if (change.type !== "removed") pending.set(change.doc.ref.path, change.doc);
    void drain(since);
  }, () => { console.error("Listener indisponível; o SDK tentará restabelecer a conexão."); }));
}
const retry = setInterval(() => void drain(since), 15000);
let expiring = false;
const expiry = setInterval(() => {
  if (expiring) return;
  expiring = true;
  void Promise.resolve(mobileExpireConfirmations.run({ scheduleTime: new Date().toISOString() } as Parameters<typeof mobileExpireConfirmations.run>[0]))
    .catch(() => console.error("Não foi possível expirar confirmações nesta tentativa."))
    .finally(() => { expiring = false; });
}, 60000);

const allowedOrigins = new Set(["https://aumm.com.br", "https://www.aumm.com.br", "https://localhost", "capacitor://localhost"]);
// /wake só acorda o serviço. Os eventos e destinatários vêm exclusivamente do Firestore.
const wakeLimits = new Map<string, number>();
const server = createServer(async (request, response) => {
  response.setHeader("Cache-Control", "no-store");
  response.setHeader("X-Content-Type-Options", "nosniff");
  const origin = String(request.headers.origin || "");
  if (allowedOrigins.has(origin)) {
    response.setHeader("Access-Control-Allow-Origin", origin);
    response.setHeader("Vary", "Origin");
    response.setHeader("Access-Control-Allow-Headers", "Authorization, Content-Type");
    response.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  }
  if (request.url === "/health" && request.method === "GET") { response.writeHead(ready ? 200 : 503); response.end(ready ? "ok" : "starting"); return; }
  if (request.url !== "/wake") { response.writeHead(404); response.end(); return; }
  if (origin && !allowedOrigins.has(origin)) { response.writeHead(403); response.end(); return; }
  if (request.method === "OPTIONS") { response.writeHead(204); response.end(); return; }
  if (request.method !== "POST") { response.writeHead(405); response.end(); return; }
  const bearer = request.headers.authorization?.match(/^Bearer ([A-Za-z0-9._-]{100,8192})$/)?.[1];
  if (!bearer) { response.writeHead(401); response.end(); return; }
  try {
    const identity = await getAuth().verifyIdToken(bearer);
    const previous = wakeLimits.get(identity.uid) || 0;
    if (Date.now() - previous < 10000) { response.writeHead(429); response.end(); return; }
    for (const [uid, at] of wakeLimits) if (at < Date.now() - 60000) wakeLimits.delete(uid);
    wakeLimits.set(identity.uid, Date.now());
    void drain(since);
    response.writeHead(202); response.end();
  } catch { response.writeHead(401); response.end(); }
});
server.headersTimeout = 10000; server.requestTimeout = 15000;
server.listen(Number(process.env.PORT || 8788), "0.0.0.0", () => { ready = true; console.log("Servidor externo de notificações iniciado."); });
function close() {
  stopping = true; ready = false; clearInterval(retry); clearInterval(expiry); stops.forEach(stop => stop());
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 10000).unref();
}
process.on("SIGTERM", close); process.on("SIGINT", close);
