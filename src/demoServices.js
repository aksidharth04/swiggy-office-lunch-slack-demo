import { randomUUID } from 'node:crypto';

import { createSecureToken } from './security.js';
import { createMemoryStore } from './store.js';
import { createSwiggyAdapter } from './swiggyAdapter.js';
import { assertString, requireOrganizerRole, validateOrderInput } from './validation.js';

function nowIso() {
  return new Date().toISOString();
}

function idempotencyKey(tenantId, scope, key) {
  if (!key) {
    return null;
  }

  return `${tenantId}:${scope}:${key}`;
}

function calculateTotals(order) {
  const subtotal = Object.values(order.participants).reduce(
    (sum, participant) => sum + participant.item.price,
    0,
  );
  const platformFee = subtotal > 0 ? 19 : 0;
  const deliveryFee = subtotal > 0 ? 39 : 0;

  return {
    deliveryFee,
    platformFee,
    subtotal,
    total: subtotal + platformFee + deliveryFee,
  };
}

function evaluatePolicy(order) {
  const participants = Object.values(order.participants);
  const violations = [];

  if (
    participants.some((participant) => participant.item.price > order.budgetPerPerson)
  ) {
    violations.push({
      code: 'budget_exceeded',
      message: 'One or more participant choices exceed the per-person budget.',
    });
  }

  if (
    order.dietaryRules.includes('veg_required') &&
    participants.some((participant) => !participant.item.isVeg)
  ) {
    violations.push({
      code: 'veg_required',
      message: 'The order has a non-veg item while veg-only mode is enabled.',
    });
  }

  return violations;
}

function summarizeOrder(order) {
  const participants = Object.values(order.participants);
  const totals = calculateTotals(order);
  const selectedRestaurantIds = [
    ...new Set(participants.map((participant) => participant.item.restaurantId)),
  ];
  const recommendedRestaurantIds = new Set(
    order.recommendedRestaurants.map((restaurant) => restaurant.id),
  );
  const availableMenuItems = order.commerceAdapter
    .getCatalog()
    .menuItems.filter(
      (item) =>
        recommendedRestaurantIds.has(item.restaurantId) &&
        item.price <= order.budgetPerPerson &&
        (!order.dietaryRules.includes('veg_required') || item.isVeg),
    );

  return {
    approvalToken: order.approvalToken,
    availableMenuItems,
    budgetPerPerson: order.budgetPerPerson,
    deliveryDeadline: order.deliveryDeadline,
    dietaryRules: [...order.dietaryRules],
    headcount: order.headcount,
    id: order.id,
    officeLocationId: order.officeLocationId,
    participants,
    policyViolations: evaluatePolicy(order),
    provider: order.provider,
    providerOrderId: order.providerOrderId,
    recommendedRestaurants: order.recommendedRestaurants,
    selectedRestaurants: selectedRestaurantIds.map((restaurantId) =>
      order.commerceAdapter.getRestaurant(restaurantId),
    ),
    status: order.status,
    tenantId: order.tenantId,
    totals,
  };
}

function requireOrderOrganizer(order, actorId, actorRole) {
  requireOrganizerRole(actorRole);
  if (actorRole !== 'admin' && actorId !== order.organizerId) {
    throw new Error('forbidden');
  }
}

export function createDemoServices(options = {}) {
  const commerceAdapter = options.commerceAdapter ?? createSwiggyAdapter();
  const store = options.store ?? createMemoryStore();

  function getTenantOrder({ tenantId, orderId }) {
    const order = store.orders.get({ orderId, tenantId });
    if (!order) {
      throw new Error('not_found');
    }
    return order;
  }

  function saveOrder(order) {
    order.updatedAt = nowIso();
    store.orders.save(order);
  }

  return {
    audit: {
      get events() {
        return store.audit.list();
      },
      record: store.audit.record,
    },
    catalog: {
      ...commerceAdapter.getCatalog(),
      provider: commerceAdapter.providerLabel,
      providerMode: commerceAdapter.mode,
      providerReadiness: commerceAdapter.validateConfig(),
    },
    store,
    orders: {
      createOrderSession(input) {
        requireOrganizerRole(input.organizerRole);
        const validated = validateOrderInput(input);
        const order = {
          ...validated,
          approvalToken: null,
          commerceAdapter,
          createdAt: nowIso(),
          id: randomUUID(),
          organizerId: assertString(input.organizerId, 'organizer_id', { max: 80 }),
          participants: {},
          provider: commerceAdapter.providerLabel,
          providerOrderId: null,
          recommendedRestaurants: commerceAdapter.listRecommendedRestaurants(validated),
          status: 'collecting',
          tenantId: assertString(input.tenantId, 'tenant_id', { max: 80 }),
          updatedAt: nowIso(),
        };

        saveOrder(order);
        store.audit.record({
          action: 'order.created',
          actorId: order.organizerId,
          orderId: order.id,
          tenantId: order.tenantId,
        });
        return summarizeOrder(order);
      },

      submitParticipantChoice(input) {
        const order = getTenantOrder(input);
        if (order.status !== 'collecting') {
          throw new Error('order_not_collecting');
        }

        const scopedKey = idempotencyKey(
          input.tenantId,
          `choice:${input.orderId}:${input.participantId}`,
          input.idempotencyKey,
        );
        if (scopedKey && store.idempotency.has(scopedKey)) {
          return store.idempotency.get(scopedKey);
        }

        const item = order.commerceAdapter.getMenuItem(
          assertString(input.itemId, 'item_id', { max: 80 }),
        );
        if (!item) {
          throw new Error('invalid_item_id');
        }

        const participantId = assertString(input.participantId, 'participant_id', {
          max: 80,
        });
        const participant = {
          item,
          itemId: item.id,
          participantId,
          participantName: assertString(input.participantName, 'participant_name', {
            max: 80,
          }),
          submittedAt: nowIso(),
        };

        order.participants[participantId] = participant;
        saveOrder(order);
        store.audit.record({
          action: 'participant.choice_submitted',
          actorId: participantId,
          itemId: item.id,
          orderId: order.id,
          tenantId: order.tenantId,
        });

        const result = summarizeOrder(order);
        if (scopedKey) {
          store.idempotency.set(scopedKey, result);
        }
        return result;
      },

      lockCart(input) {
        const order = getTenantOrder(input);
        requireOrderOrganizer(order, input.actorId, input.actorRole);
        if (order.status !== 'collecting') {
          throw new Error('order_not_collecting');
        }

        order.status = 'locked';
        saveOrder(order);
        store.audit.record({
          action: 'cart.locked',
          actorId: input.actorId,
          orderId: order.id,
          tenantId: order.tenantId,
        });
        return summarizeOrder(order);
      },

      approveOrder(input) {
        const order = getTenantOrder(input);
        requireOrderOrganizer(order, input.actorId, input.actorRole);
        if (order.status !== 'locked') {
          throw new Error('order_not_locked');
        }

        const violations = evaluatePolicy(order);
        if (violations.length > 0) {
          throw new Error(`policy_violation:${violations.map((item) => item.code).join(',')}`);
        }

        order.approvalToken = createSecureToken(24);
        order.status = 'approved';
        saveOrder(order);
        store.audit.record({
          action: 'approval.granted',
          actorId: input.actorId,
          orderId: order.id,
          tenantId: order.tenantId,
        });
        return {
          approvalToken: order.approvalToken,
          order: summarizeOrder(order),
        };
      },

      placeOrder(input) {
        const order = getTenantOrder(input);
        requireOrderOrganizer(order, input.actorId, input.actorRole);
        const scopedKey = idempotencyKey(
          input.tenantId,
          `place:${input.orderId}`,
          input.idempotencyKey,
        );

        if (scopedKey && store.idempotency.has(scopedKey)) {
          return store.idempotency.get(scopedKey);
        }

        if (order.status !== 'approved' || !order.approvalToken) {
          throw new Error('order_not_approved');
        }

        if (order.approvalToken !== input.approvalToken) {
          throw new Error('order_not_approved');
        }

        const placement = order.commerceAdapter.placeOrder(order);
        order.status = 'placed';
        order.provider = placement.providerLabel ?? order.provider;
        order.providerOrderId = placement.providerOrderId;
        saveOrder(order);
        store.audit.record({
          action: 'order.placed',
          actorId: input.actorId,
          orderId: order.id,
          provider: order.provider,
          providerOrderId: order.providerOrderId,
          tenantId: order.tenantId,
        });

        const result = summarizeOrder(order);
        if (scopedKey) {
          store.idempotency.set(scopedKey, result);
        }
        return result;
      },

      getOrderSummary(input) {
        return summarizeOrder(getTenantOrder(input));
      },
    },
  };
}
