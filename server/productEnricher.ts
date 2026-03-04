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
      headers: {
        "User-Agent": UA,
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-GB,en;q=0.9",
        "Accept-Encoding": "identity",
      },
      signal: AbortSignal.timeout(15000),
      redirect: "follow",
    });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

function cleanHtml(text: string): string {
  return text.replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#\d+;/g, "").replace(/&[a-z]+;/g, " ").replace(/\s+/g, " ").trim();
}

function extractSpecs(html: string): Record<string, string> {
  const specs: Record<string, string> = {};

  const rowRegex = /<tr[^>]*>\s*<t[hd][^>]*>([\s\S]*?)<\/t[hd]>\s*<t[hd][^>]*>([\s\S]*?)<\/t[hd]>/gi;
  let match;
  while ((match = rowRegex.exec(html)) !== null) {
    const key = cleanHtml(match[1]);
    const val = cleanHtml(match[2]);
    if (key && val && key.length > 1 && key.length < 80 && val.length < 300 && !key.toLowerCase().includes("script") && !key.toLowerCase().includes("cookie")) {
      specs[key] = val;
    }
  }

  const dlRegex = /<dt[^>]*>([\s\S]*?)<\/dt>\s*<dd[^>]*>([\s\S]*?)<\/dd>/gi;
  while ((match = dlRegex.exec(html)) !== null) {
    const key = cleanHtml(match[1]);
    const val = cleanHtml(match[2]);
    if (key && val && key.length > 1 && key.length < 80 && val.length < 300) {
      specs[key] = val;
    }
  }

  return specs;
}

function extractFeatures(html: string): string[] {
  const features: string[] = [];

  const featureUlRegex = /<ul[^>]*class="[^"]*(?:feature|highlight|benefit|key-point|bullet|product)[^"]*"[^>]*>([\s\S]*?)<\/ul>/gi;
  let match;
  while ((match = featureUlRegex.exec(html)) !== null) {
    const liRegex = /<li[^>]*>([\s\S]*?)<\/li>/gi;
    let li;
    while ((li = liRegex.exec(match[1])) !== null) {
      const text = cleanHtml(li[1]);
      if (text && text.length > 8 && text.length < 300 && !text.toLowerCase().includes("cookie") && !text.toLowerCase().includes("privacy")) {
        features.push(text);
      }
    }
  }

  if (features.length === 0) {
    const genericUlRegex = /<ul[^>]*>([\s\S]*?)<\/ul>/gi;
    while ((match = genericUlRegex.exec(html)) !== null) {
      const liRegex = /<li[^>]*>([\s\S]*?)<\/li>/gi;
      const tempFeatures: string[] = [];
      let li;
      while ((li = liRegex.exec(match[1])) !== null) {
        const text = cleanHtml(li[1]);
        if (text && text.length > 12 && text.length < 300 && !text.toLowerCase().includes("cookie") && !text.toLowerCase().includes("privacy") && !text.toLowerCase().includes("sign up")) {
          tempFeatures.push(text);
        }
      }
      if (tempFeatures.length >= 3 && tempFeatures.length <= 20) {
        features.push(...tempFeatures);
        break;
      }
    }
  }

  return [...new Set(features)].slice(0, 12);
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
    if (src.includes("logo") || src.includes("icon") || src.includes("sprite") || src.includes("pixel") || src.includes("tracking") || src.includes("1x1") || src.includes("avatar")) continue;
    if (src.endsWith(".svg") || src.endsWith(".gif") || src.includes("base64")) continue;
    const width = match[0].match(/width=["']?(\d+)/i);
    if (width && parseInt(width[1]) < 80) continue;
    if (src.includes("product") || src.includes("large") || src.includes("zoom") || src.includes("main") || src.includes("hero") || src.includes("image") || (src.match(/\.(jpg|jpeg|png|webp)/i) && !src.includes("thumb"))) {
      imgs.push(src);
    }
  }

  const dataSrcRegex = /data-src=["']([^"']+)["']/gi;
  while ((match = dataSrcRegex.exec(html)) !== null) {
    let src = match[1];
    if (src.startsWith("//")) src = "https:" + src;
    else if (src.startsWith("/")) {
      try { src = new URL(src, baseUrl).href; } catch { continue; }
    }
    if (src.startsWith("http") && src.match(/\.(jpg|jpeg|png|webp)/i) && !src.includes("logo") && !src.includes("icon")) {
      imgs.push(src);
    }
  }

  return [...new Set(imgs)].slice(0, 8);
}

function parseSpecsFromName(name: string, vendor?: string): { specs: Record<string, string>; features: string[] } {
  const specs: Record<string, string> = {};
  const features: string[] = [];
  const nameLower = name.toLowerCase();

  if (vendor) specs["Brand"] = vendor;

  const memMatch = name.match(/(\d+)\s*GB/i);
  if (memMatch) specs["Memory"] = memMatch[1] + " GB";

  const tbMatch = name.match(/(\d+)\s*TB/i);
  if (tbMatch) specs["Capacity"] = tbMatch[1] + " TB";

  const ddrMatch = name.match(/(DDR[45]\s*[-]?\d*)/i);
  if (ddrMatch) specs["Memory Type"] = ddrMatch[1].toUpperCase();

  const clockMatch = name.match(/([\d.]+)\s*GHz/i);
  if (clockMatch) specs["Clock Speed"] = clockMatch[1] + " GHz";

  const coreMatch = name.match(/(\d+)\s*[-]?\s*core/i);
  if (coreMatch) specs["Cores"] = coreMatch[1];

  const threadMatch = name.match(/(\d+)\s*[-]?\s*thread/i);
  if (threadMatch) specs["Threads"] = threadMatch[1];

  const wattMatch = name.match(/(\d+)\s*W(?:att)?(?:\s|$|,)/i);
  if (wattMatch) specs["Wattage"] = wattMatch[1] + "W";

  const sizeMatch = name.match(/([\d.]+)["'']\s*(?:inch)?|(\d+(?:\.\d+)?)\s*inch/i);
  if (sizeMatch) specs["Screen Size"] = (sizeMatch[1] || sizeMatch[2]) + '"';

  const resMatch = name.match(/(\d{3,4})\s*x\s*(\d{3,4})/);
  if (resMatch) specs["Resolution"] = resMatch[1] + " x " + resMatch[2];

  if (nameLower.includes("4k") || nameLower.includes("uhd")) specs["Resolution"] = "4K UHD";
  if (nameLower.includes("1440p") || nameLower.includes("qhd")) specs["Resolution"] = "2560 x 1440 (QHD)";
  if (nameLower.includes("1080p") || nameLower.includes("full hd")) specs["Resolution"] = "1920 x 1080 (Full HD)";

  const hzMatch = name.match(/(\d+)\s*Hz/i);
  if (hzMatch) specs["Refresh Rate"] = hzMatch[1] + " Hz";

  const rpmMatch = name.match(/(\d+)\s*RPM/i);
  if (rpmMatch) specs["Speed"] = rpmMatch[1] + " RPM";

  const formFactors = ["ATX", "Micro-ATX", "mATX", "Mini-ITX", "ITX", "E-ATX", "M.2", "2.5\"", "3.5\""];
  for (const ff of formFactors) {
    if (nameLower.includes(ff.toLowerCase())) {
      specs["Form Factor"] = ff;
      break;
    }
  }

  const sockets = ["AM4", "AM5", "LGA 1700", "LGA 1200", "LGA 1151", "LGA1700", "LGA1200", "LGA1151", "TR4", "sTRX4"];
  for (const s of sockets) {
    if (nameLower.includes(s.toLowerCase())) {
      specs["Socket"] = s;
      break;
    }
  }

  if (nameLower.includes("nvme")) { specs["Interface"] = "NVMe"; features.push("NVMe solid state drive for fast boot and load times"); }
  if (nameLower.includes("sata")) specs["Interface"] = "SATA";
  if (nameLower.includes("pcie") || nameLower.includes("pci-e")) {
    const pcieMatch = name.match(/PCIe?\s*(\d\.?\d?)/i);
    if (pcieMatch) specs["Interface"] = "PCIe " + pcieMatch[1];
  }
  if (nameLower.includes("usb-c") || nameLower.includes("usb type-c")) features.push("USB-C connectivity");
  if (nameLower.includes("bluetooth")) features.push("Bluetooth wireless connectivity");
  if (nameLower.includes("wifi") || nameLower.includes("wi-fi")) features.push("Built-in Wi-Fi");
  if (nameLower.includes("rgb")) features.push("RGB lighting");
  if (nameLower.includes("modular")) features.push("Modular design for clean cable management");
  if (nameLower.includes("mechanical")) features.push("Mechanical key switches");
  if (nameLower.includes("wireless")) features.push("Wireless connectivity");
  if (nameLower.includes("noise cancel")) features.push("Active noise cancellation");

  return { specs, features };
}

async function enrichFromScan(searchTerm: string): Promise<EnrichmentData | null> {
  const query = encodeURIComponent(searchTerm.substring(0, 80));
  const searchHtml = await fetchPage(`https://www.scan.co.uk/search?q=${query}`);
  if (!searchHtml) return null;

  const productLinks: string[] = [];
  const linkRegex = /href="(\/products\/[^"#]+)"/gi;
  let match;
  while ((match = linkRegex.exec(searchHtml)) !== null) {
    const link = match[1];
    if (!productLinks.includes(link) && productLinks.length < 2) {
      productLinks.push(link);
    }
  }

  if (productLinks.length === 0) return null;

  const data: EnrichmentData = {};

  for (const link of productLinks) {
    await delay(1000);
    const page = await fetchPage(`https://www.scan.co.uk${link}`);
    if (!page) continue;

    const specs = extractSpecs(page);
    if (Object.keys(specs).length > 0) data.specs = { ...data.specs, ...specs };

    const features = extractFeatures(page);
    if (features.length > 0) data.features = [...(data.features || []), ...features];

    const images = extractImages(page, "https://www.scan.co.uk");
    if (images.length > 0) data.images = [...(data.images || []), ...images];

    const metaDesc = page.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i);
    if (metaDesc && metaDesc[1].length > 30) {
      data.description = metaDesc[1].trim();
    }

    if (data.specs && Object.keys(data.specs).length > 3) break;
  }

  if (data.features) data.features = [...new Set(data.features)].slice(0, 10);
  if (data.images) data.images = [...new Set(data.images)].slice(0, 6);

  const hasData = (data.specs && Object.keys(data.specs).length > 0) ||
    (data.features && data.features.length > 0) ||
    (data.images && data.images.length > 0) ||
    data.description;

  return hasData ? data : null;
}

async function enrichFromCCL(searchTerm: string): Promise<EnrichmentData | null> {
  const query = encodeURIComponent(searchTerm.substring(0, 80));
  const searchHtml = await fetchPage(`https://www.cclonline.com/search/${query}/`);
  if (!searchHtml) return null;

  const productLinks: string[] = [];
  const linkRegex = /href="(\/product\/[^"#]+)"/gi;
  let match;
  while ((match = linkRegex.exec(searchHtml)) !== null) {
    const link = match[1];
    if (!productLinks.includes(link) && productLinks.length < 2) {
      productLinks.push(link);
    }
  }

  if (productLinks.length === 0) return null;

  const data: EnrichmentData = {};

  for (const link of productLinks) {
    await delay(1000);
    const page = await fetchPage(`https://www.cclonline.com${link}`);
    if (!page) continue;

    const specs = extractSpecs(page);
    if (Object.keys(specs).length > 0) data.specs = { ...data.specs, ...specs };

    const features = extractFeatures(page);
    if (features.length > 0) data.features = [...(data.features || []), ...features];

    const images = extractImages(page, "https://www.cclonline.com");
    if (images.length > 0) data.images = [...(data.images || []), ...images];

    if (data.specs && Object.keys(data.specs).length > 3) break;
  }

  if (data.features) data.features = [...new Set(data.features)].slice(0, 10);
  if (data.images) data.images = [...new Set(data.images)].slice(0, 6);

  const hasData = (data.specs && Object.keys(data.specs).length > 0) ||
    (data.features && data.features.length > 0) ||
    (data.images && data.images.length > 0);

  return hasData ? data : null;
}

async function enrichProduct(name: string, vendor?: string, mpn?: string): Promise<EnrichmentData | null> {
  const searchTerms: string[] = [];

  if (mpn && mpn.length > 3) searchTerms.push(mpn);

  const shortName = name.replace(/\([^)]*\)/g, "").trim();
  if (vendor && !shortName.toLowerCase().startsWith(vendor.toLowerCase())) {
    searchTerms.push(`${vendor} ${shortName}`.substring(0, 80));
  } else {
    searchTerms.push(shortName.substring(0, 80));
  }

  for (const term of searchTerms) {
    console.log(`[Enricher]   Trying Scan.co.uk: "${term}"`);
    const scanData = await enrichFromScan(term);
    if (scanData && ((scanData.specs && Object.keys(scanData.specs).length > 0) || (scanData.features && scanData.features.length > 0))) {
      return scanData;
    }
    await delay(1500);

    console.log(`[Enricher]   Trying CCL: "${term}"`);
    const cclData = await enrichFromCCL(term);
    if (cclData && ((cclData.specs && Object.keys(cclData.specs).length > 0) || (cclData.features && cclData.features.length > 0))) {
      return cclData;
    }
    await delay(1500);
  }

  return null;
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
  parsedFromName: number;
}

export async function enrichProducts(batchSize = 500): Promise<EnrichResult> {
  const allProducts = await storage.getProducts();
  const unenriched = allProducts.filter(p => !p.enrichedAt && !enrichedIds.has(p.id));

  console.log(`[Enricher] ${allProducts.length} total, ${unenriched.length} unenriched, ${enrichedIds.size} done this session`);

  const result: EnrichResult = {
    totalProcessed: 0,
    enriched: 0,
    noDataFound: 0,
    alreadyEnriched: 0,
    errors: 0,
    parsedFromName: 0,
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

      const updates: Record<string, any> = { enrichedAt: new Date() };

      const { specs: nameSpecs, features: nameFeatures } = parseSpecsFromName(product.name, product.vendor || undefined);

      let webData: EnrichmentData | null = null;
      try {
        webData = await enrichProduct(product.name, product.vendor || undefined, product.mpn || undefined);
      } catch (e: any) {
        console.log(`[Enricher]   Web fetch failed: ${e.message}`);
      }

      const finalSpecs = { ...nameSpecs, ...(webData?.specs || {}) };
      const finalFeatures = [...new Set([...(webData?.features || []), ...nameFeatures])].slice(0, 12);

      if (Object.keys(finalSpecs).length > 0) {
        updates.specs = JSON.stringify(finalSpecs);
      }
      if (finalFeatures.length > 0) {
        updates.features = JSON.stringify(finalFeatures);
      }
      if (webData?.images && webData.images.length > 0) {
        updates.images = JSON.stringify(webData.images);
        if (!product.image) {
          updates.image = webData.images[0];
        }
      }
      if (webData?.description && (!product.description || product.description.length < 50)) {
        updates.description = webData.description;
      }

      await storage.updateProduct(product.id, updates);
      enrichedIds.add(product.id);

      const hasWebData = webData && ((webData.specs && Object.keys(webData.specs).length > 0) || (webData.features && webData.features.length > 0) || (webData.images && webData.images.length > 0));
      const hasNameData = Object.keys(nameSpecs).length > 1 || nameFeatures.length > 0;

      if (hasWebData) {
        result.enriched++;
        console.log(`[Enricher]   Web enriched: ${Object.keys(finalSpecs).length} specs, ${finalFeatures.length} features, ${webData?.images?.length || 0} images`);
      } else if (hasNameData) {
        result.parsedFromName++;
        console.log(`[Enricher]   Parsed from name: ${Object.keys(nameSpecs).length} specs, ${nameFeatures.length} features`);
      } else {
        result.noDataFound++;
      }

      await delay(2000);
    } catch (e: any) {
      result.errors++;
      enrichedIds.add(product.id);
      console.error(`[Enricher] Error: ${product.name}: ${e.message}`);
    }
  }

  console.log(`[Enricher] Done: ${result.enriched} web enriched, ${result.parsedFromName} parsed from name, ${result.noDataFound} no data, ${result.errors} errors`);
  return result;
}
