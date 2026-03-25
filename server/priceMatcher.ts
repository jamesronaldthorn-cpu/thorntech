import { storage } from "./storage";
import { minSellPrice } from "./priceUtils";

// ---------- Price sanity helpers ----------

function parseCapacityGB(name: string): number | null {
  const tb = name.match(/(\d+(?:\.\d+)?)\s*TB/i);
  if (tb) return Math.round(parseFloat(tb[1]) * 1024);
  const gb = name.match(/(\d+(?:\.\d+)?)\s*GB/i);
  if (gb) return parseFloat(gb[1]);
  return null;
}

function parseCapacityMB(name: string): number | null {
  const mb = name.match(/(\d+(?:\.\d+)?)\s*MB/i);
  if (mb) return parseFloat(mb[1]);
  return null;
}

/**
 * Returns the maximum sane retail (inc-VAT) price we should ever accept
 * from an internet price search for this product.
 * Returns null if no sanity cap can be determined.
 */
function maxSaneInternetPrice(name: string, costPrice: number): number | null {
  const nameLower = name.toLowerCase();
  const capacityGB = parseCapacityGB(name);

  // Storage: NVMe, SSD, HDD
  if (capacityGB !== null && (
    nameLower.includes("nvme") || nameLower.includes("ssd") ||
    nameLower.includes("solid state") || nameLower.includes("m.2") ||
    nameLower.includes("hdd") || nameLower.includes("hard drive") ||
    nameLower.includes("hard disk")
  )) {
    // Max £1.20/GB (very generous — even server NVMe is cheaper than this at retail)
    const perGbCap = capacityGB * 1.20;
    // Never go below 4× cost (to allow legitimate premium products)
    return Math.max(perGbCap, costPrice * 4);
  }

  // RAM: DIMM, DDR, etc.
  if (capacityGB !== null && (
    nameLower.includes("ddr") || nameLower.includes("dimm") ||
    nameLower.includes(" ram") || nameLower.includes("memory") ||
    nameLower.includes("sodimm") || nameLower.includes("rdimm")
  )) {
    // Max £20/GB (generous — 128GB ECC server kits can be pricey)
    const perGbCap = capacityGB * 20;
    return Math.max(perGbCap, costPrice * 4);
  }

  // USB drives / flash
  if (capacityGB !== null && (
    nameLower.includes("usb") && (nameLower.includes("flash") || nameLower.includes("drive") || nameLower.includes("stick"))
  )) {
    const perGbCap = capacityGB * 0.60;
    return Math.max(perGbCap, costPrice * 4);
  }

  // For everything else: cap at 5× cost price to catch wild mismatches
  return costPrice * 5;
}

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

  // Only accept prices in a sensible band:
  //   Lower bound: 85% of our floor — filters out accessories / wrong products priced too cheap
  //   Upper bound: 4× our floor — filters out wildly wrong products / bundles
  const minAccept = costPlusVatMargin * 0.85;
  const maxAccept = costPlusVatMargin * 4;
  const validPrices = [...new Set(prices)]
    .filter(p => p >= minAccept && p <= maxAccept)
    .sort((a, b) => a - b);

  if (validPrices.length === 0) return null;
  if (validPrices.length === 1) return validPrices[0];

  if (validPrices.length === 2) {
    // If the two prices differ by more than 40%, they're likely different products —
    // use the average to avoid accidentally picking the wrong-product price
    if (validPrices[1] / validPrices[0] > 1.4) {
      return Math.round((validPrices[0] + validPrices[1]) / 2 * 100) / 100;
    }
    return validPrices[0]; // prices agree — use the lower (competitive)
  }

  // For 3+ prices: strip outliers with IQR, return the 25th-percentile of the middle band
  // (competitive but not racing to the bottom)
  const q1 = Math.floor(validPrices.length * 0.25);
  const q3 = Math.floor(validPrices.length * 0.75);
  const iqr = validPrices.slice(q1, q3 + 1);
  return iqr.length > 0 ? iqr[0] : validPrices[Math.floor(validPrices.length / 2)];
}

function buildSearchTerms(name: string, vendor?: string, mpn?: string): string[] {
  const terms: string[] = [];

  if (mpn && mpn.length > 3) {
    terms.push(mpn);
  }

  let cleaned = name
    .replace(/\([^)]*\)/g, "")
    .replace(/\s+/g, " ")
    .trim();

  cleaned = cleaned
    .replace(/\b(OEM|BULK|TRAY|RET|RETAIL|BOX|LTD STOCK|CLEARANCE|EX DISPLAY)\b/gi, "")
    .replace(/\bRefurbished\b/gi, "")
    .replace(/\s*-\s*(?:Black|White|Grey|Silver|Red|Blue|Green)\s*$/i, "")
    .replace(/\s+/g, " ")
    .trim();

  const modelPatterns = [
    /\b(GeForce\s+(?:RTX|GTX)\s+\d{4}\s*(?:Ti|SUPER)?(?:\s+\d+GB)?)/i,
    /\b(Radeon\s+RX\s+\d{4}\s*(?:XT|XTX)?(?:\s+\d+GB)?)/i,
    /\b(Ryzen\s+\d\s+\d{4}\w*)/i,
    /\b(Core\s+i\d[-\s]\d{4,5}\w*)/i,
    /\b(Arc\s+[AB]\d{3}\w*)/i,
  ];

  let coreModel = "";
  for (const pattern of modelPatterns) {
    const match = cleaned.match(pattern);
    if (match) {
      coreModel = match[1].trim();
      break;
    }
  }

  if (coreModel && vendor) {
    const vendorModel = `${vendor} ${coreModel}`;
    if (!terms.includes(vendorModel)) terms.push(vendorModel);
  } else if (coreModel) {
    if (!terms.includes(coreModel)) terms.push(coreModel);
  }

  const shortName = cleaned.substring(0, 60);
  if (vendor && !shortName.toLowerCase().startsWith(vendor.toLowerCase())) {
    terms.push(`${vendor} ${shortName}`);
  }
  terms.push(shortName);

  const words = shortName.split(/\s+/).slice(0, 5).join(" ");
  if (words !== shortName && words.length > 10 && !terms.includes(words)) {
    terms.push(words);
  }

  return [...new Set(terms)];
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
  const minAccept = minRef * 0.85;
  const maxAccept = minRef * 4;

  // --- Source 1: Scan.co.uk ---
  for (const term of searchTerms) {
    const scanPrices = await searchScanPrices(term);
    const inBand = scanPrices.filter(p => p >= minAccept && p <= maxAccept);
    if (inBand.length > 0) {
      allPrices.push(...inBand);
      console.log(`[PriceMatcher]   Scan "${term.substring(0,40)}": ${inBand.length}/${scanPrices.length} in-band (range £${Math.min(...inBand).toFixed(2)}-£${Math.max(...inBand).toFixed(2)})`);
      break;
    } else if (scanPrices.length > 0) {
      console.log(`[PriceMatcher]   Scan "${term.substring(0,40)}": ${scanPrices.length} prices ALL rejected (out of band £${minAccept.toFixed(0)}-£${maxAccept.toFixed(0)})`);
    }
    await delay(800);
  }

  // --- Source 2: Amazon.co.uk — always check to cross-reference Scan ---
  await delay(1000);
  for (const term of searchTerms.slice(0, 2)) {
    const amazonPrices = await searchAmazonPrices(term);
    const inBand = amazonPrices.filter(p => p >= minAccept && p <= maxAccept);
    if (inBand.length > 0) {
      allPrices.push(...inBand);
      console.log(`[PriceMatcher]   Amazon "${term.substring(0,40)}": ${inBand.length}/${amazonPrices.length} in-band (range £${Math.min(...inBand).toFixed(2)}-£${Math.max(...inBand).toFixed(2)})`);
      break;
    } else if (amazonPrices.length > 0) {
      console.log(`[PriceMatcher]   Amazon "${term.substring(0,40)}": ${amazonPrices.length} prices ALL rejected (out of band)`);
    }
    await delay(800);
  }

  // --- Source 3: CCL Online — only if still not enough data points ---
  if (allPrices.length < 4) {
    await delay(1000);
    for (const term of searchTerms.slice(0, 1)) {
      const cclPrices = await searchCCLPrices(term);
      const inBand = cclPrices.filter(p => p >= minAccept && p <= maxAccept);
      if (inBand.length > 0) {
        allPrices.push(...inBand);
        console.log(`[PriceMatcher]   CCL "${term.substring(0,40)}": ${inBand.length}/${cclPrices.length} in-band`);
        break;
      }
      await delay(800);
    }
  }

  if (allPrices.length === 0) {
    console.log(`[PriceMatcher]   No valid in-band prices found from any source`);
  }
  return getBestPrice(allPrices, minRef);
}

const matchedProductIds = new Set<number>();

let matchLiveProgress = { current: 0, total: 0, currentProduct: "" };

export function getMatchProgress() {
  return { matched: matchedProductIds.size, ...matchLiveProgress };
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
  matchLiveProgress = { current: 0, total: batch.length, currentProduct: "" };

  for (const product of batch) {
    try {
      result.totalProcessed++;
      matchLiveProgress = { current: result.totalProcessed, total: batch.length, currentProduct: product.name };
      console.log(`[PriceMatcher] ${result.totalProcessed}/${batch.length}: ${product.name}`);

      const costPrice = product.costPrice!;
      const floor = minSellPrice(costPrice);

      const internetPrice = await searchProductPrice(
        product.name,
        product.vendor || undefined,
        product.mpn || undefined,
        floor
      );

      if (!internetPrice) {
        result.noResultsFound++;
        matchedProductIds.add(product.id);
        await delay(1500);
        continue;
      }

      // Sanity check: reject internet price if it's unreasonably high for this product type
      const maxSane = maxSaneInternetPrice(product.name, costPrice);
      if (maxSane !== null && internetPrice > maxSane) {
        console.log(`[PriceMatcher]   SANITY REJECT: internet £${internetPrice.toFixed(2)} > max sane £${maxSane.toFixed(2)} for "${product.name.substring(0, 50)}" — keeping existing £${product.price.toFixed(2)}`);
        result.keptExisting++;
        matchedProductIds.add(product.id);
        await delay(1500);
        continue;
      }

      let newPrice: number;
      if (internetPrice >= floor) {
        newPrice = internetPrice;
        if (internetPrice > product.price) {
          console.log(`[PriceMatcher]   Raising to match internet: £${product.price.toFixed(2)} → £${internetPrice.toFixed(2)}`);
        } else if (internetPrice < product.price) {
          console.log(`[PriceMatcher]   Lowering to match internet: £${product.price.toFixed(2)} → £${internetPrice.toFixed(2)}`);
        }
      } else {
        newPrice = floor;
        console.log(`[PriceMatcher]   Internet £${internetPrice.toFixed(2)} below floor — set to floor £${floor.toFixed(2)}`);
      }

      if (Math.abs(product.price - newPrice) > 0.01) {
        const updates: Record<string, any> = { price: newPrice };
        if (product.price > newPrice) {
          updates.compareAtPrice = product.price;
        }
        await storage.updateProduct(product.id, updates);
        result.priceUpdated++;
        console.log(`[PriceMatcher]   UPDATED: £${product.price.toFixed(2)} → £${newPrice.toFixed(2)} (internet: £${internetPrice.toFixed(2)}, floor: £${floor.toFixed(2)})`);
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
