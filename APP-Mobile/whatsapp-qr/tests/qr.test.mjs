import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { createServer } from 'node:http';
import * as baileys from '@whiskeysockets/baileys';
import { vault, sessionStore, authState } from '../src/store.mjs';
import { incoming, engine } from '../src/engine.mjs';
import { panel } from '../src/panel.mjs';
import { database } from './helpers.mjs';

const message = (id = 'id', text = 'menu', at = Date.now()) => ({ key: { remoteJid: '5547999999999@s.whatsapp.net', id }, messageTimestamp: Math.floor(at / 1000), message: { conversation: text } });

test('AES-GCM: IV aleatório, autenticação do conteúdo/chave/contexto', () => {
  const key = randomBytes(32), box = vault(key); const blob = box.seal('session secret', 'context');
  assert.equal(box.open(blob, 'context'), 'session secret'); assert.notEqual(box.seal('session secret', 'context').iv, blob.iv);
  assert.throws(() => box.open(blob, 'other')); assert.throws(() => vault(randomBytes(32)).open(blob, 'context'));
  assert.throws(() => box.open({ ...blob, tag: randomBytes(16).toString('base64') }, 'context')); assert.throws(() => vault(Buffer.alloc(31)));
});
test('lease: uma execução, recuperação expirada e fencing do dono antigo', async () => {
  const db = database(), key = randomBytes(32); let now = Date.now();
  const a = sessionStore(db, key, 'test', () => now), b = sessionStore(db, key, 'test', () => now);
  await a.acquire(); await assert.rejects(b.acquire());
  await a.write([{ type: 'keys', id: '1', value: 'private secret' }]);
  assert(!JSON.stringify([...db.data]).includes('private secret')); assert.equal(await a.read('keys', '1'), 'private secret');
  now += 180001; await b.acquire(); await assert.rejects(a.write([{ type: 'keys', id: '1', value: 'wrong' }]));
  await a.release(); await b.renew(); assert.equal(await b.read('keys', '1'), 'private secret'); await b.release();
});
test('auth real Baileys: BufferJSON, chaves, credenciais e restauração sem arquivo de sessão', async () => {
  const db = database(), key = randomBytes(32), store = sessionStore(db, key, 'auth'); await store.acquire();
  const auth = await authState(store, baileys); await auth.saveCreds({ registered: true });
  await auth.state.keys.set({ session: { alice: { value: Buffer.from('private session') } } });
  const restored = await authState(store, baileys); assert.equal(restored.state.creds.registered, true);
  assert(Buffer.isBuffer(restored.state.creds.noiseKey.private));
  assert.equal((await restored.state.keys.get('session', ['alice'])).alice.value.toString(), 'private session');
  assert(!JSON.stringify([...db.data]).includes('private session'));
  await restored.state.keys.set({ session: { alice: null } }); assert.equal((await restored.state.keys.get('session', ['alice'])).alice, undefined);
});
test('entrada: ignora grupos, status, mídia, histórico, ecos e mensagens antigas', () => {
  assert.equal(incoming(message(), 'append'), null);
  const own = message(); own.key.fromMe = true; assert.equal(incoming(own, 'notify'), null);
  for (const jid of ['123@g.us', 'status@broadcast', '123@newsletter']) { const m = message(); m.key.remoteJid = jid; assert.equal(incoming(m, 'notify'), null); }
  assert.equal(incoming(message('old', 'menu', Date.now() - 360000), 'notify'), null);
  const media = message(); media.message = { imageMessage: {} }; assert.equal(incoming(media, 'notify'), null);
  const privateText = incoming(message('pii', 'senha CPF 123'), 'notify'); assert.equal(privateText.choice, 'menu'); assert(!JSON.stringify(privateText).includes('senha'));
});
test('engine: orçamento, deduplicação, consentimento, pedido humano e falha ambígua', async () => {
  let now = Date.now(); const db = database(), store = sessionStore(db, randomBytes(32), 'engine', () => now); await store.acquire();
  const bot = engine(db, store, async () => 'menu público', { clock: () => now, sendEnabled: true, public: true, dailyLimit: 4 });
  const sent = []; const send = async (jid, text) => sent.push({ jid, text });
  assert.equal(await bot.process(message('1', '6', now), 'notify', send), 'accepted');
  assert.equal(await bot.process(message('1', '6', now), 'notify', send), 'duplicate');
  now += 2000; assert.equal(await bot.process(message('2', '1', now), 'notify', send), 'suppressed');
  assert.equal(await bot.process(message('3', 'MENU', now), 'notify', send), 'accepted');
  now += 2000; assert.equal(await bot.process(message('4', '1', now), 'notify', async () => { throw Error('timeout'); }), 'review');
  assert.equal(await bot.process(message('4', '1', now), 'notify', send), 'duplicate');
  now += 2000; assert.equal(await bot.process(message('5', 'sair', now), 'notify', send), 'accepted');
  now += 2000; assert.equal(await bot.process(message('6', 'menu', now), 'notify', send), 'suppressed');
  assert.equal(sent.length, 3); assert([...db.data.values()].some(v => v.humanRequested));
  const noSend = engine(db, store, async () => '', {}); assert.equal(await noSend.process(message('7'), 'notify', send), 'ignored');
  const restricted = engine(db, store, async () => '', { sendEnabled: true, allowed: [] }); assert.equal(await restricted.process(message('8'), 'notify', send), 'ignored');
});
test('retenção apaga somente dados operacionais antigos, preserva autenticação', async () => {
  const db = database(), store = sessionStore(db, randomBytes(32), 'cleanup'); await store.acquire();
  await store.write([{ type: 'creds', id: 'test', value: 'credential' }]);
  db.data.set('whatsappQrJobs/old', { createdAt: Date.now() - 9 * 86400000 });
  await engine(db, store, async () => '').cleanup(); assert(!db.data.has('whatsappQrJobs/old')); assert.equal(await store.read('creds', 'test'), 'credential');
});
test('painel local: cookie HttpOnly, proteção contra origem externa, QR nunca público', async () => {
  const server = createServer(); await new Promise(r => server.listen(0, '127.0.0.1', r));
  const port = server.address().port; const base = `http://127.0.0.1:${port}`;
  const handler = panel({ port, status: () => ({ state: 'pairing', qr: 'test-qr' }), stop: async () => {} }); server.on('request', handler);
  try {
    assert.equal((await fetch(base + '/status')).status, 401);
    const home = await fetch(base + '/'); const cookie = home.headers.get('set-cookie'); assert(cookie.includes('HttpOnly')); assert(cookie.includes('SameSite=Strict'));
    const auth = cookie.split(';')[0]; const status = await fetch(base + '/status', { headers: { cookie: auth } }); assert.equal(status.status, 200); assert((await status.json()).qr.startsWith('data:image/png;base64,'));
    assert.equal((await fetch(base + '/status', { headers: { cookie: auth, 'sec-fetch-site': 'cross-site' } })).status, 403);
    assert.equal((await fetch(base + '/stop', { method: 'POST', headers: { cookie: auth, Origin: 'https://example.com' } })).status, 404);
  } finally { await new Promise(r => server.close(r)); }
});
