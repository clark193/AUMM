export function transport({ baileys, logger, store, authFactory, engine, onState = () => {}, onFailure = () => {} }) {
  let socket, reconnect, stopped = false, backoff = 1000, pending = Promise.resolve(), queued = 0;
  let status = { state: 'starting', received: 0, accepted: 0, review: 0, qr: null, account: '' };
  const update = patch => { status = { ...status, ...patch }; onState(status); };
  async function fail() {
    update({ state: 'error', qr: null });
    await stop(); onFailure();
  }
  async function connect() {
    if (stopped) return;
    try {
      const auth = await authFactory(store, baileys);
      if (stopped) return;
      const sock = baileys.default({ auth: auth.state, logger, markOnlineOnConnect: false, syncFullHistory: false,
        shouldSyncHistoryMessage: () => false, emitOwnEvents: false,
        shouldIgnoreJid: jid => !/^[0-9]{5,20}@(s\.whatsapp\.net|lid)$/.test(jid),
        getMessage: async () => undefined,
        browser: baileys.Browsers.ubuntu('AUMM Atendimento'),
      });
      socket = sock;
      sock.ev.on('creds.update', creds => { void auth.saveCreds(creds).catch(fail); });
      sock.ev.on('connection.update', change => {
        if (stopped || sock !== socket) return;
        if (change.qr) update({ state: 'pairing', qr: change.qr });
        if (change.connection === 'open') {
          backoff = 1000;
          const number = (sock.user?.id || '').split(':')[0].split('@')[0];
          update({ state: 'connected', qr: null, account: number ? `••••${number.slice(-4)}` : 'vinculado' });
        }
        if (change.connection === 'close') {
          const code = change.lastDisconnect?.error?.output?.statusCode;
          if ([baileys.DisconnectReason.loggedOut, baileys.DisconnectReason.badSession, baileys.DisconnectReason.connectionReplaced].includes(code)) {
            update({ state: 'needs_pairing', qr: null }); void stop(); return;
          }
          update({ state: 'reconnecting', qr: null });
          if (reconnect) clearTimeout(reconnect);
          reconnect = setTimeout(() => { void auth.flush().then(connect).catch(fail); }, code === baileys.DisconnectReason.restartRequired ? 500 : backoff);
          backoff = Math.min(backoff * 2, 30000);
        }
      });
      sock.ev.on('messages.upsert', ({ messages, type }) => {
        if (stopped || sock !== socket || type !== 'notify') return;
        for (const message of messages) {
          if (queued >= 100) break;
          queued++;
          pending = pending.then(async () => {
            if (stopped || sock !== socket) return;
            const result = await engine.process(message, type, async (jid, text) => {
              if (stopped || sock !== socket) throw Error('Transporte desconectado.');
              let timer;
              try {
                await Promise.race([sock.sendMessage(jid, { text }), new Promise((_, reject) => { timer = setTimeout(() => reject(Error('Envio sem confirmação.')), 12000); })]);
              } finally { clearTimeout(timer); }
            });
            if (result !== 'ignored' && result !== 'duplicate') update({ received: status.received + 1, accepted: status.accepted + Number(result === 'accepted'), review: status.review + Number(result === 'review') });
          }).catch(fail).finally(() => { queued--; });
        }
      });
    } catch { await fail(); }
  }
  async function stop() {
    stopped = true; clearTimeout(reconnect);
    socket?.end(undefined); socket = undefined;
  }
  return { start: connect, stop, status: () => status, idle: () => pending };
}
