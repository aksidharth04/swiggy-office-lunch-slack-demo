import test from 'node:test';
import assert from 'node:assert/strict';

import { createMemoryStore } from '../src/store.js';

test('memory store scopes orders by tenant and order id', () => {
  const store = createMemoryStore();
  const order = {
    id: 'order-1',
    tenantId: 'tenant-a',
  };

  store.orders.save(order);

  assert.equal(store.orders.get({ orderId: 'order-1', tenantId: 'tenant-a' }), order);
  assert.equal(store.orders.get({ orderId: 'order-1', tenantId: 'tenant-b' }), null);
});

test('memory store persists idempotency results by exact scoped key', () => {
  const store = createMemoryStore();
  const result = { ok: true };

  store.idempotency.set('tenant:place:key-1', result);

  assert.equal(store.idempotency.has('tenant:place:key-1'), true);
  assert.equal(store.idempotency.get('tenant:place:key-1'), result);
  assert.equal(store.idempotency.has('tenant:place:key-2'), false);
});

test('memory store audit redacts sensitive fields', () => {
  const store = createMemoryStore();

  store.audit.record({
    action: 'provider.request',
    authorization: 'Bearer secret',
    nested: {
      phone: '+919999999999',
      safe: 'visible',
    },
  });

  assert.deepEqual(store.audit.list()[0], {
    action: 'provider.request',
    at: store.audit.list()[0].at,
    authorization: '[REDACTED]',
    nested: {
      phone: '[REDACTED]',
      safe: 'visible',
    },
  });
});
