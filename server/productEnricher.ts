import { storage } from "./storage";

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

interface EnrichmentData {
  description?: string;
  specs?: Record<string, string>;
  features?: string[];
  images?: string[];
  image?: string;
}

async function fetchPage(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": UA, "Accept": "text/html,application/xhtml+xml", "Accept-Language": "en-GB,en;q=0.9" },
      signal: AbortSignal.timeout(12000),
      redirect: "follow",
    });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

function extractImages(html: string, baseUrl: string): string[] {
  const imgs: string[] = [];
  const imgRegex = /<img[^>]+src=["']([^"']+)["'][^>]*>/gi;
  let match;
  while ((match = imgRegex.exec(html)) !== null) {
    let src = match[1];
    if (src.startsWith("//")) src = "https:" + src;
    else if (src.startsWith("/")) {
      try { src = new URL(src, baseUrl).href; } catch { continue; }
    }
    if (!src.startsWith("http")) continue;
    if (src.includes("logo") || src.includes("icon") || src.includes("sprite") || src.includes("pixel") || src.includes("tracking") || src.includes("1x1")) continue;
    if (src.includes("svg") || src.endsWith(".gif") || src.includes("base64")) continue;
    const width = match[0].match(/width=["']?(\d+)/i);
    if (width && parseInt(width[1]) < 100) continue;
    imgs.push(src);
  }
  return [...new Set(imgs)];
}

function extractSpecs(html: string): Record<string, string> {
  const specs: Record<string, string> = {};
  const tableRegex = /<t[rd][^>]*>[\s\S]*?<\/t[rd]>/gi;
  const rowRegex = /<tr[^>]*>\s*<t[hd][^>]*>([\s\S]*?)<\/t[hd]>\s*<t[hd][^>]*>([\s\S]*?)<\/t[hd]>/gi;
  let match;
  while ((match = rowRegex.exec(html)) !== null) {
    const key = match[1].replace(/<[^>]+>/g, "").trim();
    const val = match[2].replace(/<[^>]+>/g, "").trim();
    if (key && val && key.length < 60 && val.length < 200 && !key.includes("script")) {
      specs[key] = val;
    }
  }

  const dlRegex = /<dt[^>]*>([\s\S]*?)<\/dt>\s*<dd[^>]*>([\s\S]*?)<\/dd>/gi;
  while ((match = dlRegex.exec(html)) !== null) {
    const key = match[1].replace(/<[^>]+>/g, "").trim();
    const val = match[2].replace(/<[^>]+>/g, "").trim();
    if (key && val && key.length < 60 && val.length < 200) {
      specs[key] = val;
    }
  }

  return specs;
}

function extractFeatures(html: string): string[] {
  const features: string[] = [];
  const ulRegex = /<ul[^>]*class="[^"]*(?:feature|highlight|benefit|key-point|bullet)[^"]*"[^>]*>([\s\S]*?)<\/ul>/gi;
  let match;
  while ((match = ulRegex.exec(html)) !== null) {
    const liRegex = /<li[^>]*>([\s\S]*?)<\/li>/gi;
    let li;
    while ((li = liRegex.exec(match[1])) !== null) {
      const text = li[1].replace(/<[^>]+>/g, "").trim();
      if (text && text.length > 10 && text.length < 300) {
        features.push(text);
      }
    }
  }

  if (features.length === 0) {
    const genericUlRegex = /<ul[^>]*>([\s\S]*?)<\/ul>/gi;
    while ((match = genericUlRegex.exec(html)) !== null) {
      if (match[1].includes("<li")) {
        const liRegex = /<li[^>]*>([\s\S]*?)<\/li>/gi;
        const tempFeatures: string[] = [];
        let li;
        while ((li = liRegex.exec(match[1])) !== null) {
          const text = li[1].replace(/<[^>]+>/g, "").trim();
          if (text && text.length > 15 && text.length < 300 && !text.includes("cookie") && !text.includes("privacy")) {
            tempFeatures.push(text);
          }
        }
        if (tempFeatures.length >= 3 && tempFeatures.length <= 20) {
          features.push(...tempFeatures);
          break;
        }
      }
    }
  }

  return [...new Set(features)].slice(0, 12);
}

function extractDescription(html: string): string | null {
  const descRegex = /<(?:div|section|p)[^>]*class="[^"]*(?:description|overview|product-info|summary|about)[^"]*"[^>]*>([\s\S]*?)<\/(?:div|section|p)>/gi;
  let match;
  while ((match = descRegex.exec(html)) !== null) {
    const text = match[1].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    if (text.length > 50 && text.length < 2000) {
      return text;
    }
  }

  const metaDesc = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i);
  if (metaDesc && metaDesc[1].length > 30) {
    return metaDesc[1].trim();
  }

  return null;
}

async function enrichFromBing(productName: string, vendor?: string): Promise<EnrichmentData | null> {
  const searchTerm = vendor ? `${vendor} ${productName} specifications` : `${productName} specifications`;
  const query = encodeURIComponent(searchTerm);
  const html = await fetchPage(`https://www.bing.com/search?q=${query}&cc=gb`);
  if (!html) return null;

  const linkRegex = /<a[^>]+href="(https?:\/\/(?:www\.)?(?:amazon\.co\.uk|scan\.co\.uk|overclockers\.co\.uk|ebuyer\.com|currys\.co\.uk|box\.co\.uk|novatech\.co\.uk|cclonline\.com|laptopsdirect\.co\.uk|aria\.co\.uk)[^"]+)"[^>]*>/gi;
  const links: string[] = [];
  let match;
  while ((match = linkRegex.exec(html)) !== null) {
    if (!links.includes(match[1]) && links.length < 3) {
      links.push(match[1]);
    }
  }

  if (links.length === 0) {
    const anyLink = /<a[^>]+href="(https?:\/\/[^"]+)"[^>]*>/gi;
    while ((match = anyLink.exec(html)) !== null) {
      const url = match[1];
      if (url.includes("bing.com") || url.includes("microsoft.com") || url.includes("google.com")) continue;
      if (!links.includes(url) && links.length < 2) links.push(url);
    }
  }

  const data: EnrichmentData = {};

  for (const link of links) {
    await delay(1500);
    const page = await fetchPage(link);
    if (!page) continue;

    const specs = extractSpecs(page);
    if (Object.keys(specs).length > 2) data.specs = { ...data.specs, ...specs };

    const features = extractFeatures(page);
    if (features.length > 0) data.features = [...(data.features || []), ...features];

    const images = extractImages(page, link);
    const productImages = images.filter(img =>
      img.includes("product") || img.includes("large") || img.includes("zoom") ||
      img.includes("main") || img.includes("hero") ||
      (img.includes(".jpg") && !img.includes("thumb") && !img.includes("small"))
    ).slice(0, 5);
    if (productImages.length > 0) data.images = [...(data.images || []), ...productImages];

    const desc = extractDescription(page);
    if (desc && (!data.description || desc.length > data.description.length)) {
      data.description = desc;
    }

    if (data.specs && Object.keys(data.specs).length > 3 && data.features && data.features.length > 2) break;
  }

  if (data.features) data.features = [...new Set(data.features)].slice(0, 10);
  if (data.images) data.images = [...new Set(data.images)].slice(0, 6);

  const hasData = (data.specs && Object.keys(data.specs).length > 0) ||
    (data.features && data.features.length > 0) ||
    (data.images && data.images.length > 0) ||
    data.description;

  return hasData ? data : null;
}

const enrichedIds = new Set<number>();

export function getEnrichProgress() {
  return { enriched: enrichedIds.size };
}

export function resetEnrichProgress() {
  enrichedIds.clear();
}

export interface EnrichResult {
  totalProcessed: number;
  enriched: number;
  noDataFound: number;
  alreadyEnriched: number;
  errors: number;
}

export async function enrichProducts(batchSize = 50): Promise<EnrichResult> {
  const allProducts = await storage.getProducts();
  const unenriched = allProducts.filter(p => !p.enrichedAt && !enrichedIds.has(p.id));

  console.log(`[Enricher] ${allProducts.length} total, ${unenriched.length} unenriched, ${enrichedIds.size} done this session`);

  const result: EnrichResult = {
    totalProcessed: 0,
    enriched: 0,
    noDataFound: 0,
    alreadyEnriched: 0,
    errors: 0,
  };

  if (unenriched.length === 0) {
    enrichedIds.clear();
    return result;
  }

  const batch = unenriched.slice(0, batchSize);

  for (const product of batch) {
    try {
      result.totalProcessed++;
      console.log(`[Enricher] ${result.totalProcessed}/${batch.length}: ${product.name}`);

      const data = await enrichFromBing(product.name, product.vendor || undefined);

      if (!data) {
        result.noDataFound++;
        enrichedIds.add(product.id);
        await delay(2000);
        continue;
      }

      const updates: Record<string, any> = { enrichedAt: new Date() };

      if (data.specs && Object.keys(data.specs).length > 0) {
        updates.specs = JSON.stringify(data.specs);
      }
      if (data.features && data.features.length > 0) {
        updates.features = JSON.stringify(data.features);
      }
      if (data.images && data.images.length > 0) {
        updates.images = JSON.stringify(data.images);
        if (!product.image) {
          updates.image = data.images[0];
        }
      }
      if (data.description && (!product.description || product.description.length < 50)) {
        updates.description = data.description;
      }

      await storage.updateProduct(product.id, updates);
      enrichedIds.add(product.id);
      result.enriched++;
      console.log(`[Enricher] Enriched: ${product.name} (${data.specs ? Object.keys(data.specs).length : 0} specs, ${data.features?.length || 0} features, ${data.images?.length || 0} images)`);

      await delay(3000);
    } catch (e: any) {
      result.errors++;
      enrichedIds.add(product.id);
      console.error(`[Enricher] Error: ${product.name}: ${e.message}`);
    }
  }

  console.log(`[Enricher] Done: ${result.enriched} enriched, ${result.noDataFound} no data, ${result.errors} errors`);
  return result;
}
