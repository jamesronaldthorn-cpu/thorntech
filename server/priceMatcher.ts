import { storage } from "./storage";

const MIN_MARGIN = 0.02;
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

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

async function fetchPage(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": UA,
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-GB,en;q=0.9",
        "Accept-Encoding": "identity",
      },
      signal: AbortSignal.timeout(12000),
      redirect: "follow",
    });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

function extractPricesFromDataAttrs(html: string): number[] {
  const prices: number[] = [];
  const dataPrice = /data-price="([\d.]+)"/gi;
  let match;
  while ((match = dataPrice.exec(html)) !== null) {
    const p = parseFloat(match[1]);
    if (p >= 1 && p <= 50000) prices.push(p);
  }
  return prices;
}

function extractPricesFromText(html: string): number[] {
  const prices: number[] = [];
  const regex = /£\s?([\d,]+\.\d{2})/g;
  let match;
  while ((match = regex.exec(html)) !== null) {
    const p = parseFloat(match[1].replace(/,/g, ""));
    if (p >= 5 && p <= 50000) prices.push(p);
  }
  return prices;
}

function extractPricesFromJsonLd(html: string): number[] {
  const prices: number[] = [];
  const jsonLdRegex = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match;
  while ((match = jsonLdRegex.exec(html)) !== null) {
    try {
      const data = JSON.parse(match[1]);
      const items = Array.isArray(data) ? data : [data];
      for (const item of items) {
        const offers = item.offers || item.Offers;
        if (offers) {
          const offerList = Array.isArray(offers) ? offers : [offers];
          for (const offer of offerList) {
            const p = parseFloat(offer.price || offer.lowPrice || "0");
            if (p >= 1 && p <= 50000 && (offer.priceCurrency === "GBP" || !offer.priceCurrency)) {
              prices.push(p);
            }
          }
        }
      }
    } catch {}
  }
  return prices;
}

function getBestPrice(prices: number[], costPlusVatMargin: number): number | null {
  if (prices.length === 0) return null;

  const validPrices = [...new Set(prices)].filter(p => p >= costPlusVatMargin * 0.5).sort((a, b) => a - b);
  if (validPrices.length === 0) return null;

  if (validPrices.length === 1) return validPrices[0];
  if (validPrices.length === 2) return Math.min(validPrices[0], validPrices[1]);

  const q1 = Math.floor(validPrices.length * 0.25);
  const q3 = Math.floor(validPrices.length * 0.75);
  const iqr = validPrices.slice(q1, q3 + 1);
  if (iqr.length > 0) {
    return iqr[0];
  }
  return validPrices[Math.floor(validPrices.length / 2)];
}

function buildSearchTerms(name: string, vendor?: string, mpn?: string): string[] {
  const terms: string[] = [];

  if (mpn && mpn.length > 3) {
    terms.push(mpn);
  }

  const shortName = name
    .replace(/\([^)]*\)/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .substring(0, 60);

  if (vendor && !shortName.toLowerCase().startsWith(vendor.toLowerCase())) {
    terms.push(`${vendor} ${shortName}`);
  }
  terms.push(shortName);

  const words = shortName.split(/\s+/).slice(0, 5).join(" ");
  if (words !== shortName && words.length > 10) {
    terms.push(words);
  }

  return terms;
}

async function searchScanPrices(searchTerm: string): Promise<number[]> {
  const query = encodeURIComponent(searchTerm);
  const html = await fetchPage(`https://www.scan.co.uk/search?q=${query}`);
  if (!html) return [];

  const dataPrices = extractPricesFromDataAttrs(html);
  if (dataPrices.length > 0) return dataPrices;

  const textPrices = extractPricesFromText(html);
  return textPrices;
}

async function searchAmazonPrices(searchTerm: string): Promise<number[]> {
  const query = encodeURIComponent(searchTerm);
  const html = await fetchPage(`https://www.amazon.co.uk/s?k=${query}`);
  if (!html) return [];

  const allPrices: number[] = [];

  const wholePartRegex = /class="a-price-whole">([\d,]+)<.*?class="a-price-fraction">(\d+)</gs;
  let match;
  while ((match = wholePartRegex.exec(html)) !== null) {
    const whole = match[1].replace(/,/g, "");
    const fraction = match[2];
    const p = parseFloat(`${whole}.${fraction}`);
    if (p >= 5 && p <= 50000) allPrices.push(p);
  }

  if (allPrices.length === 0) {
    const textPrices = extractPricesFromText(html);
    allPrices.push(...textPrices);
  }

  return allPrices;
}

async function searchCCLPrices(searchTerm: string): Promise<number[]> {
  const query = encodeURIComponent(searchTerm);
  const html = await fetchPage(`https://www.cclonline.com/search/${query}/`);
  if (!html) return [];

  const jsonPrices = extractPricesFromJsonLd(html);
  if (jsonPrices.length > 0) return jsonPrices;

  const dataPrices = extractPricesFromDataAttrs(html);
  if (dataPrices.length > 0) return dataPrices;

  return extractPricesFromText(html);
}

async function searchProductPrice(name: string, vendor?: string, mpn?: string, costPlusVatMargin?: number): Promise<number | null> {
  const searchTerms = buildSearchTerms(name, vendor, mpn);
  const allPrices: number[] = [];
  const minRef = costPlusVatMargin || 1;

  for (const term of searchTerms) {
    const scanPrices = await searchScanPrices(term);
    if (scanPrices.length > 0) {
      allPrices.push(...scanPrices);
      console.log(`[PriceMatcher]   Scan "${term}": found ${scanPrices.length} prices (lowest: £${Math.min(...scanPrices).toFixed(2)})`);
      break;
    }
    await delay(1000);
  }

  if (allPrices.length < 3) {
    await delay(1500);
    for (const term of searchTerms.slice(0, 1)) {
      const amazonPrices = await searchAmazonPrices(term);
      if (amazonPrices.length > 0) {
        allPrices.push(...amazonPrices);
        console.log(`[PriceMatcher]   Amazon "${term}": found ${amazonPrices.length} prices (lowest: £${Math.min(...amazonPrices).toFixed(2)})`);
        break;
      }
      await delay(1000);
    }
  }

  if (allPrices.length < 3) {
    await delay(1500);
    for (const term of searchTerms.slice(0, 1)) {
      const cclPrices = await searchCCLPrices(term);
      if (cclPrices.length > 0) {
        allPrices.push(...cclPrices);
        console.log(`[PriceMatcher]   CCL "${term}": found ${cclPrices.length} prices (lowest: £${Math.min(...cclPrices).toFixed(2)})`);
        break;
      }
      await delay(1000);
    }
  }

  return getBestPrice(allPrices, minRef);
}

const matchedProductIds = new Set<number>();

export function getMatchProgress() {
  return { matched: matchedProductIds.size };
}

export function resetMatchProgress() {
  matchedProductIds.clear();
}

export async function matchInternetPrices(batchSize = 500): Promise<PriceMatchResult> {
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
      console.log(`[PriceMatcher] ${result.totalProcessed}/${batch.length}: ${product.name}`);

      const costPrice = product.costPrice!;
      const costPlusVat = costPrice * 1.2;
      const minSellPrice = Math.ceil(costPlusVat * (1 + MIN_MARGIN) * 100) / 100;

      const internetPrice = await searchProductPrice(
        product.name,
        product.vendor || undefined,
        product.mpn || undefined,
        minSellPrice
      );

      if (!internetPrice) {
        result.noResultsFound++;
        matchedProductIds.add(product.id);
        await delay(1500);
        continue;
      }

      let newPrice: number;
      if (internetPrice >= minSellPrice) {
        newPrice = internetPrice;
        if (internetPrice > product.price) {
          console.log(`[PriceMatcher]   Raising to match internet: £${product.price.toFixed(2)} → £${internetPrice.toFixed(2)}`);
        } else if (internetPrice < product.price) {
          console.log(`[PriceMatcher]   Lowering to match internet: £${product.price.toFixed(2)} → £${internetPrice.toFixed(2)}`);
        }
      } else {
        newPrice = minSellPrice;
        console.log(`[PriceMatcher]   Internet £${internetPrice.toFixed(2)} below min margin — set to floor £${minSellPrice.toFixed(2)}`);
      }

      if (Math.abs(product.price - newPrice) > 0.01) {
        const updates: Record<string, any> = { price: newPrice };
        if (product.price > newPrice) {
          updates.compareAtPrice = product.price;
        }
        await storage.updateProduct(product.id, updates);
        result.priceUpdated++;
        console.log(`[PriceMatcher]   UPDATED: £${product.price.toFixed(2)} → £${newPrice.toFixed(2)} (internet: £${internetPrice.toFixed(2)}, min: £${minSellPrice.toFixed(2)})`);
      } else {
        result.keptExisting++;
        console.log(`[PriceMatcher]   Competitive: £${product.price.toFixed(2)} (internet: £${internetPrice.toFixed(2)})`);
      }

      matchedProductIds.add(product.id);
      await delay(2500);
    } catch (e: any) {
      result.errors++;
      matchedProductIds.add(product.id);
      console.error(`[PriceMatcher] Error matching ${product.name}:`, e.message);
    }
  }

  console.log(`[PriceMatcher] Complete: ${result.priceUpdated} updated, ${result.noResultsFound} no results, ${result.keptExisting} kept, ${result.errors} errors`);
  return result;
}
