import { digest } from './store.mjs';

export function incoming(message, type, now = Date.now()) {
  const jid = message?.key?.remoteJid;
  if (type !== 'notify' || message?.key?.fromMe || !/^[0-9]{5,20}@(s\.whatsapp\.net|lid)$/.test(jid || '') || !message.key.id) return null;
  // Não usa conteúdo encapsulado, mídia, contatos, grupos, status ou histórico.
  const body = message.message?.conversation ?? message.message?.extendedTextMessage?.text;
  const at = Number(message.messageTimestamp) * 1000;
  if (typeof body !== 'string' || !Number.isFinite(at) || at > now + 60000 || now - at > 5 * 60000) return null;
  const value = body.trim().toLocaleLowerCase('pt-BR');
  const choice = /^[1-6]$/.test(value) || ['menu', 'sair', 'parar'].includes(value) ? value : 'menu';
  return { id: digest(`${jid}:${message.key.id}`), jid, choice, at };
}

export function engine(db, store, renderReply, options = {}) {
  const clock = options.clock || Date.now;
  const allowed = new Set(options.allowed || []);
  const limit = Number.isInteger(options.dailyLimit) && options.dailyLimit > 0 ? Math.min(options.dailyLimit, 500) : 50;
  return {
    async process(message, type, send) {
      const item = incoming(message, type, clock());
      if (!item || item.at < (options.acceptAfter || 0) || !options.sendEnabled || (!options.public && !allowed.has(item.jid))) return 'ignored';
      const ref = db.doc(`whatsappQrJobs/${item.id}`), session = db.doc(`whatsappQrChats/${digest(item.jid)}`);
      const budget = db.doc(`whatsappQrLimits/${new Date(clock()).toISOString().slice(0, 10)}`);
      const outcome = await store.transaction(async tx => {
        const [job, chat, quota] = await Promise.all([tx.get(ref), tx.get(session), tx.get(budget)]);
        if (job.exists) return 'duplicate';
        const previous = chat.data() || {};
        const paused = previous.paused && item.choice !== 'menu';
        const suppressed = previous.lastAt > item.at || paused || (previous.lastReplyAt && clock() - previous.lastReplyAt < 1500);
        if (suppressed || (quota.data()?.count || 0) >= limit) {
          tx.create(ref, { state: suppressed ? 'suppressed' : 'limited', createdAt: clock() }); return 'suppressed';
        }
        tx.set(budget, { count: (quota.data()?.count || 0) + 1, updatedAt: clock() });
        tx.set(session, { paused: ['sair', 'parar', '6'].includes(item.choice), lastAt: item.at, lastReplyAt: clock() });
        // Human ticket only: JID is kept in the private queue until resolved/retention.
        tx.create(ref, { state: 'sending', choice: item.choice, createdAt: clock(), humanRequested: item.choice === '6', ...(item.choice === '6' ? { jid: item.jid } : {}) });
        return 'send';
      });
      if (outcome !== 'send') return outcome;
      try {
        const text = await renderReply(item.choice, db);
        // Fence before sending; a lost lease must never send through a stale socket.
        await store.transaction(() => {});
        await send(item.jid, text);
        await ref.update({ state: 'accepted', finishedAt: clock() }); return 'accepted';
      } catch {
        await ref.update({ state: 'review', finishedAt: clock() }); return 'review';
      }
    },
    async cleanup() {
      for (const [name, field] of [['whatsappQrJobs', 'createdAt'], ['whatsappQrChats', 'lastAt'], ['whatsappQrLimits', 'updatedAt']]) {
        const old = await db.collection(name).where(field, '<', clock() - 8 * 86400000).limit(100).get();
        if (!old.empty) await store.transaction(tx => { old.docs.forEach(doc => tx.delete(doc.ref)); });
      }
    },
  };
}
