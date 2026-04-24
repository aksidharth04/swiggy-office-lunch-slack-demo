const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;
const DIETARY_RULES = new Set(['veg_required', 'jain_friendly', 'high_protein']);
const OFFICE_LOCATION_IDS = new Set(['office-indiranagar', 'office-koramangala']);

export function assertString(value, field, { min = 1, max = 120 } = {}) {
  if (typeof value !== 'string') {
    throw new Error(`invalid_${field}`);
  }

  const trimmed = value.trim();
  if (trimmed.length < min || trimmed.length > max) {
    throw new Error(`invalid_${field}`);
  }

  return trimmed;
}

export function assertInteger(value, field, { min, max }) {
  if (!Number.isInteger(value) || value < min || value > max) {
    throw new Error(`invalid_${field}`);
  }

  return value;
}

export function validateOrderInput(input) {
  const dietaryRules = Array.isArray(input.dietaryRules) ? input.dietaryRules : [];

  for (const rule of dietaryRules) {
    if (!DIETARY_RULES.has(rule)) {
      throw new Error('invalid_dietary_rule');
    }
  }

  const officeLocationId = assertString(input.officeLocationId, 'office_location_id', {
    max: 64,
  });
  if (!OFFICE_LOCATION_IDS.has(officeLocationId)) {
    throw new Error('invalid_office_location_id');
  }

  const deliveryDeadline = assertString(input.deliveryDeadline, 'delivery_deadline', {
    max: 5,
  });
  if (!TIME_PATTERN.test(deliveryDeadline)) {
    throw new Error('invalid_delivery_deadline');
  }

  return {
    budgetPerPerson: assertInteger(input.budgetPerPerson, 'budget_per_person', {
      min: 50,
      max: 5000,
    }),
    deliveryDeadline,
    dietaryRules,
    headcount: assertInteger(input.headcount, 'headcount', { min: 1, max: 100 }),
    officeLocationId,
  };
}

export function requireOrganizerRole(role) {
  if (!['admin', 'organizer'].includes(role)) {
    throw new Error('forbidden');
  }
}
