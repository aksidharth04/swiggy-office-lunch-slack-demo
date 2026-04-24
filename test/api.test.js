import test from 'node:test';
import assert from 'node:assert/strict';

import { createServer } from '../src/server.js';

test('API rejects state-changing requests without a valid CSRF token', async () => {
  const app = createServer({ env: { NODE_ENV: 'test' } });
  const session = await app.inject({
    method: 'GET',
    path: '/api/session',
  });
  const cookie = session.headers['set-cookie'];

  const response = await app.inject({
    method: 'POST',
    path: '/api/orders',
    headers: {
      cookie,
      'content-type': 'application/json',
      'x-demo-csrf': 'wrong-token',
    },
    body: JSON.stringify({
      budgetPerPerson: 250,
      deliveryDeadline: '13:15',
      dietaryRules: ['veg_required'],
      headcount: 4,
      officeLocationId: 'office-indiranagar',
    }),
  });

  assert.equal(response.statusCode, 403);
});

test('API health exposes safe diagnostics without secret values', async () => {
  const app = createServer({
    env: {
      NODE_ENV: 'test',
      SLACK_SIGNING_SECRET: 'secret-signing-value',
      SWIGGY_ADAPTER_MODE: 'swiggy',
      SWIGGY_CLIENT_SECRET: 'secret-provider-value',
    },
  });

  const response = await app.inject({
    method: 'GET',
    path: '/api/health',
  });
  const payload = JSON.parse(response.body);

  assert.equal(response.statusCode, 200);
  assert.equal(payload.ok, true);
  assert.equal(payload.diagnostics.slack.signingSecretConfigured, true);
  assert.deepEqual(payload.diagnostics.swiggy.missing, [
    'SWIGGY_API_BASE_URL',
    'SWIGGY_CLIENT_ID',
  ]);
  assert.equal(JSON.stringify(payload).includes('secret-provider-value'), false);
  assert.equal(JSON.stringify(payload).includes('secret-signing-value'), false);
});

test('API creates, locks, approves, and places a mock order with explicit confirmation', async () => {
  const app = createServer({ env: { NODE_ENV: 'test' } });
  const session = await app.inject({
    method: 'GET',
    path: '/api/session',
  });
  const cookie = session.headers['set-cookie'];
  const csrf = JSON.parse(session.body).csrfToken;

  const create = await app.inject({
    method: 'POST',
    path: '/api/orders',
    headers: {
      cookie,
      'content-type': 'application/json',
      'x-demo-csrf': csrf,
    },
    body: JSON.stringify({
      budgetPerPerson: 250,
      deliveryDeadline: '13:15',
      dietaryRules: ['veg_required'],
      headcount: 4,
      officeLocationId: 'office-indiranagar',
    }),
  });

  assert.equal(create.statusCode, 201);
  const orderId = JSON.parse(create.body).order.id;

  const choice = await app.inject({
    method: 'POST',
    path: `/api/orders/${orderId}/choices`,
    headers: {
      cookie,
      'content-type': 'application/json',
      'x-demo-csrf': csrf,
      'idempotency-key': 'api-choice-1',
    },
    body: JSON.stringify({
      itemId: 'paneer-bowl',
      participantId: 'u-1',
      participantName: 'Anika',
    }),
  });
  assert.equal(choice.statusCode, 200);

  const lock = await app.inject({
    method: 'POST',
    path: `/api/orders/${orderId}/lock`,
    headers: {
      cookie,
      'content-type': 'application/json',
      'x-demo-csrf': csrf,
    },
    body: '{}',
  });
  assert.equal(lock.statusCode, 200);

  const approve = await app.inject({
    method: 'POST',
    path: `/api/orders/${orderId}/approve`,
    headers: {
      cookie,
      'content-type': 'application/json',
      'x-demo-csrf': csrf,
    },
    body: '{}',
  });
  assert.equal(approve.statusCode, 200);
  const approvalToken = JSON.parse(approve.body).approvalToken;

  const place = await app.inject({
    method: 'POST',
    path: `/api/orders/${orderId}/place`,
    headers: {
      cookie,
      'content-type': 'application/json',
      'x-demo-csrf': csrf,
      'idempotency-key': 'api-place-1',
    },
    body: JSON.stringify({ approvalToken }),
  });

  assert.equal(place.statusCode, 200);
  assert.equal(JSON.parse(place.body).order.status, 'placed');
});
