/**
 * Tiered markup factor based on ex-VAT cost price.
 * Lower-cost items (cables, accessories) carry higher % markup.
 * High-value items (GPUs, CPUs) carry a slimmer but still profitable margin.
 *
 * Sell price (inc-VAT) = costExVat × 1.2 (VAT) × getMarkupFactor(costExVat)
 */
export function getMarkupFactor(costPriceExVat: number): number {
  if (costPriceExVat < 30)  return 1.35; // 35% — cables, accessories, tiny items
  if (costPriceExVat < 75)  return 1.28; // 28% — budget peripherals / components
  if (costPriceExVat < 150) return 1.22; // 22% — mid-range components
  if (costPriceExVat < 300) return 1.18; // 18% — higher-end components
  if (costPriceExVat < 600) return 1.14; // 14% — premium (high-end GPUs, CPUs)
  return 1.10;                           // 10% — very expensive items (£600+ cost)
}

/**
 * Minimum sell price (inc-VAT) for a product, given its ex-VAT cost.
 * This is the absolute floor — never sell below this.
 */
export function minSellPrice(costPriceExVat: number): number {
  return Math.ceil(costPriceExVat * 1.2 * getMarkupFactor(costPriceExVat) * 100) / 100;
}
