/**
 * Category-aware, cost-scaled minimum pricing.
 *
 * Sell price (inc-VAT) = costExVat × 1.2 (VAT) × getMarkupFactor(cost, categorySlug)
 *
 * Base markups reflect real UK PC component market norms. Within each category,
 * expensive items get a further reduction so high-end products stay competitive.
 */

const CATEGORY_MARKUP: Record<string, number> = {
  // Very tight — heavily comparison-shopped, razor-thin retail margins
  "graphics-cards":         1.10,
  "processors":             1.10,
  "laptops":                1.10,
  "tablets":                1.10,

  // Competitive but with slightly more flexibility
  "monitors":               1.12,
  "memory":                 1.13,
  "motherboards":           1.14,
  "storage":                1.15,
  "networking":             1.14,
  "ups-power-protection":   1.14,
  "servers-workstations":   1.14,

  // Good margin — less commoditised, SRP generally respected
  "cases":                  1.18,
  "power-supplies":         1.18,
  "cpu-cooling":            1.18,
  "liquid-cooling":         1.18,
  "sound-cards":            1.18,
  "gaming-controllers":     1.20,
  "webcams-cameras":        1.20,
  "printers":               1.20,
  "scanners-multifunction": 1.20,

  // Healthy margin — branded peripherals with SRP flexibility
  "keyboards":              1.22,
  "mice":                   1.22,
  "headsets":               1.22,
  "software":               1.25,
  "ink-toner":              1.25,

  // High margin — low-value, high-convenience
  "cables-adapters":        1.35,
};

function costFallback(cost: number): number {
  if (cost < 30)  return 1.28;
  if (cost < 75)  return 1.22;
  if (cost < 150) return 1.18;
  if (cost < 300) return 1.16;
  if (cost < 600) return 1.13;
  return 1.10;
}

/**
 * Returns the markup multiplier for a product.
 * Category sets the base; cost-based scaling compresses margins further for
 * expensive items (so high-end products stay competitive) and boosts them for
 * very cheap items (so absolute profit per unit isn't pennies).
 */
export function getMarkupFactor(costPriceExVat: number, categorySlug?: string): number {
  const base: number = (categorySlug ? CATEGORY_MARKUP[categorySlug] : undefined) ?? costFallback(costPriceExVat);

  let scaled = base;
  if (costPriceExVat > 600) {
    scaled = Math.max(base * 0.80, 1.04);   // very expensive (>£600): floor at 4% — keeps flagship CPUs/GPUs competitive
  } else if (costPriceExVat > 300) {
    scaled = Math.max(base * 0.87, 1.06);   // expensive (£300–£600): floor at 6%
  } else if (costPriceExVat > 150) {
    scaled = Math.max(base * 0.93, 1.08);   // mid-range (£150–£300): floor at 8%
  } else if (costPriceExVat < 20) {
    scaled = Math.min(base * 1.15, 1.40);   // cheap items (<£20): boost up to 40% cap
  }

  return Math.round(scaled * 1000) / 1000;
}

/**
 * Minimum profitable sell price (inc-VAT).
 * The price matcher will never go below this value.
 */
export function minSellPrice(costPriceExVat: number, categorySlug?: string): number {
  return Math.ceil(costPriceExVat * 1.2 * getMarkupFactor(costPriceExVat, categorySlug) * 100) / 100;
}
