import {
  getMenuItem,
  getRestaurant,
  listRecommendedRestaurants,
  menuItems,
  officeLocations,
  restaurants,
} from './mockCatalog.js';
import { createConfigError, swiggyReadiness } from './config.js';

function createMockSwiggyAdapter() {
  return {
    mode: 'mock',
    providerLabel: 'Swiggy Mock',

    getCatalog() {
      return {
        menuItems,
        officeLocations,
        restaurants,
      };
    },

    getMenuItem(itemId) {
      return getMenuItem(itemId);
    },

    getRestaurant(restaurantId) {
      return getRestaurant(restaurantId);
    },

    listRecommendedRestaurants(orderInput) {
      return listRecommendedRestaurants(orderInput);
    },

    validateConfig() {
      return {
        missing: [],
        mode: this.mode,
        ok: true,
        provider: this.providerLabel,
      };
    },

    placeOrder(order) {
      return {
        providerLabel: this.providerLabel,
        providerOrderId: `SWIGGY-MOCK-${order.id.slice(0, 8).toUpperCase()}`,
      };
    },
  };
}

function createLiveSwiggyAdapter(config) {
  return {
    mode: 'swiggy',
    providerLabel: 'Swiggy Builders Club',

    getCatalog() {
      return {
        menuItems,
        officeLocations,
        restaurants,
      };
    },

    getMenuItem(itemId) {
      return getMenuItem(itemId);
    },

    getRestaurant(restaurantId) {
      return getRestaurant(restaurantId);
    },

    listRecommendedRestaurants(orderInput) {
      return listRecommendedRestaurants(orderInput);
    },

    validateConfig() {
      return swiggyReadiness({
        ...config,
        SWIGGY_ADAPTER_MODE: 'swiggy',
      });
    },

    placeOrder() {
      const readiness = this.validateConfig();
      if (!readiness.ok) {
        throw createConfigError('swiggy_not_configured', readiness.missing[0]);
      }

      throw createConfigError('swiggy_live_adapter_not_implemented');
    },
  };
}

export function createSwiggyAdapter(options = {}) {
  const { env = process.env, mode = env.SWIGGY_ADAPTER_MODE ?? 'mock' } = options;

  if (mode === 'swiggy') {
    return createLiveSwiggyAdapter(env);
  }

  return createMockSwiggyAdapter();
}
