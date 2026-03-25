/**
 * Minimum pricing floor — just enough to cover cost + VAT + a small cushion.
 *
 * These are FLOORS only. The price matcher sets the actual sell price by
 * finding the cheapest internet price and undercutting by £1.
 * A product only sells at the floor if no internet price can be found.
 *
 * Both VIP Computers and Target Components supply prices EXCLUSIVE of VAT.
 * Inc-VAT sell price = costExVat × 1.2 × floor factor
 */

/**
 * Minimum floor factor above cost+VAT.
 * Kept deliberately low so the price matcher can always compete.
 *   1.03 = 3% above VAT-inclusive cost  (most categories)
 *   1.05 = 5% above VAT-inclusive cost  (cables/accessories — harder to match online)
 */
function floorFactor(categorySlug?: string): number {
  if (categorySlug === "cables-adapters") return 1.05;
  return 1.03;
}

/**
 * Minimum profitable sell price (inc-VAT).
 * The price matcher will never set a price below this value.
 */
export function minSellPrice(costExVat: number, categorySlug?: string): number {
  return Math.ceil(costExVat * 1.2 * floorFactor(categorySlug) * 100) / 100;
}

/**
 * Legacy export — kept so existing callers that import getMarkupFactor don't break.
 * Returns the floor factor (not a full markup target).
 */
export function getMarkupFactor(costExVat: number, categorySlug?: string): number {
  return floorFactor(categorySlug);
}
