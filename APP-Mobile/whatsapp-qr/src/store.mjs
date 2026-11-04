import { createCipheriv, createDecipheriv, createHash, randomBytes, randomUUID } from 'node:crypto';

export function vault(key) {
  if (!Buffer.isBuffer(key) || key.length !== 32) throw Error('Defina uma chave de sessão de 32 bytes.');
  return {
    seal(value, context) {
      const iv = randomBytes(12), cipher = createCipheriv('aes-256-gcm', key, iv);
      cipher.setAAD(Buffer.from(context));
      const data = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
      return { v: 1, iv: iv.toString('base64'), tag: cipher.getAuthTag().toString('base64'), data: data.toString('base64') };
    },
    open(blob, context) {
      if (blob?.v !== 1) throw Error('Formato de sessão inválido.');
      const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(blob.iv, 'base64'));
      decipher.setAAD(Buffer.from(context)); decipher.setAuthTag(Buffer.from(blob.tag, 'base64'));
      return Buffer.concat([decipher.update(Buffer.from(blob.data, 'base64')), decipher.final()]).toString('utf8');
    },
  };
}
export const digest = value => createHash('sha256').update(value).digest('hex');
// QR vinculado preenche me/account. `registered` pode continuar false (não é login móvel).
export const isPaired = creds => typeof creds?.me?.id === 'string' && creds.me.id.length > 0 && !!creds.account;

export function sessionStore(db, key, session = 'aumm', clock = Date.now) {
  if (!/^[a-z0-9_-]{1,40}$/.test(session)) throw Error('Identificação de sessão inválida.');
  const crypto = vault(key), owner = randomUUID(), leaseRef = db.doc(`whatsappQrControl/${session}`);
  const context = (type, id) => `${session}:${type}:${id}`;
  const ref = (type, id) => db.doc(`whatsappQrAuth/${digest(context(type, id))}`);
  function requireLease(snapshot) {
    const value = snapshot.data();
    if (value?.owner !== owner || value.expiresAt <= clock()) throw Error('Sessão ocupada ou licença de execução expirada.');
  }
  async function transaction(fn) {
    return db.runTransaction(async tx => { requireLease(await tx.get(leaseRef)); return fn(tx); });
  }
  return {
    transaction,
    async acquire() {
      await db.runTransaction(async tx => {
        const lease = (await tx.get(leaseRef)).data();
        if (lease?.owner && lease.expiresAt > clock() && lease.owner !== owner) throw Error('O bot já está aberto em outro servidor.');
        tx.set(leaseRef, { owner, expiresAt: clock() + 180000, updatedAt: clock() });
      });
    },
    async renew() { await transaction(tx => tx.update(leaseRef, { expiresAt: clock() + 180000, updatedAt: clock() })); },
    async release() {
      await db.runTransaction(async tx => { if ((await tx.get(leaseRef)).data()?.owner === owner) tx.set(leaseRef, { owner: '', expiresAt: 0, updatedAt: clock() }); });
    },
    async read(type, id) {
      const doc = await ref(type, id).get();
      return doc.exists ? crypto.open(doc.data().blob, context(type, id)) : undefined;
    },
    async write(items) {
      for (let offset = 0; offset < items.length; offset += 100) {
        const chunk = items.slice(offset, offset + 100).map(({ type, id, value }) => ({ ref: ref(type, id), value: value === null ? null : { blob: crypto.seal(value, context(type, id)), updatedAt: clock(), session } }));
        await transaction(tx => { for (const item of chunk) item.value === null ? tx.delete(item.ref) : tx.set(item.ref, item.value); });
      }
    },
  };
}

export async function authState(store, baileys) {
  const { BufferJSON, initAuthCreds, proto } = baileys;
  const saved = await store.read('creds', 'main');
  const creds = saved ? JSON.parse(saved, BufferJSON.reviver) : initAuthCreds();
  if (!saved) await store.write([{ type: 'creds', id: 'main', value: JSON.stringify(creds, BufferJSON.replacer) }]);
  let writes = Promise.resolve();
  function enqueue(items) {
    const next = writes.then(() => store.write(items));
    writes = next.catch(() => {}); return next;
  }
  return {
    state: { creds, keys: {
      async get(type, ids) {
        await writes;
        const result = {};
        await Promise.all(ids.map(async id => {
          const raw = await store.read(type, id);
          if (raw) {
            const value = JSON.parse(raw, BufferJSON.reviver);
            result[id] = type === 'app-state-sync-key' ? proto.Message.AppStateSyncKeyData.fromObject(value) : value;
          }
        })); return result;
      },
      async set(data) {
        const items = [];
        for (const [type, values] of Object.entries(data)) for (const [id, value] of Object.entries(values)) items.push({ type, id, value: value == null ? null : JSON.stringify(value, BufferJSON.replacer) });
        await enqueue(items);
      },
    } },
    saveCreds(update) {
      Object.assign(creds, update);
      return enqueue([{ type: 'creds', id: 'main', value: JSON.stringify(creds, BufferJSON.replacer) }]);
    },
    flush() { return writes; },
  };
}
