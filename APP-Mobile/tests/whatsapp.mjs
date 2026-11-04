import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { createServer } from 'node:http';
import { whatsapp, command, signatureValid, inWindow, reply } from '../backend/lib/backend/src/whatsapp.js';

function database() {
  const data = new Map(); let tail = Promise.resolve();
  const ref = path => ({ path, async update(value) { data.set(path, { ...data.get(path), ...value }); } });
  const snapshot = r => ({ ref: r, exists: data.has(r.path), data: () => data.get(r.path) });
  return { data, doc: ref, batch() {
    const deletes=[]; return {delete(r){deletes.push(r.path);},async commit(){deletes.forEach(p=>data.delete(p));}};
  }, collection(name) {
    return { doc: id => ref(`${name}/${id}`), where(field, op, value) {
      return { limit(n) { return { async get() { const docs=[...data].filter(([k,v]) => k.startsWith(name+'/') && (op==='<' ? v[field]<value : v[field]===value)).slice(0,n).map(([k]) => snapshot(ref(k))); return {docs,empty:docs.length===0}; } }; } };
    } };
  }, runTransaction(fn) {
    const run = tail.then(() => fn({get: async r => snapshot(r), create(r,v) { assert(!data.has(r.path)); data.set(r.path,v); }, set(r,v) {data.set(r.path,v);}, update(r,v) {data.set(r.path,{...data.get(r.path),...v});}}));
    tail = run.catch(()=>{}); return run;
  } };
}
test('assinatura cobre bytes originais e rejeita alterações/segredo ausente', () => {
  const raw=Buffer.from('{"a":1}'); const sig='sha256='+createHmac('sha256','secret').update(raw).digest('hex');
  assert(signatureValid(raw,sig,'secret')); assert(!signatureValid(Buffer.from('{}'),sig,'secret'));
  assert(!signatureValid(raw,sig,'')); assert(!signatureValid(raw,'sha256=invalid','secret'));
});
test('limpeza remove dados antigos e não reenvia envio interrompido', async () => {
  const db=database(); const old=Date.now()-9*86400000;
  db.data.set('whatsappJobs/old',{createdAt:old});db.data.set('whatsappSessions/old',{lastAt:old});
  db.data.set('whatsappJobs/interrupted',{createdAt:Date.now(),state:'sending',startedAt:Date.now()-120000,to:'5547999999999'});
  db.data.set('whatsappBudgets/keep',{reserved:5});
  const bot=whatsapp(db,{WA_ENABLED:'true',WA_APP_SECRET:'test',WA_VERIFY_TOKEN:'verify',WA_PHONE_NUMBER_ID:'123',WA_WABA_ID:'456'});
  await bot.cleanup();assert(!db.data.has('whatsappJobs/old'));assert(!db.data.has('whatsappSessions/old'));
  assert.equal(db.data.get('whatsappJobs/interrupted').state,'review');assert.equal(db.data.get('whatsappJobs/interrupted').to,'');assert(db.data.has('whatsappBudgets/keep'));
});
test('429 tem backoff e três tentativas no máximo; pedido humano pausa e MENU retoma', async () => {
  const db=database();const env={WA_ENABLED:'true',WA_APP_SECRET:'test',WA_VERIFY_TOKEN:'verify',WA_PHONE_NUMBER_ID:'123',WA_WABA_ID:'456',WA_SEND_ENABLED:'true',WA_ACCESS_TOKEN:'fake',WA_GRAPH_VERSION:'v25.0'};
  const month=new Date().toISOString().slice(0,7);db.data.set(`whatsappBudgets/123_${month}`,{exclusivePhone:true,limit:10,reserved:0});
  const item={to:'5547999999999',receivedAt:Date.now(),choice:'6',state:'pending',attempt:0,nextAt:0};db.data.set('whatsappJobs/human',item);
  const original=globalThis.fetch;let calls=0;globalThis.fetch=async()=>{calls++;return new Response('{}',{status:429});};
  try {const bot=whatsapp(db,env);await bot.drain();await bot.drain();assert.equal(calls,1);assert(db.data.get('whatsappJobs/human').nextAt>Date.now());
    for(let i=0;i<2;i++){db.data.get('whatsappJobs/human').nextAt=0;await bot.drain();}
    assert.equal(calls,3);assert.equal(db.data.get('whatsappJobs/human').state,'review');assert.equal(db.data.get('whatsappJobs/human').humanRequested,true);
    globalThis.fetch=async()=>{calls++;return new Response('{}',{status:200});};
    db.data.set('whatsappJobs/paused',{...item,choice:'1',receivedAt:Date.now()+1});await bot.drain();assert.equal(db.data.get('whatsappJobs/paused').state,'suppressed');assert.equal(calls,3);
    db.data.set('whatsappJobs/resume',{...item,choice:'menu',receivedAt:Date.now()+2});await bot.drain();assert.equal(db.data.get('whatsappJobs/resume').state,'sent');assert.equal(calls,4);
  }finally{globalThis.fetch=original;}
});
test('comandos descartam conteúdo livre e janela expirada/futura', () => {
  assert.equal(command(' 6 '),'6'); assert.equal(command('CPF 123 senha segredo'),'menu');
  assert.equal(command('SAIR'),'sair'); assert(inWindow(Date.now()));
  assert(!inWindow(Date.now()-24*3600000)); assert(!inWindow(Date.now()+120000)); assert(!inWindow(NaN));
});
test('menu completo sem acesso a coleções privadas', async () => {
  const db = { collection(name) {
    assert.equal(name, 'news');
    return { where(field, op, value) {
      assert.equal(field, 'status'); assert.equal(value, 'published');
      return { limit() { return { get: async () => ({ docs: [] }) }; } };
    } };
  } };
  for(const choice of ['menu','1','2','3','4','5','6','sair']) assert((await reply(choice,db)).length>20);
});
test('HTTP: verificação, assinatura, duplicatas, isolamento e envio bloqueado', async () => {
  const db=database(); const env={WA_ENABLED:'true',WA_APP_SECRET:'test',WA_VERIFY_TOKEN:'verify',WA_PHONE_NUMBER_ID:'123',WA_WABA_ID:'456'};
  const bot=whatsapp(db,env); const server=createServer(bot.handle);
  await new Promise(r=>server.listen(0,'127.0.0.1',r)); const base=`http://127.0.0.1:${server.address().port}`;
  try {
    assert.equal(await (await fetch(base+'/?hub.mode=subscribe&hub.verify_token=verify&hub.challenge=challenge')).text(),'challenge');
    assert.equal((await fetch(base+'/?hub.mode=subscribe&hub.verify_token=wrong')).status,403);
    const payload={object:'whatsapp_business_account',entry:[{id:'456',changes:[{field:'messages',value:{metadata:{phone_number_id:'123'},messages:[{id:'wamid.test',from:'5547999999999',timestamp:String(Math.floor(Date.now()/1000)),type:'text',text:{body:'minha senha secreta'}}]}}]}]};
    async function post(body,signed=true){const raw=JSON.stringify(body);return fetch(base,{method:'POST',headers:{'x-hub-signature-256':signed?'sha256='+createHmac('sha256','test').update(raw).digest('hex'):'invalid'},body:raw});}
    assert.equal((await post(payload,false)).status,401); assert.equal(db.data.size,0);
    assert.equal((await post(payload)).status,200); assert.equal((await post(payload)).status,200); assert.equal(db.data.size,1);
    assert(!JSON.stringify([...db.data]).includes('secreta'));
    await bot.drain(); assert.equal([...db.data.values()][0].state,'pending');
    payload.entry[0].id='other'; payload.entry[0].changes[0].value.messages[0].id='other'; await post(payload); assert.equal(db.data.size,1);
    env.WA_ENABLED='false'; assert.equal((await fetch(base)).status,503);
  } finally { await new Promise(r=>server.close(r)); }
});
test('reserva atômica limita custo, timeout não reenvia, sucesso não duplica', async () => {
  const db=database(); const env={WA_ENABLED:'true',WA_APP_SECRET:'test',WA_VERIFY_TOKEN:'verify',WA_PHONE_NUMBER_ID:'123',WA_WABA_ID:'456',WA_SEND_ENABLED:'true',WA_ACCESS_TOKEN:'fake',WA_GRAPH_VERSION:'v25.0'};
  const month=new Date().toISOString().slice(0,7); db.data.set(`whatsappBudgets/123_${month}`,{exclusivePhone:true,limit:1,reserved:0});
  for (const id of ['a','b']) db.data.set(`whatsappJobs/${id}`,{to:'5547999999999',receivedAt:Date.now(),choice:'1',state:'pending',attempt:0,nextAt:0});
  const original=globalThis.fetch; let calls=0;
  globalThis.fetch=async(url,opts)=>{calls++; assert(url.startsWith('https://graph.facebook.com/'));assert.equal(JSON.parse(opts.body).type,'text');return new Response('{}',{status:200});};
  try {const bot=whatsapp(db,env); await Promise.all([bot.drain(),bot.drain()]);await bot.drain(); assert.equal(calls,1); assert.equal(db.data.get(`whatsappBudgets/123_${month}`).reserved,1);assert.equal(db.data.get('whatsappJobs/a').state,'sent');
    db.data.set(`whatsappBudgets/123_${month}`,{exclusivePhone:true,limit:2,reserved:1});
    assert.equal(db.data.get('whatsappJobs/b').state,'budget_blocked');
    db.data.set('whatsappJobs/c',{to:'5547999999999',receivedAt:Date.now(),choice:'1',state:'pending',attempt:0,nextAt:0});
    globalThis.fetch=async()=>{calls++;throw Error('timeout');};await bot.drain();await bot.drain();assert.equal(calls,2);assert.equal(db.data.get('whatsappJobs/c').state,'review');
  } finally {globalThis.fetch=original;}
});
