import { createHmac } from 'node:crypto';
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  redactSensitiveFields,
  verifySlackSignature,
  verifySessionCsrf,
} from '../src/security.js';

function slackSignature(secret, timestamp, body) {
  return `v0=${createHmac('sha256', secret)
    .update(`v0:${timestamp}:${body}`)
    .digest('hex')}`;
}

test('verifySlackSignature accepts a valid signed Slack request', () => {
  const secret = 'test-signing-secret';
  const body = '{"command":"/swiggy-lunch","text":"team lunch"}';
  const timestamp = String(Math.floor(Date.now() / 1000));
  const signature = slackSignature(secret, timestamp, body);

  const result = verifySlackSignature({
    body,
    signature,
    signingSecret: secret,
    timestamp,
  });

  assert.equal(result.ok, true);
});

test('verifySlackSignature rejects stale requests and bad signatures', () => {
  const secret = 'test-signing-secret';
  const body = '{"command":"/swiggy-lunch"}';
  const staleTimestamp = String(Math.floor(Date.now() / 1000) - 600);

  const stale = verifySlackSignature({
    body,
    signature: slackSignature(secret, staleTimestamp, body),
    signingSecret: secret,
    timestamp: staleTimestamp,
  });

  const forged = verifySlackSignature({
    body,
    signature: 'v0=not-real',
    signingSecret: secret,
    timestamp: String(Math.floor(Date.now() / 1000)),
  });

  assert.deepEqual(stale, { ok: false, reason: 'stale_timestamp' });
  assert.deepEqual(forged, { ok: false, reason: 'invalid_signature' });
});

test('verifySessionCsrf requires the request token to match the session token', () => {
  assert.equal(
    verifySessionCsrf({
      expectedToken: 'known-token',
      providedToken: 'known-token',
    }).ok,
    true,
  );

  assert.deepEqual(
    verifySessionCsrf({
      expectedToken: 'known-token',
      providedToken: 'wrong-token',
    }),
    { ok: false, reason: 'csrf_mismatch' },
  );
});

test('redactSensitiveFields removes address, phone, and token values before logging', () => {
  const event = redactSensitiveFields({
    address: '12 MG Road',
    phone: '+919999999999',
    nested: {
      swiggyToken: 'secret-token',
      safe: 'visible',
    },
  });

  assert.deepEqual(event, {
    address: '[REDACTED]',
    phone: '[REDACTED]',
    nested: {
      swiggyToken: '[REDACTED]',
      safe: 'visible',
    },
  });
});
