import { createRequire } from 'node:module';
import { readFile } from 'node:fs/promises';
import { start } from '../src/server.mjs';

// Somente neste computador: reutiliza o login Firebase CLI já autorizado.
// Não envia, grava ou exibe refresh tokens. Não publicar credenciais CLI na hospedagem.
async function main() {
  const cli = createRequire(new URL('../../package.json', import.meta.url));
  const account = cli('firebase-tools/lib/auth.js').getGlobalDefaultAccount();
  if (!account?.tokens?.refresh_token) throw Error('Faça login no Firebase CLI.');
  const api = cli('firebase-tools/lib/api.js');
  const credentials = { type: 'authorized_user', client_id: api.clientId(), client_secret: api.clientSecret(), refresh_token: account.tokens.refresh_token };
  const require = createRequire(import.meta.url);
  const { Firestore } = require('@google-cloud/firestore');
  const db = new Firestore({ projectId: 'aumm-21dda', credentials, preferRest: true });
  const key = Buffer.from((await readFile(process.env.WA_QR_KEY_FILE, 'utf8')).trim(), 'base64');
  const { reply } = await import('../../backend/lib/backend/src/whatsapp.js');
  await start({ db, key, renderReply: reply, local: true });
  process.stdout.write('Painel local pronto: http://127.0.0.1:8799\n');
}
main().catch(() => { process.stderr.write('AUMM QR: início local indisponível. Confira acesso Firebase, chave protegida e se há outra instância aberta.\n'); process.exitCode = 1; });
