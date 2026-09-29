import { test } from 'node:test';
import assert from 'node:assert/strict';
import { verifyMessage, verifyEnvelope, REFEREE } from '../lib/evidence.ts';
const message = {
  from: REFEREE,
  text: '{"file":"b71f2587d5a0963037232439985a1d939fd5e0766a968fe7117ecd8b20a29da4","mark":"226.14","n":1,"t":"pnl","top":[]}',
  nonce: 1790337923261,
  sig: 'kkqcQ96IggTeoC3TRgwZprLM_xO_QstZbZ8GwqNWLJ-vCnNk2GVBCoBY53HuqB5Dpz89ikl5f_ZxphzTuND7BA',
};
test('real public referee fixture verifies', async () =>
  assert.equal((await verifyMessage(message)).n, 1));
test('tampered text fails', async () =>
  assert.rejects(
    verifyMessage({
      ...message,
      text: message.text.replace('226.14', '999.99'),
    }),
  ));
test('wrong sender fails', async () =>
  assert.rejects(verifyMessage({ ...message, from: REFEREE + 'x' })));
test('wrong room fails', async () =>
  assert.rejects(verifyEnvelope(message, 'wrong-room')));
test('unsafe numeric nonce fails', async () =>
  assert.rejects(
    verifyMessage({ ...message, nonce: Number.MAX_SAFE_INTEGER + 1 }),
  ));
test('tampered nonce fails', async () =>
  assert.rejects(verifyMessage({ ...message, nonce: message.nonce + 1 })));
test('noncanonical signature fails', async () =>
  assert.rejects(verifyMessage({ ...message, sig: message.sig + '=' })));
test('missing message fails', async () => assert.rejects(verifyMessage(null)));
