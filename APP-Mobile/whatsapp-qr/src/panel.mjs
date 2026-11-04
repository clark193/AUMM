import { randomBytes, timingSafeEqual } from 'node:crypto';
import QRCode from 'qrcode';

const html = `<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>AUMM · Conectar WhatsApp</title><style>body{font:18px system-ui;margin:40px auto;padding:0 24px;max-width:650px;background:#fafafa;color:#222}h1{font-size:28px}img{width:300px;max-width:90%;display:block;margin:20px 0}button{padding:12px 18px;font:inherit;cursor:pointer}small{display:block;margin-top:20px}#status{font-weight:bold}#qr[hidden]{display:none}</style><h1>AUMM · Conectar WhatsApp</h1><p id="status">Preparando conexão…</p><img id="qr" alt="QR code para vincular o bot AUMM" hidden><p>No celular da associação, abra <b>WhatsApp Business → Aparelhos conectados → Conectar um aparelho</b> e leia o QR code desta tela.</p><p>A vinculação usa uma ferramenta não oficial. Não apague sua conta nem migre o número. Não compartilhe esta tela.</p><p id="mode"></p><p id="counts"></p><button id="stop">Parar o bot neste computador</button><small>Enquanto rodar aqui, o bot depende deste computador ligado. A hospedagem em nuvem ainda precisa ser configurada.</small><script src="/panel.js"></script></html>`;
const script = `const labels={starting:'Iniciando…',pairing:'Leia o QR code pelo WhatsApp Business',connected:'WhatsApp conectado',reconnecting:'Reconectando…',needs_pairing:'A vinculação precisa ser revisada no aparelho',error:'Conexão interrompida. Não houve exposição de credenciais.',stopped:'Bot parado'};async function refresh(){try{const r=await fetch('/status',{cache:'no-store'});if(!r.ok)return;const s=await r.json();document.getElementById('status').textContent=(labels[s.state]||s.state)+(s.account?' · '+s.account:'');document.getElementById('mode').textContent=s.sendEnabled?'Respostas automáticas habilitadas para os remetentes configurados.':'Respostas automáticas desativadas. Nenhuma mensagem será enviada ao conectar.';document.getElementById('counts').textContent='Respostas aceitas pelo transporte: '+s.accepted+' · Pendências: '+s.review;const q=document.getElementById('qr');q.hidden=!s.qr;if(s.qr)q.src=s.qr;else q.removeAttribute('src');}catch{document.getElementById('status').textContent='Servidor local indisponível.';}}document.getElementById('stop').onclick=async()=>{const r=await fetch('/stop',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});if(r.ok){document.getElementById('status').textContent='Bot parado';document.getElementById('qr').hidden=true;}};refresh();setInterval(refresh,3000);`;

export function panel({ port, status, stop }) {
  const token = randomBytes(32).toString('hex');
  const host = `127.0.0.1:${port}`;
  function authorized(req) {
    const value = /(?:^|; )aumm_qr=([a-f0-9]{64})(?:;|$)/.exec(req.headers.cookie || '')?.[1];
    return !!value && timingSafeEqual(Buffer.from(value), Buffer.from(token));
  }
  return async function handle(req, res) {
    res.setHeader('Cache-Control', 'no-store'); res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('X-Content-Type-Options', 'nosniff'); res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Content-Security-Policy', "default-src 'none'; script-src 'self'; style-src 'unsafe-inline'; img-src data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'");
    if (req.headers.host !== host || !['127.0.0.1', '::ffff:127.0.0.1'].includes(req.socket.remoteAddress) || (req.headers['sec-fetch-site'] && !['same-origin', 'none'].includes(req.headers['sec-fetch-site']))) { res.writeHead(403); res.end(); return; }
    const path = req.url;
    if (req.method === 'GET' && path === '/') {
      res.setHeader('Set-Cookie', `aumm_qr=${token}; HttpOnly; SameSite=Strict; Path=/`);
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }); res.end(html); return;
    }
    if (!authorized(req)) { res.writeHead(401); res.end(); return; }
    if (req.method === 'GET' && path === '/panel.js') { res.writeHead(200, { 'Content-Type': 'text/javascript; charset=utf-8' }); res.end(script); return; }
    if (req.method === 'GET' && path === '/status') {
      const current = status();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ...current, qr: current.qr ? await QRCode.toDataURL(current.qr, { width: 320, margin: 2 }) : null })); return;
    }
    if (req.method === 'POST' && path === '/stop' && req.headers.origin === `http://${host}`) { await stop(); res.writeHead(200); res.end('{}'); return; }
    res.writeHead(404); res.end();
  };
}
