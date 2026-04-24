export const officeLocations = [
  {
    id: 'office-indiranagar',
    name: 'Indiranagar Office',
    city: 'Bengaluru',
  },
  {
    id: 'office-koramangala',
    name: 'Koramangala Office',
    city: 'Bengaluru',
  },
];

export const restaurants = [
  {
    id: 'namma-meals',
    name: 'Namma Meals Co.',
    cuisine: 'South Indian + Bowls',
    etaMinutes: 29,
    reliabilityScore: 96,
    capacity: 40,
    rating: 4.6,
  },
  {
    id: 'north-star-kitchen',
    name: 'North Star Kitchen',
    cuisine: 'North Indian',
    etaMinutes: 34,
    reliabilityScore: 91,
    capacity: 30,
    rating: 4.4,
  },
  {
    id: 'lean-lunch-labs',
    name: 'Lean Lunch Labs',
    cuisine: 'High-protein healthy meals',
    etaMinutes: 26,
    reliabilityScore: 94,
    capacity: 24,
    rating: 4.5,
  },
];

export const menuItems = [
  {
    id: 'paneer-bowl',
    restaurantId: 'namma-meals',
    name: 'Paneer Millet Bowl',
    price: 220,
    isVeg: true,
    tags: ['high-protein', 'veg', 'balanced'],
  },
  {
    id: 'veg-thali',
    restaurantId: 'north-star-kitchen',
    name: 'Executive Veg Thali',
    price: 190,
    isVeg: true,
    tags: ['veg', 'comfort'],
  },
  {
    id: 'idli-combo',
    restaurantId: 'namma-meals',
    name: 'Mini Idli + Sambar Combo',
    price: 140,
    isVeg: true,
    tags: ['veg', 'light'],
  },
  {
    id: 'protein-salad',
    restaurantId: 'lean-lunch-labs',
    name: 'Chickpea Protein Salad',
    price: 240,
    isVeg: true,
    tags: ['high-protein', 'veg', 'healthy'],
  },
  {
    id: 'butter-chicken-combo',
    restaurantId: 'north-star-kitchen',
    name: 'Butter Chicken Rice Combo',
    price: 260,
    isVeg: false,
    tags: ['non-veg', 'comfort'],
  },
  {
    id: 'chicken-bowl',
    restaurantId: 'lean-lunch-labs',
    name: 'Grilled Chicken Quinoa Bowl',
    price: 270,
    isVeg: false,
    tags: ['high-protein', 'non-veg', 'healthy'],
  },
];

export function getMenuItem(itemId) {
  return menuItems.find((item) => item.id === itemId);
}

export function getRestaurant(restaurantId) {
  return restaurants.find((restaurant) => restaurant.id === restaurantId);
}

export function listRecommendedRestaurants({ headcount, budgetPerPerson, dietaryRules }) {
  const vegRequired = dietaryRules.includes('veg_required');

  return restaurants
    .map((restaurant) => {
      const items = menuItems.filter((item) => item.restaurantId === restaurant.id);
      const eligibleItems = items.filter(
        (item) => item.price <= budgetPerPerson && (!vegRequired || item.isVeg),
      );

      return {
        ...restaurant,
        eligibleItemCount: eligibleItems.length,
        fitScore:
          restaurant.reliabilityScore +
          eligibleItems.length * 4 -
          Math.max(0, headcount - restaurant.capacity) * 8 -
          restaurant.etaMinutes / 3,
      };
    })
    .sort((left, right) => right.fitScore - left.fitScore)
    .slice(0, 3);
}
