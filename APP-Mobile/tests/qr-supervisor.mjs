import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { startQrSupervisor } from '../backend/lib/backend/src/qrSupervisor.js';

test('bot é opcional; conflito de modos não derruba o servidor', () => {
  const forbidden = () => { throw Error('should not spawn'); };
  assert.equal(startQrSupervisor({}, forbidden).status().state, 'disabled');
  assert.equal(startQrSupervisor({ WA_QR_ENABLED: 'true', WA_ENABLED: 'true' }, forbidden).status().state, 'configuration_error');
});
test('processo isolado não bloqueia início; só aceita estado sanitizado e encerra com segurança', async () => {
  const child = new EventEmitter(); let options;
  child.kill = signal => { assert.equal(signal, 'SIGTERM'); queueMicrotask(() => child.emit('exit', 0)); return true; };
  const supervisor = startQrSupervisor({ WA_QR_ENABLED: 'true' }, (program, args, config) => { options = config; assert(args[0].endsWith('whatsapp-qr/src/server.mjs') || args[0].endsWith('whatsapp-qr\\src\\server.mjs')); return child; });
  assert.equal(supervisor.status().state, 'starting'); assert.equal(options.env.WA_QR_HEADLESS, 'true'); assert.deepEqual(options.stdio, ['ignore', 'ignore', 'ignore', 'ipc']);
  child.emit('message', { type: 'qr-state', state: 'connected', qr: 'must-not-forward' }); assert.deepEqual(supervisor.status(), { state: 'connected' });
  child.emit('message', { type: 'qr-state', state: 'private' }); assert.equal(supervisor.status().state, 'connected');
  await supervisor.stop(); assert.equal(supervisor.status().state, 'offline');
});
test('falha ao abrir processo vira estado de erro e não propaga exceção', () => {
  const supervisor = startQrSupervisor({ WA_QR_ENABLED: 'true' }, () => { throw Error('unavailable'); });
  assert.equal(supervisor.status().state, 'error');
});
