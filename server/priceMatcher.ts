import { storage } from "./storage";

const MIN_MARGIN = 0.05;
const UK_PRICE_REGEX = /£\s?([\d,]+(?:\.\d{2})?)/g;

interface PriceMatchResult {
  totalProcessed: number;
  priceUpdated: number;
  noResultsFound: number;
  keptExisting: number;
  errors: number;
}

function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function extractPricesFromHtml(html: string): number | null {
  const prices: number[] = [];
  let match;
  const regex = new RegExp(UK_PRICE_REGEX.source, "g");

  while ((match = regex.exec(html)) !== null) {
    const priceStr = match[1].replace(/,/g, "");
    const price = parseFloat(priceStr);
    if (price >= 5 && price <= 50000) {
      prices.push(price);
    }
  }

  if (prices.length === 0) return null;

  prices.sort((a, b) => a - b);

  const q1Index = Math.floor(prices.length * 0.25);
  const q3Index = Math.floor(prices.length * 0.75);
  const filteredPrices = prices.slice(q1Index, q3Index + 1);

  if (filteredPrices.length === 0) {
    return prices[Math.floor(prices.length / 2)];
  }

  const median = filteredPrices[Math.floor(filteredPrices.length / 2)];
  return Math.round(median * 100) / 100;
}

async function tryDuckDuckGo(searchTerm: string): Promise<number | null> {
  try {
    const query = encodeURIComponent(searchTerm);
    const url = `https://html.duckduckgo.com/html/?q=${query}`;
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept": "text/html",
      },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return null;
    const html = await res.text();
    if (html.includes("<html") && html.includes("£")) {
      return extractPricesFromHtml(html);
    }
    return null;
  } catch {
    return null;
  }
}

async function tryBingSearch(searchTerm: string): Promise<number | null> {
  try {
    const query = encodeURIComponent(searchTerm);
    const url = `https://www.bing.com/search?q=${query}&cc=gb`;
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml",
        "Accept-Language": "en-GB,en;q=0.9",
      },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return null;
    const html = await res.text();
    if (html.includes("<html") && html.includes("£")) {
      return extractPricesFromHtml(html);
    }
    return null;
  } catch {
    return null;
  }
}

async function tryPriceSpy(productName: string): Promise<number | null> {
  try {
    const query = encodeURIComponent(productName);
    const url = `https://pricespy.co.uk/search?search=${query}`;
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html",
      },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return null;
    const html = await res.text();
    if (html.includes("£")) {
      return extractPricesFromHtml(html);
    }
    return null;
  } catch {
    return null;
  }
}

async function searchProductPrice(productName: string, manufacturer?: string): Promise<number | null> {
  const searchTerm = manufacturer
    ? `${manufacturer} ${productName} price UK buy`
    : `${productName} price UK buy`;

  let price = await tryDuckDuckGo(searchTerm);
  if (price) return price;

  await delay(1000);

  price = await tryBingSearch(searchTerm);
  if (price) return price;

  await delay(1000);

  const shortName = productName.length > 50 ? productName.substring(0, 50) : productName;
  price = await tryPriceSpy(shortName);
  if (price) return price;

  return null;
}

const matchedProductIds = new Set<number>();

export function getMatchProgress() {
  return { matched: matchedProductIds.size };
}

export function resetMatchProgress() {
  matchedProductIds.clear();
}

export async function matchInternetPrices(batchSize = 50): Promise<PriceMatchResult> {
  const allProducts = await storage.getProducts();
  const productsWithCost = allProducts.filter(p => p.costPrice && p.costPrice > 0);
  const unmatched = productsWithCost.filter(p => !matchedProductIds.has(p.id));

  console.log(`[PriceMatcher] ${productsWithCost.length} total with cost, ${matchedProductIds.size} already matched this session, ${unmatched.length} remaining`);

  const result: PriceMatchResult = {
    totalProcessed: 0,
    priceUpdated: 0,
    noResultsFound: 0,
    keptExisting: 0,
    errors: 0,
  };

  if (unmatched.length === 0) {
    console.log(`[PriceMatcher] All products have been matched this session. Use "Reset" to start over.`);
    matchedProductIds.clear();
    return { ...result, totalProcessed: 0 };
  }

  const batch = unmatched.slice(0, batchSize);

  for (const product of batch) {
    try {
      result.totalProcessed++;

      const shortName = product.name.length > 60 ? product.name.substring(0, 60) : product.name;
      const internetPrice = await searchProductPrice(shortName, product.vendor || undefined);

      if (!internetPrice) {
        result.noResultsFound++;
        await delay(1500);
        continue;
      }

      const costPrice = product.costPrice!;
      const costPlusVat = costPrice * 1.2;
      const minSellPrice = Math.ceil(costPlusVat * (1 + MIN_MARGIN) * 100) / 100;

      let newPrice: number;
      if (internetPrice >= minSellPrice) {
        newPrice = internetPrice;
      } else {
        newPrice = minSellPrice;
      }

      if (Math.abs(product.price - newPrice) > 0.50) {
        const updates: Record<string, any> = { price: newPrice };
        if (product.price > newPrice) {
          updates.compareAtPrice = product.price;
        }
        await storage.updateProduct(product.id, updates);
        result.priceUpdated++;
        console.log(`[PriceMatcher] ${product.name}: £${product.price.toFixed(2)} → £${newPrice.toFixed(2)} (internet: £${internetPrice.toFixed(2)}, cost: £${costPrice.toFixed(2)})`);
      } else {
        result.keptExisting++;
      }

      matchedProductIds.add(product.id);
      await delay(3000);
    } catch (e: any) {
      result.errors++;
      matchedProductIds.add(product.id);
      console.error(`[PriceMatcher] Error matching ${product.name}:`, e.message);
    }
  }

  console.log(`[PriceMatcher] Complete: ${result.priceUpdated} updated, ${result.noResultsFound} no results, ${result.keptExisting} kept, ${result.errors} errors`);
  return result;
}
