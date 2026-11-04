import { createServer } from 'node:http';
import { cert, initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { sessionStore, authState } from './store.mjs';
import { engine } from './engine.mjs';
import { transport } from './transport.mjs';
import { panel } from './panel.mjs';
import { reply } from './replies.mjs';

export async function start({ db, key, renderReply, env = process.env, local = false, listen = true, manageSignals = true }) {
  if (env.WA_QR_ENABLED !== 'true') throw Error('Modo QR desativado.');
  if (env.WA_ENABLED === 'true') throw Error('Desative a API oficial antes de iniciar o modo QR.');
  const options = { sendEnabled: env.WA_QR_SEND_ENABLED === 'true', public: env.WA_QR_PUBLIC === 'true',
    allowed: (env.WA_QR_ALLOWED_JIDS || '').split(',').map(s => s.trim()).filter(Boolean), dailyLimit: Number(env.WA_QR_DAILY_LIMIT || 50), acceptAfter: Date.now() };
  if (options.sendEnabled && !options.public && !options.allowed.length) throw Error('Informe os remetentes autorizados para o piloto.');
  // Bibliotecas de protocolo podem registrar detalhes da sessão via console. Não expor esses logs.
  for (const name of ['log', 'warn', 'error', 'info', 'debug', 'trace']) console[name] = () => {};
  const baileys = await import('@whiskeysockets/baileys');
  const { default: pino } = await import('pino');
  const store = sessionStore(db, key, env.WA_QR_SESSION || 'aumm');
  await store.acquire();
  let shuttingDown = false, control, server;
  const handler = engine(db, store, renderReply, options);
  let auth;
  async function shutdown() {
    if (shuttingDown) return; shuttingDown = true;
    clearInterval(renew); clearInterval(cleanup);
    await control?.stop();
    await Promise.race([control?.idle(), new Promise(r => setTimeout(r, 13000).unref())]);
    await auth?.flush(); await store.release();
    server?.close();
  }
  control = transport({ baileys, logger: pino({ level: 'silent' }), store, engine: handler,
    onState: state => { if (process.connected) process.send?.({ type: 'qr-state', state: state.state }); },
    async authFactory() {
      auth = await authState(store, baileys);
      if (!local && !auth.state.creds.registered) throw Error('Vincule o aparelho pelo painel local antes de executar na nuvem.');
      return auth;
    }, onFailure: () => { void shutdown().catch(() => {}); },
  });
  const renew = setInterval(() => void store.renew().catch(() => shutdown().catch(() => {})), 60000);
  const cleanup = setInterval(() => void handler.cleanup().catch(() => shutdown().catch(() => {})), 3600000);
  const port = Number(env.PORT || (local ? 8799 : 8789));
  const localHandler = local ? panel({ port, status: () => ({ ...control.status(), sendEnabled: options.sendEnabled }), stop: shutdown }) : null;
  if (listen) server = createServer(async (req, res) => {
    try {
      if (req.url === '/health') { res.setHeader('Cache-Control', 'no-store'); res.writeHead(shuttingDown ? 503 : 200); res.end('ok'); return; }
      if (localHandler) { await localHandler(req, res); return; }
      res.writeHead(404); res.end();
    } catch { if (!res.headersSent) res.writeHead(503); res.end(); }
  });
  if (server) {
    server.requestTimeout = 10000; server.headersTimeout = 10000;
    await new Promise((accept, reject) => { server.once('error', reject); server.listen(port, local ? '127.0.0.1' : '0.0.0.0', accept); }).catch(async error => { await shutdown(); throw error; });
  }
  await control.start();
  const signal = () => { void shutdown().then(() => process.exit(0)).catch(() => process.exit(1)); };
  if (manageSignals) {
    process.once('SIGINT', signal); process.once('SIGTERM', signal);
    process.once('uncaughtException', () => { process.stderr.write('AUMM QR: falha interna; encerrando sem registrar dados de sessão.\n'); signal(); });
    process.once('unhandledRejection', () => { process.stderr.write('AUMM QR: conexão interrompida; encerrando com segurança.\n'); signal(); });
  }
  return { status: control.status, stop: shutdown };
}

async function main() {
  if (process.env.WA_QR_ENABLED !== 'true') throw Error('Defina WA_QR_ENABLED=true para iniciar.');
  initializeApp({ credential: process.env.FIREBASE_SERVICE_ACCOUNT ? cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)) : applicationDefault(), projectId: process.env.GOOGLE_CLOUD_PROJECT || 'aumm-21dda' });
  const key = process.env.WA_QR_SESSION_KEY ? Buffer.from(process.env.WA_QR_SESSION_KEY, 'base64') : Buffer.from((await readFile(process.env.WA_QR_KEY_FILE, 'utf8')).trim(), 'base64');
  await start({ db: getFirestore(), key, renderReply: reply, listen: process.env.WA_QR_HEADLESS !== 'true' });
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(() => { process.stderr.write('AUMM QR: não foi possível iniciar. Confira configuração, sessão e acesso ao Firebase.\n'); process.exitCode = 1; });
}
