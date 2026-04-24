import { redactSensitiveFields } from './security.js';

function nowIso() {
  return new Date().toISOString();
}

function orderKey(tenantId, orderId) {
  return `${tenantId}:${orderId}`;
}

export function createMemoryStore() {
  const auditEvents = [];
  const idempotencyResults = new Map();
  const orders = new Map();

  return {
    audit: {
      list() {
        return [...auditEvents];
      },

      record(event) {
        const stored = {
          ...redactSensitiveFields(event),
          at: nowIso(),
        };
        auditEvents.push(stored);
        return stored;
      },
    },

    idempotency: {
      get(key) {
        return idempotencyResults.get(key);
      },

      has(key) {
        return idempotencyResults.has(key);
      },

      set(key, value) {
        idempotencyResults.set(key, value);
        return value;
      },
    },

    orders: {
      get({ orderId, tenantId }) {
        return orders.get(orderKey(tenantId, orderId)) ?? null;
      },

      save(order) {
        orders.set(orderKey(order.tenantId, order.id), order);
        return order;
      },
    },
  };
}
