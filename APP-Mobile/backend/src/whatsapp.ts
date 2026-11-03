import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import type { IncomingMessage, ServerResponse } from "node:http";
import type { Firestore } from "firebase-admin/firestore";

const MENU = "Atendimento automático AUMM. Não envie CPF, senha ou documentos.\n1. Conhecer a AUMM\n2. Como se associar\n3. Ler notícias publicadas\n4. Benefícios e informações públicas\n5. Acessar o portal\n6. Solicitar atendimento humano\nDigite um número. Para encerrar: SAIR. Para retomar: MENU.";
export function signatureValid(raw: Buffer, signature: string, secret: string) {
  if (!secret || !/^sha256=[a-f0-9]{64}$/.test(signature)) return false;
  return timingSafeEqual(Buffer.from(signature.slice(7), "hex"), createHmac("sha256", secret).update(raw).digest());
}
export function command(text: string) {
  const value = text.trim().toLocaleLowerCase("pt-BR");
  return /^[1-6]$/.test(value) ? value : ["sair", "parar", "menu"].includes(value) ? value : "menu";
}
export function inWindow(timestamp: number, now = Date.now()) {
  return Number.isFinite(timestamp) && timestamp <= now + 60000 && now - timestamp < 23.9 * 3600000;
}
const hash = (value: string) => createHash("sha256").update(value).digest("hex");
export async function reply(choice: string, db: Firestore): Promise<string> {
  switch (choice) {
    case "1": return "A Associação União Maior Motoboys (AUMM) é uma organização sem fins lucrativos, formada por motofretistas e entregadores(as) de bicicleta, com atuação em todo o território brasileiro.\nhttps://aumm.com.br/quem-somos/\nDigite MENU para voltar.";
    case "2": return "Conheça o Estatuto e preencha a solicitação pelo site oficial. A solicitação será analisada pela associação.\nhttps://aumm.com.br/associe-se/\nhttps://aumm.com.br/estatuto/\nDigite MENU para voltar.";
    case "3": {
      const news = await db.collection("news").where("status", "==", "published").limit(5).get();
      const items = news.docs.map(doc => `${String(doc.data().title || "Notícia").replace(/[\r\n]/g, " ").slice(0, 160)}\nhttps://aumm.com.br/noticias/${encodeURIComponent(doc.id)}/`);
      return `${items.join("\n\n") || "Consulte as notícias publicadas no site."}\nhttps://aumm.com.br/noticias/\nDigite MENU para voltar.`;
    }
    case "4": return "Informações públicas: https://aumm.com.br/beneficios/\nOs benefícios restritos exigem acesso ao portal. Este atendimento não consulta dados de associados.\nDigite MENU para voltar.";
    case "5": return "Acesse https://aumm.com.br/associado/ pelo navegador e use seu acesso pessoal. Para orientação de recuperação, siga as opções da tela de entrada. Não envie sua senha ou CPF aqui. O número de WhatsApp não autentica seu cadastro.\nDigite MENU para voltar.";
    case "6": return "Seu pedido de atendimento humano foi registrado. Não há prazo de resposta confirmado. Consulte também https://aumm.com.br/contato/ . O atendimento automático fica pausado; digite MENU para retomá-lo.";
    case "sair": case "parar": return "Atendimento automático encerrado. Para retomá-lo, envie MENU.";
    default: return MENU;
  }
}

// Firestore é a fila durável. Nenhum corpo livre, nome, CPF ou senha é persistido.
export function whatsapp(db: Firestore, env: NodeJS.ProcessEnv = process.env) {
  let busy = false;
  const jobs = db.collection("whatsappJobs");
  const configured = () => env.WA_ENABLED === "true" && !!env.WA_APP_SECRET && !!env.WA_VERIFY_TOKEN && !!env.WA_PHONE_NUMBER_ID && !!env.WA_WABA_ID;
  async function handle(req: IncomingMessage, res: ServerResponse) {
    if (!configured()) { res.writeHead(503); res.end(); return; }
    const url = new URL(req.url || "/", "https://localhost");
    if (req.method === "GET") {
      const ok = url.searchParams.get("hub.mode") === "subscribe" && url.searchParams.get("hub.verify_token") === env.WA_VERIFY_TOKEN;
      res.writeHead(ok ? 200 : 403, { "Content-Type": "text/plain" }); res.end(ok ? url.searchParams.get("hub.challenge") : ""); return;
    }
    if (req.method !== "POST") { res.writeHead(405); res.end(); return; }
    try {
      const chunks: Buffer[] = []; let size = 0;
      for await (const chunk of req) {
        const bytes = Buffer.from(chunk); size += bytes.length;
        if (size > 262144) { res.writeHead(413); res.end(); return; } chunks.push(bytes);
      }
      const raw = Buffer.concat(chunks);
      if (!signatureValid(raw, String(req.headers["x-hub-signature-256"] || ""), env.WA_APP_SECRET!)) { res.writeHead(401); res.end(); return; }
      let body;
      try { body = JSON.parse(raw.toString("utf8")); } catch { res.writeHead(400); res.end(); return; }
      if (body.object === "whatsapp_business_account" && Array.isArray(body.entry)) {
        for (const entry of body.entry) for (const change of entry.changes || []) {
          const value = change.value;
          if (String(entry.id) !== env.WA_WABA_ID || change.field !== "messages" || value?.metadata?.phone_number_id !== env.WA_PHONE_NUMBER_ID) continue;
          for (const msg of (value.messages || []).slice(0, 100)) {
            if (typeof msg.id !== "string" || !/^\d{8,15}$/.test(msg.from || "") || !inWindow(Number(msg.timestamp) * 1000)) continue;
            if (env.WA_ALLOWED_SENDERS && !env.WA_ALLOWED_SENDERS.split(",").map(v => v.trim()).includes(msg.from)) continue;
            const ref = jobs.doc(hash(msg.id));
            await db.runTransaction(async tx => {
              if ((await tx.get(ref)).exists) return;
              tx.create(ref, { to: msg.from, receivedAt: Number(msg.timestamp) * 1000,
                choice: command(msg.type === "text" ? String(msg.text?.body || "") : "menu"), state: "pending", attempt: 0, nextAt: Date.now(), createdAt: Date.now() });
            });
          }
        }
      }
      res.writeHead(200); res.end(); // ACK somente após persistir; nunca espera a API de envio.
    } catch { if (!res.headersSent) res.writeHead(503); res.end(); }
  }
  async function drain() {
    if (busy || !configured() || env.WA_SEND_ENABLED !== "true" || !env.WA_ACCESS_TOKEN || !/^v\d+\.0$/.test(env.WA_GRAPH_VERSION || "")) return;
    busy = true;
    try {
      const pending = await jobs.where("state", "==", "pending").limit(20).get();
      for (const doc of pending.docs) {
        const item = doc.data(); if (item.nextAt > Date.now()) continue;
        const session = db.doc(`whatsappSessions/${hash(item.to)}`);
        const text = await reply(item.choice, db);
        const month = new Date().toISOString().slice(0, 7);
        const budget = db.doc(`whatsappBudgets/${env.WA_PHONE_NUMBER_ID}_${month}`);
        const claimed = await db.runTransaction(async tx => {
          const [current, previous, allowance] = await Promise.all([tx.get(doc.ref), tx.get(session), tx.get(budget)]);
          if (current.data()?.state !== "pending") return false;
          if (!inWindow(item.receivedAt)) { tx.update(doc.ref, { state: "expired", to: "" }); return false; }
          if (previous.data()?.lastAt > item.receivedAt || (previous.data()?.paused && item.choice !== "menu" && item.attempt === 0)) {
            tx.update(doc.ref, { state: "suppressed", to: "" }); return false;
          }
          const b = allowance.data();
          // Orçamento nunca é criado/resetado automaticamente; inclui reservas e falhas ambíguas.
          if (!b?.exclusivePhone || !Number.isInteger(b.limit) || b.limit < 1 || b.limit > 1000 || !Number.isInteger(b.reserved) || b.reserved < 0 || b.reserved >= b.limit) {
            tx.update(doc.ref, { state: "budget_blocked", humanRequested: item.choice === "6", ...(item.choice === "6" ? {} : { to: "" }) }); return false;
          }
          tx.update(budget, { reserved: b.reserved + 1 });
          tx.set(session, { paused: ["6", "sair", "parar"].includes(item.choice), lastAt: item.receivedAt });
          tx.update(doc.ref, { state: "sending", attempt: item.attempt + 1, startedAt: Date.now(), humanRequested: item.choice === "6" });
          return true;
        });
        if (!claimed) continue;
        try {
          const result = await fetch(`https://graph.facebook.com/${env.WA_GRAPH_VERSION}/${env.WA_PHONE_NUMBER_ID}/messages`, {
            method: "POST", headers: { Authorization: `Bearer ${env.WA_ACCESS_TOKEN}`, "Content-Type": "application/json" }, signal: AbortSignal.timeout(10000),
            body: JSON.stringify({ messaging_product: "whatsapp", to: item.to, type: "text", text: { body: text, preview_url: false } }) });
          // Somente rejeição explícita 429 é retentável; timeout/5xx podem ter enviado.
          const retry = result.status === 429 && item.attempt < 2;
          await doc.ref.update({ state: result.ok ? "sent" : retry ? "pending" : "review", nextAt: Date.now() + 60000, httpStatus: result.status, ...(retry || item.choice === "6" ? {} : { to: "" }) });
        } catch { await doc.ref.update({ state: "review", to: "" }); }
      }
    } catch { console.error("WhatsApp: processamento pendente; nenhuma informação pessoal registrada no log."); }
    finally { busy = false; }
  }
  async function cleanup() {
    if (!configured()) return;
    // Exclusão pelo servidor, sem TTL pago. Limite por rodada evita uma carga sem limite.
    for (const [collection, field] of [["whatsappJobs", "createdAt"], ["whatsappSessions", "lastAt"]]) {
      const expired = await db.collection(collection).where(field, "<", Date.now() - 8 * 86400000).limit(100).get();
      const batch = db.batch(); expired.docs.forEach(doc => batch.delete(doc.ref));
      if (!expired.empty) await batch.commit();
    }
    const interrupted = await jobs.where("state", "==", "sending").limit(100).get();
    for (const doc of interrupted.docs) if (doc.data().startedAt < Date.now() - 60000) {
      await doc.ref.update({ state: "review", to: doc.data().humanRequested ? doc.data().to : "" });
    }
  }
  return { handle, drain, cleanup };
}
