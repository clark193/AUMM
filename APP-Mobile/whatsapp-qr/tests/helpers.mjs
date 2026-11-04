export function database() {
  const data = new Map(); let tail = Promise.resolve();
  const snapshot = ref => ({ ref, exists: data.has(ref.path), data: () => data.has(ref.path) ? structuredClone(data.get(ref.path)) : undefined });
  const doc = path => ({ path, get: async () => snapshot(doc(path)), async update(value) { data.set(path, { ...data.get(path), ...structuredClone(value) }); } });
  return { data, doc, collection(name) { return { where(field, op, value) { return { limit(n) { return { async get() {
    const docs = [...data].filter(([path, v]) => path.startsWith(name + '/') && (op === '<' ? v[field] < value : v[field] === value)).slice(0, n).map(([path]) => snapshot(doc(path)));
    return { docs, empty: !docs.length };
  } }; } }; } }; },
    runTransaction(fn) {
      const next = tail.then(async () => {
        const ops = []; const tx = { get: async ref => snapshot(ref), set: (ref, value) => ops.push(() => data.set(ref.path, structuredClone(value))),
          update: (ref, value) => ops.push(() => data.set(ref.path, { ...data.get(ref.path), ...structuredClone(value) })),
          delete: ref => ops.push(() => data.delete(ref.path)), create(ref, value) { if (data.has(ref.path)) throw Error('exists'); ops.push(() => data.set(ref.path, structuredClone(value))); } };
        const result = await fn(tx); ops.forEach(op => op()); return result;
      }); tail = next.catch(() => {}); return next;
    },
  };
}
