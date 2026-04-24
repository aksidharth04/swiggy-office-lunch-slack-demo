import test from 'node:test';
import assert from 'node:assert/strict';

import { createDemoServices } from '../src/demoServices.js';
import { createSwiggyAdapter } from '../src/swiggyAdapter.js';

function startOrder(services, overrides = {}) {
  return services.orders.createOrderSession({
    tenantId: 'tenant-acme',
    organizerId: 'u-organizer',
    organizerRole: 'organizer',
    officeLocationId: 'office-indiranagar',
    budgetPerPerson: 250,
    headcount: 4,
    deliveryDeadline: '13:15',
    dietaryRules: ['veg_required'],
    ...overrides,
  });
}

test('order flow blocks cross-tenant participant choices', () => {
  const services = createDemoServices();
  const order = startOrder(services);

  assert.throws(
    () =>
      services.orders.submitParticipantChoice({
        tenantId: 'tenant-other',
        orderId: order.id,
        participantId: 'u-1',
        participantName: 'Anika',
        itemId: 'paneer-bowl',
        idempotencyKey: 'choice-u-1',
      }),
    /not_found/,
  );
});

test('order flow requires lock and explicit approval before placement', () => {
  const services = createDemoServices();
  const order = startOrder(services);

  assert.throws(
    () =>
      services.orders.placeOrder({
        tenantId: 'tenant-acme',
        orderId: order.id,
        actorId: 'u-organizer',
        actorRole: 'organizer',
        approvalToken: 'not-approved',
        idempotencyKey: 'place-1',
      }),
    /order_not_approved/,
  );

  services.orders.submitParticipantChoice({
    tenantId: 'tenant-acme',
    orderId: order.id,
    participantId: 'u-1',
    participantName: 'Anika',
    itemId: 'paneer-bowl',
    idempotencyKey: 'choice-u-1',
  });

  services.orders.lockCart({
    tenantId: 'tenant-acme',
    orderId: order.id,
    actorId: 'u-organizer',
    actorRole: 'organizer',
  });

  assert.throws(
    () =>
      services.orders.placeOrder({
        tenantId: 'tenant-acme',
        orderId: order.id,
        actorId: 'u-organizer',
        actorRole: 'organizer',
        approvalToken: 'not-approved',
        idempotencyKey: 'place-1',
      }),
    /order_not_approved/,
  );

  const approval = services.orders.approveOrder({
    tenantId: 'tenant-acme',
    orderId: order.id,
    actorId: 'u-organizer',
    actorRole: 'organizer',
  });

  const placed = services.orders.placeOrder({
    tenantId: 'tenant-acme',
    orderId: order.id,
    actorId: 'u-organizer',
    actorRole: 'organizer',
    approvalToken: approval.approvalToken,
    idempotencyKey: 'place-1',
  });

  assert.equal(placed.status, 'placed');
  assert.match(placed.providerOrderId, /^SWIGGY-MOCK-/);
});

test('order placement is idempotent for duplicate confirmation requests', () => {
  const services = createDemoServices();
  const order = startOrder(services);

  services.orders.submitParticipantChoice({
    tenantId: 'tenant-acme',
    orderId: order.id,
    participantId: 'u-1',
    participantName: 'Anika',
    itemId: 'paneer-bowl',
    idempotencyKey: 'choice-u-1',
  });
  services.orders.lockCart({
    tenantId: 'tenant-acme',
    orderId: order.id,
    actorId: 'u-organizer',
    actorRole: 'organizer',
  });
  const approval = services.orders.approveOrder({
    tenantId: 'tenant-acme',
    orderId: order.id,
    actorId: 'u-organizer',
    actorRole: 'organizer',
  });

  const first = services.orders.placeOrder({
    tenantId: 'tenant-acme',
    orderId: order.id,
    actorId: 'u-organizer',
    actorRole: 'organizer',
    approvalToken: approval.approvalToken,
    idempotencyKey: 'place-duplicate',
  });
  const second = services.orders.placeOrder({
    tenantId: 'tenant-acme',
    orderId: order.id,
    actorId: 'u-organizer',
    actorRole: 'organizer',
    approvalToken: approval.approvalToken,
    idempotencyKey: 'place-duplicate',
  });

  assert.deepEqual(second, first);
  assert.equal(
    services.audit.events.filter((event) => event.action === 'order.placed').length,
    1,
  );
});

test('policy engine reports budget and dietary violations before approval', () => {
  const services = createDemoServices();
  const order = startOrder(services, { budgetPerPerson: 150 });

  services.orders.submitParticipantChoice({
    tenantId: 'tenant-acme',
    orderId: order.id,
    participantId: 'u-1',
    participantName: 'Dev',
    itemId: 'butter-chicken-combo',
    idempotencyKey: 'choice-u-1',
  });
  services.orders.lockCart({
    tenantId: 'tenant-acme',
    orderId: order.id,
    actorId: 'u-organizer',
    actorRole: 'organizer',
  });

  assert.throws(
    () =>
      services.orders.approveOrder({
        tenantId: 'tenant-acme',
        orderId: order.id,
        actorId: 'u-organizer',
        actorRole: 'organizer',
      }),
    /policy_violation/,
  );

  const summary = services.orders.getOrderSummary({
    tenantId: 'tenant-acme',
    orderId: order.id,
  });

  assert.deepEqual(
    summary.policyViolations.map((violation) => violation.code).sort(),
    ['budget_exceeded', 'veg_required'].sort(),
  );
});

test('services expose the selected adapter provider and mode', () => {
  const services = createDemoServices({
    commerceAdapter: createSwiggyAdapter({ mode: 'mock' }),
  });
  const order = startOrder(services);

  assert.equal(services.catalog.provider, 'Swiggy Mock');
  assert.equal(services.catalog.providerMode, 'mock');
  assert.equal(order.provider, 'Swiggy Mock');
});

test('swiggy adapter boundary can be switched to live mode without changing service calls', () => {
  const services = createDemoServices({
    commerceAdapter: createSwiggyAdapter({
      env: {},
      mode: 'swiggy',
    }),
  });
  const order = startOrder(services);

  services.orders.submitParticipantChoice({
    tenantId: 'tenant-acme',
    orderId: order.id,
    participantId: 'u-1',
    participantName: 'Anika',
    itemId: 'paneer-bowl',
    idempotencyKey: 'choice-u-1',
  });
  services.orders.lockCart({
    tenantId: 'tenant-acme',
    orderId: order.id,
    actorId: 'u-organizer',
    actorRole: 'organizer',
  });
  const approval = services.orders.approveOrder({
    tenantId: 'tenant-acme',
    orderId: order.id,
    actorId: 'u-organizer',
    actorRole: 'organizer',
  });

  assert.throws(
    () =>
      services.orders.placeOrder({
        tenantId: 'tenant-acme',
        orderId: order.id,
        actorId: 'u-organizer',
        actorRole: 'organizer',
        approvalToken: approval.approvalToken,
        idempotencyKey: 'place-live',
      }),
    /swiggy_not_configured:SWIGGY_API_BASE_URL/,
  );
});
