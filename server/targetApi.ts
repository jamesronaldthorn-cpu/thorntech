import { XMLParser, XMLBuilder } from "fast-xml-parser";
import { storage } from "./storage";
import { matchInternetPrices } from "./priceMatcher";


const TARGET_XML_URL = "https://xml.targetcomponents.co.uk/tcxmlv3.asp";
const TARGET_ACCOUNT = process.env.TARGET_ACCOUNT || "THO00014";
const TARGET_SECURITY_CODE = process.env.TARGET_SECURITY_CODE || "KiMNHcZF";

interface TargetProduct {
  stockcode: string;
  description: string;
  extendeddescription?: string;
  overview?: string;
  imageurl?: string;
  thumbnailurl?: string;
  largeimageurl?: string;
  manufacturer?: string;
  manupartcode?: string;
  weight?: number;
  stock: number;
  price: number;
  category?: string;
  ean?: string;
  delivery1daycost?: number;
  delivery2daycost?: number;
  warrantydescription?: string;
}

async function postTargetXml(xmlBody: string): Promise<any> {
  const res = await fetch(TARGET_XML_URL, {
    method: "POST",
    headers: { "Content-Type": "application/xml" },
    body: xmlBody,
    signal: AbortSignal.timeout(120000),
  });
  if (!res.ok) throw new Error(`Target XML API returned ${res.status}: ${res.statusText}`);
  const text = await res.text();
  const parser = new XMLParser({ ignoreAttributes: false, trimValues: true });
  return parser.parse(text);
}

function buildRequest(action: string, extras: Record<string, string> = {}): string {
  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<tcrequest>\n`;
  xml += `  <account>${TARGET_ACCOUNT}</account>\n`;
  xml += `  <securitycode>${TARGET_SECURITY_CODE}</securitycode>\n`;
  xml += `  <action>${action}</action>\n`;
  for (const [key, value] of Object.entries(extras)) {
    xml += `  <${key}>${value}</${key}>\n`;
  }
  xml += `</tcrequest>`;
  return xml;
}

export async function getTargetCategories(): Promise<{ code: string; description: string }[]> {
  const xml = buildRequest("CATEGORIES");
  const result = await postTargetXml(xml);
  const response = result.response || result;
  if (response.result !== "OK") throw new Error(`Target CATEGORIES failed: ${response.result}`);

  const cats = response.category;
  if (!cats) return [];
  const catArray = Array.isArray(cats) ? cats : [cats];
  return catArray.map((c: any) => ({
    code: String(c.code || ""),
    description: String(c.description || ""),
  }));
}

export async function getTargetAllProducts(): Promise<TargetProduct[]> {
  console.log("[Target] Fetching all products via STOCKCHECKALL...");
  const xml = buildRequest("STOCKCHECKALL");
  const result = await postTargetXml(xml);
  const response = result.response || result;
  if (response.result !== "OK") throw new Error(`Target STOCKCHECKALL failed: ${response.result}`);

  const products = response.product;
  if (!products) return [];
  const prodArray = Array.isArray(products) ? products : [products];
  console.log(`[Target] STOCKCHECKALL returned ${prodArray.length} products`);
  return prodArray.map(parseTargetProduct);
}

export async function getTargetProductsByCategory(categoryCode: string): Promise<TargetProduct[]> {
  const xml = buildRequest("STOCKCAT", { category: categoryCode });
  const result = await postTargetXml(xml);
  const response = result.response || result;
  if (response.result === "NO RESULTS") return [];
  if (response.result !== "OK") throw new Error(`Target STOCKCAT failed: ${response.result}`);

  const products = response.product;
  if (!products) return [];
  const prodArray = Array.isArray(products) ? products : [products];
  return prodArray.map(parseTargetProduct);
}

export async function searchTargetProducts(searchTerm: string): Promise<TargetProduct[]> {
  const xml = buildRequest("STOCKSEARCH", { search: searchTerm });
  const result = await postTargetXml(xml);
  const response = result.response || result;
  if (response.result !== "OK") throw new Error(`Target STOCKSEARCH failed: ${response.result}`);

  const products = response.product;
  if (!products) return [];
  const prodArray = Array.isArray(products) ? products : [products];
  return prodArray.map(parseTargetProduct);
}

export async function checkTargetStock(stockcodes: string[]): Promise<TargetProduct[]> {
  const extras: Record<string, string> = {};
  stockcodes.forEach((code, i) => {
    extras[`stockcode`] = code;
  });
  const xml = buildRequest("STOCKCHECK", extras);
  const result = await postTargetXml(xml);
  const response = result.response || result;
  if (response.result !== "OK") return [];
  const products = response.product;
  if (!products) return [];
  const prodArray = Array.isArray(products) ? products : [products];
  return prodArray.map(parseTargetProduct);
}

function parseTargetProduct(p: any): TargetProduct {
  return {
    stockcode: String(p.stockcode || ""),
    description: String(p.description || ""),
    extendeddescription: p.extendeddescription ? String(p.extendeddescription) : undefined,
    overview: p.overview ? String(p.overview) : undefined,
    imageurl: p.imageurl ? String(p.imageurl) : undefined,
    thumbnailurl: p.thumbnailurl ? String(p.thumbnailurl) : undefined,
    largeimageurl: p.largeimageurl ? String(p.largeimageurl) : undefined,
    manufacturer: p.manufacturer ? String(p.manufacturer) : undefined,
    manupartcode: p.manupartcode ? String(p.manupartcode) : undefined,
    weight: p.weight ? parseFloat(p.weight) : undefined,
    stock: parseInt(p.stock) || 0,
    price: parseFloat(p.price) || 0,
    category: p.category ? String(p.category) : undefined,
    ean: p.ean ? String(p.ean) : undefined,
    delivery1daycost: p.delivery1daycost ? parseFloat(p.delivery1daycost) : undefined,
    delivery2daycost: p.delivery2daycost ? parseFloat(p.delivery2daycost) : undefined,
    warrantydescription: p.warrantydescription ? String(p.warrantydescription) : undefined,
  };
}

function cleanTargetTitle(raw: string, manufacturer?: string): string {
  let name = raw.trim();
  name = name.replace(/\s{2,}/g, " ");
  return name;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .substring(0, 100);
}

const targetCategoryMap: Record<string, string> = {
  GRNV: "graphics-cards",
  GRRA: "graphics-cards",
  GRAC: "graphics-cards",
  GRAA: "graphics-cards",
  IN51: "processors",
  IN50: "processors",
  IN55: "processors",
  AM03: "processors",
  FM2P: "processors",
  MOAM: "motherboards",
  MOAT: "motherboards",
  MOGI: "motherboards",
  MOIN: "motherboards",
  MOMS: "motherboards",
  MOTF: "motherboards",
  MB11: "motherboards",
  MB13: "motherboards",
  MB15: "motherboards",
  MB20: "motherboards",
  MB3P: "motherboards",
  MB51: "motherboards",
  MB66: "motherboards",
  MBA2: "motherboards",
  MBA3: "motherboards",
  MBA4: "motherboards",
  MBAM: "motherboards",
  MBAT: "motherboards",
  MBF2: "motherboards",
  HBMB: "motherboards",
  MEDR: "memory",
  MEDS: "memory",
  MEFL: "memory",
  MELA: "memory",
  SSDI: "storage",
  INSD: "storage",
  HDSA: "storage",
  HDM2: "storage",
  HDWD: "storage",
  HDEN: "storage",
  HDEU: "storage",
  HDNA: "storage",
  SSHD: "storage",
  KIM2: "storage",
  KIMS: "storage",
  SP2N: "storage",
  SP2O: "storage",
  SP2P: "storage",
  SP2Q: "storage",
  CA2B: "cases",
  CA3B: "cases",
  CA6B: "cases",
  CAAK: "cases",
  CACM: "cases",
  CACN: "cases",
  CACO: "cases",
  CAEV: "cases",
  CAFD: "cases",
  CAGM: "cases",
  CAGI: "cases",
  CAHK: "cases",
  CAIN: "cases",
  CAJO: "cases",
  CALI: "cases",
  CANZ: "cases",
  CAPH: "cases",
  CATA: "cases",
  CATB: "cases",
  CAAL: "cases",
  PSEV: "power-supplies",
  PSGM: "power-supplies",
  PSSE: "power-supplies",
  SP48: "power-supplies",
  FAAM: "cooling",
  FACA: "cooling",
  FACM: "cooling",
  FACO: "cooling",
  FAIN: "cooling",
  FAI5: "cooling",
  FALQ: "cooling",
  FAMU: "cooling",
  FAPR: "cooling",
  FAUN: "cooling",
  CPUP: "cooling",
  THEP: "cooling",
  MOBA: "monitors",
  MOBW: "monitors",
  MOEL: "monitors",
  MOLA: "monitors",
  MOLT: "monitors",
  MOTO: "monitors",
  A49C: "monitors",
  A4A6: "monitors",
  KBGE: "keyboards",
  KBLO: "keyboards",
  KBST: "keyboards",
  KEBT: "keyboards",
  KECH: "keyboards",
  KECM: "keyboards",
  KEGM: "keyboards",
  KELO: "keyboards",
  KEME: "keyboards",
  KEPS: "keyboards",
  KEUS: "keyboards",
  KEWI: "keyboards",
  KEY1: "keyboards",
  KEY2: "keyboards",
  KEY3: "keyboards",
  EPKE: "keyboards",
  MSGE: "mice",
  MSLO: "mice",
  MSST: "mice",
  MSXT: "mice",
  EPMI: "mice",
  NWMB: "networking",
  NWRT: "networking",
  NWSW: "networking",
  NWUS: "networking",
  NWWI: "networking",
  UBAC: "networking",
  UBAF: "networking",
  UBAM: "networking",
  UBRO: "networking",
  UBSW: "networking",
  UBWI: "networking",
  SP69: "networking",
  SP6A: "networking",
  ADSF: "networking",
  HSGM: "headsets-audio",
  SPDE: "headsets-audio",
  SPHS: "headsets-audio",
  SPBT: "headsets-audio",
  SPGM: "headsets-audio",
  SPGG: "headsets-audio",
  SPMI: "headsets-audio",
  SPKI: "headsets-audio",
  SPCM: "headsets-audio",
  AUDA: "headsets-audio",
  CLAO: "cables-adapters",
  CLAR: "cables-adapters",
  CLDO: "cables-adapters",
  CLDR: "cables-adapters",
  CLHO: "cables-adapters",
  CLHR: "cables-adapters",
  CLIO: "cables-adapters",
  CLIR: "cables-adapters",
  CLMO: "cables-adapters",
  CLMR: "cables-adapters",
  CLNO: "cables-adapters",
  CLNR: "cables-adapters",
  CLPO: "cables-adapters",
  CLPR: "cables-adapters",
  CLPS: "cables-adapters",
  CLTO: "cables-adapters",
  CLTR: "cables-adapters",
  SSSC: "cables-adapters",
  BVIN: "optical-drives",
  BWIN: "optical-drives",
  DWEX: "optical-drives",
  DWIN: "optical-drives",
  LAA1: "laptops",
  LAAS: "laptops",
  LAGE: "laptops",
  LAHP: "laptops",
  LAIB: "laptops",
  LALE: "laptops",
  LALT: "laptops",
  LAME: "laptops",
  LAPD: "laptops",
  LAPN: "laptops",
  LASM: "laptops",
  SPAC: "laptops",
  SPAD: "laptops",
  SPA4: "laptops",
  SPA5: "laptops",
  SPA6: "laptops",
  SPA7: "laptops",
  SPA8: "laptops",
  SPA9: "laptops",
  SPAA: "laptops",
  SPAB: "laptops",
  SPAE: "laptops",
  LATA: "laptops",
  KETA: "laptops",
  PBBB: "pre-built-pcs",
  PBIN: "pre-built-pcs",
  PBLE: "pre-built-pcs",
  PBSF: "pre-built-pcs",
  PBHP: "pre-built-pcs",
  PBBI: "pre-built-pcs",
  SP8G: "pre-built-pcs",
  SP8W: "pre-built-pcs",
  SP94: "pre-built-pcs",
  GACH: "controllers-gaming",
  GMAC: "controllers-gaming",
  COUS: "controllers-gaming",
  VRHE: "controllers-gaming",
  DOCK: "accessories",
  CMWE: "accessories",
  CACA: "accessories",
  CACR: "accessories",
  CREX: "accessories",
  BRRE: "accessories",
  ACPB: "accessories",
  ACLA: "accessories",
  ACCM: "accessories",
  LAAD: "accessories",
  LAPS: "accessories",
  SPB1: "accessories",
  BATT: "accessories",
  C828: "accessories",
  CPAC: "accessories",
  CPCL: "accessories",
  CPSC: "accessories",
  DBCM: "accessories",
  AVME: "accessories",
  AVMP: "accessories",
  TAAC: "accessories",
  WETE: "accessories",
  DPEX: "accessories",
  F29E: "accessories",
  EBES: "accessories",
  SWOS: "software",
  SWOF: "software",
  SWAV: "software",
  SWBA: "software",
  SWGR: "software",
  SWUT: "software",
  SVSV: "software",
};

const targetCategoryFallback: Record<string, string> = {
  GR: "graphics-cards",
  IN: "processors",
  AM: "processors",
  FM: "processors",
  MB: "motherboards",
  ME: "memory",
  SS: "storage",
  HD: "storage",
  KI: "storage",
  CA: "cases",
  PS: "power-supplies",
  FA: "cooling",
  CP: "cooling",
  TH: "cooling",
  MO: "monitors",
  KB: "keyboards",
  KE: "keyboards",
  MS: "mice",
  EP: "mice",
  NW: "networking",
  UB: "networking",
  AD: "networking",
  HS: "headsets-audio",
  AU: "headsets-audio",
  CL: "cables-adapters",
  BV: "optical-drives",
  BW: "optical-drives",
  DW: "optical-drives",
  LA: "laptops",
  PB: "pre-built-pcs",
  SW: "software",
  SV: "software",
  AC: "accessories",
  BA: "accessories",
  DO: "accessories",
  CM: "accessories",
  DB: "accessories",
  AV: "accessories",
  TA: "accessories",
  GM: "controllers-gaming",
  CO: "controllers-gaming",
  VR: "controllers-gaming",
  GA: "controllers-gaming",
};

export async function syncTargetProducts(): Promise<{ imported: number; updated: number; skipped: number; outOfStock: number; errors: number; total: number }> {
  const result = { imported: 0, updated: 0, skipped: 0, outOfStock: 0, errors: 0, total: 0 };

  const targetCategoryCodes = [...new Set(Object.keys(targetCategoryMap))];
  console.log(`[Target] Fetching products from ${targetCategoryCodes.length} categories via STOCKCAT...`);

  let targetProducts: TargetProduct[] = [];
  const seenStockcodes = new Set<string>();
  let catsFetched = 0;
  let catsWithProducts = 0;

  for (const catCode of targetCategoryCodes) {
    try {
      const products = await getTargetProductsByCategory(catCode);
      catsFetched++;
      if (products.length > 0) {
        catsWithProducts++;
        for (const p of products) {
          if (!seenStockcodes.has(p.stockcode)) {
            seenStockcodes.add(p.stockcode);
            targetProducts.push(p);
          }
        }
      }
    } catch (e: any) {
      if (!e.message?.includes("NO RESULTS")) {
        console.error(`[Target] Error fetching category ${catCode}: ${e.message}`);
      }
    }
  }

  const inStockCount = targetProducts.filter(tp => tp.stock > 0).length;
  result.total = targetProducts.length;
  console.log(`[Target] Fetched ${targetProducts.length} unique products (${inStockCount} in stock) from ${catsWithProducts}/${catsFetched} categories`);

  const existingProducts = await storage.getProducts();
  const existingByMpn = new Map<string, any>();
  const existingBySlug = new Map<string, any>();
  for (const p of existingProducts) {
    if (p.mpn && p.mpn.length > 3) existingByMpn.set(p.mpn.toLowerCase().trim(), p);
    existingBySlug.set(p.slug, p);
  }
  console.log(`[Target] DB has ${existingProducts.length} products, ${existingByMpn.size} MPNs, ${existingBySlug.size} slugs`);

  const categories = await storage.getCategories();
  const catBySlug = new Map<string, number>();
  for (const c of categories) catBySlug.set(c.slug, c.id);

  let matchedByMpn = 0, matchedBySlug = 0, newCount = 0;
  for (const tp of targetProducts) {
    try {
      if (tp.stock <= 0) {
        result.outOfStock++;
        continue;
      }

      const name = cleanTargetTitle(tp.description, tp.manufacturer);
      if (!name || name.length < 5) { result.skipped++; continue; }

      const slug = slugify(name);
      if (!slug || slug.length < 3) { result.skipped++; continue; }

      const costPriceExVat = tp.price;
      if (costPriceExVat <= 0) { result.skipped++; continue; }
      const sellPrice = Math.ceil(costPriceExVat * 1.2 * 1.02 * 100) / 100;

      const images: string[] = [];
      if (tp.largeimageurl) images.push(tp.largeimageurl);
      if (tp.imageurl && !images.includes(tp.imageurl)) images.push(tp.imageurl);
      const mainImage = images[0] || null;

      let categoryId: number | null = null;
      if (tp.category) {
        const areaCode = tp.category.substring(0, 2);
        const catSlug = targetCategoryMap[tp.category] || targetCategoryFallback[areaCode];
        if (catSlug) categoryId = catBySlug.get(catSlug) || null;
      }

      const mpn = tp.manupartcode?.trim() || null;
      const mpnKey = mpn && mpn.length > 3 ? mpn.toLowerCase().trim() : null;

      const existingByMpnMatch = mpnKey ? existingByMpn.get(mpnKey) : null;
      const existingBySlugMatch = existingBySlug.get(slug);
      const existing = existingByMpnMatch || existingBySlugMatch;

      if (existing) {
        if (existingByMpnMatch) matchedByMpn++;
        else matchedBySlug++;
        const updates: Record<string, any> = {};
        if (existing.inStock !== true) updates.inStock = true;

        const hasNoImage = !existing.image;
        const hasBadImage = existing.image && (existing.image.includes("placeholder") || existing.image.includes("no-image") || existing.image.includes("default"));
        if (mainImage && (hasNoImage || hasBadImage)) {
          updates.image = mainImage;
        }

        if (images.length > 0) {
          let existingImages: string[] = [];
          try { if (existing.images) existingImages = typeof existing.images === "string" ? JSON.parse(existing.images) : existing.images; } catch {}
          const merged = [...existingImages];
          for (const img of images) {
            if (img && !merged.some(e => e === img || e.replace(/-lg\./i, '.').replace(/\.JPG$/i, '.jpg') === img.replace(/-lg\./i, '.').replace(/\.JPG$/i, '.jpg'))) {
              merged.push(img);
            }
          }
          if (merged.length > existingImages.length) {
            updates.images = JSON.stringify(merged);
          }
        }

        const existingCost = existing.costPrice || Infinity;
        if (costPriceExVat < existingCost) {
          updates.costPrice = costPriceExVat;
          updates.source = "Target Components";
          const newMinSell = Math.ceil(costPriceExVat * 1.2 * 1.02 * 100) / 100;
          if (existing.price > newMinSell + 0.50 || existing.price < newMinSell - 0.50) {
            updates.price = newMinSell;
          }
        }

        if (tp.manufacturer && tp.manufacturer !== existing.vendor) updates.vendor = tp.manufacturer;
        if (mpn && existing.mpn !== mpn) updates.mpn = mpn;
        if (tp.ean && !existing.ean) updates.ean = tp.ean;

        const existingDesc = existing.description || "";
        const needsDescRefresh = existingDesc && !existingDesc.includes("**") && tp.extendeddescription;
        if (needsDescRefresh) {
          let html = tp.extendeddescription!;
          html = html.replace(/<br\s*\/?>/gi, "\n");
          html = html.replace(/<\/?(p|div|tr|li)\s*[^>]*>/gi, "\n");
          html = html.replace(/<\/?(h[1-6]|strong|b)\s*[^>]*>/gi, (m: string) => {
            if (m.match(/^<\//)) return "\n";
            return "\n**";
          });
          html = html.replace(/\*\*([^*\n]+)\n/g, "**$1**\n");
          html = html.replace(/<\/?(td|th)\s*[^>]*>/gi, " | ");
          html = html.replace(/<[^>]+>/g, "");
          html = html.replace(/&amp;/gi, "&").replace(/&lt;/gi, "<").replace(/&gt;/gi, ">").replace(/&nbsp;/gi, " ").replace(/&quot;/gi, '"').replace(/&#\d+;/gi, " ").replace(/&[a-z]+;/gi, " ");
          html = html.replace(/\n{3,}/g, "\n\n").replace(/[ \t]+/g, " ").trim();
          const dLines = html.split("\n").map((l: string) => l.trim()).filter((l: string) => l.length > 0);
          const newDesc = dLines.join("\n");
          if (newDesc.length > 50) {
            updates.description = newDesc;
            const newSpecs: Record<string, string> = {};
            const specSection = newDesc.split(/\*\*Specifications\*\*/i);
            if (specSection.length > 1) {
              const specLines = specSection[1].split("\n").map((l: string) => l.trim()).filter((l: string) => l.length > 0);
              for (let si = 0; si < specLines.length; si++) {
                const line = specLines[si].replace(/^\*\*|\*\*$/g, "");
                if (si + 1 < specLines.length && !specLines[si + 1].startsWith("**")) {
                  const value = specLines[si + 1].replace(/^\*\*|\*\*$/g, "");
                  if (line.length < 50 && value.length < 100) {
                    newSpecs[line] = value;
                    si++;
                  }
                }
              }
            }
            if (Object.keys(newSpecs).length > 0) {
              updates.specs = JSON.stringify(newSpecs);
            }
          }
        }

        if (!existing.features && tp.overview) {
          const cleaned = tp.overview.replace(/<[^>]+>/g, " ").replace(/&[a-z]+;/gi, " ");
          const parts = cleaned.split(/[,;|]/).map((s: string) => s.trim()).filter((s: string) => s.length > 3 && s.length < 150);
          if (parts.length > 0) updates.features = JSON.stringify(parts);
        }

        if (Object.keys(updates).length > 0) {
          try {
            await storage.updateProduct(existing.id, updates);
            result.updated++;
          } catch (updateErr: any) {
            const msg = String(updateErr?.message || "") + String(updateErr?.detail || "");
            if (msg.includes("duplicate") || msg.includes("unique")) {
              result.skipped++;
            } else {
              result.errors++;
            }
          }
        } else {
          result.skipped++;
        }
        continue;
      }

      let uniqueSlug = slug;
      while (existingBySlug.has(uniqueSlug)) {
        uniqueSlug = `${slug}-${tp.stockcode}`.substring(0, 100);
      }

      let description = tp.description;
      if (tp.extendeddescription) {
        let html = tp.extendeddescription;
        html = html.replace(/<br\s*\/?>/gi, "\n");
        html = html.replace(/<\/?(p|div|tr|li)\s*[^>]*>/gi, "\n");
        html = html.replace(/<\/?(h[1-6]|strong|b)\s*[^>]*>/gi, (m: string) => {
          if (m.match(/^<\//)) return "\n";
          return "\n**";
        });
        html = html.replace(/\*\*([^*\n]+)\n/g, "**$1**\n");
        html = html.replace(/<\/?(td|th)\s*[^>]*>/gi, " | ");
        html = html.replace(/<[^>]+>/g, "");
        html = html.replace(/&amp;/gi, "&").replace(/&lt;/gi, "<").replace(/&gt;/gi, ">").replace(/&nbsp;/gi, " ").replace(/&quot;/gi, '"').replace(/&#\d+;/gi, " ").replace(/&[a-z]+;/gi, " ");
        html = html.replace(/\n{3,}/g, "\n\n").replace(/[ \t]+/g, " ").trim();
        const lines = html.split("\n").map((l: string) => l.trim()).filter((l: string) => l.length > 0);
        const cleaned = lines.join("\n");
        if (cleaned.length > 50) description = cleaned;
      }

      const features: string[] = [];
      if (tp.overview) {
        const cleaned = tp.overview.replace(/<[^>]+>/g, " ").replace(/&[a-z]+;/gi, " ");
        const parts = cleaned.split(/[,;|]/).map((s: string) => s.trim()).filter((s: string) => s.length > 3 && s.length < 150);
        features.push(...parts);
      }

      const specs: Record<string, string> = {};
      if (description) {
        const specSection = description.split(/\*\*Specifications\*\*/i);
        if (specSection.length > 1) {
          const specLines = specSection[1].split("\n").map((l: string) => l.trim()).filter((l: string) => l.length > 0);
          for (let si = 0; si < specLines.length; si++) {
            const line = specLines[si].replace(/^\*\*|\*\*$/g, "");
            if (si + 1 < specLines.length && !specLines[si + 1].startsWith("**")) {
              const value = specLines[si + 1].replace(/^\*\*|\*\*$/g, "");
              if (line.length < 50 && value.length < 100) {
                specs[line] = value;
                si++;
              }
            }
          }
        }
      }

      const productData = {
        name,
        slug: uniqueSlug,
        description,
        price: sellPrice,
        costPrice: costPriceExVat,
        compareAtPrice: null,
        categoryId,
        image: mainImage,
        images: images.length > 0 ? JSON.stringify(images) : null,
        specs: Object.keys(specs).length > 0 ? JSON.stringify(specs) : null,
        features: features.length > 0 ? JSON.stringify(features) : null,
        vipFeatures: null as string | null,
        badge: null as string | null,
        inStock: true,
        vendor: tp.manufacturer || null,
        mpn,
        ean: tp.ean || null,
        source: "Target Components",
        stripeProductId: null,
        stripePriceId: null,
      };

      newCount++;
      try {
        const created = await storage.createProduct(productData);
        existingBySlug.set(uniqueSlug, created);
        if (mpnKey) existingByMpn.set(mpnKey, created);
        result.imported++;
      } catch (createErr: any) {
        const msg = String(createErr?.message || "") + String(createErr?.detail || "");
        if (msg.includes("duplicate") || msg.includes("unique")) {
          result.skipped++;
        } else {
          result.errors++;
          console.error(`[Target] Create error for "${name}": ${createErr.message}`);
        }
      }
    } catch (e: any) {
      result.errors++;
      console.error(`[Target] Error processing ${tp.stockcode}: ${e.message}`);
    }
  }

  console.log(`[Target] Match breakdown: ${matchedByMpn} by MPN, ${matchedBySlug} by slug, ${newCount} new unique products`);
  const accounted = result.imported + result.updated + result.skipped + result.outOfStock + result.errors;
  console.log(`[Target] Sync complete: ${result.imported} new imported, ${result.updated} updated, ${result.skipped} matched/skipped, ${result.outOfStock} out of stock, ${result.errors} errors (${accounted}/${result.total})`);
  return result;
}

export interface TargetOrderRequest {
  orderAction: "CREATE" | "SUBMIT";
  orderRef?: string;
  deliveryContact: string;
  deliveryCompany?: string;
  addressLine1: string;
  addressLine2?: string;
  addressLine3?: string;
  town: string;
  postcode: string;
  phone?: string;
  email?: string;
  lines: { stockcode: string; quantity: number }[];
}

export async function submitTargetOrder(order: TargetOrderRequest): Promise<any> {
  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<tcrequest>\n`;
  xml += `  <account>${TARGET_ACCOUNT}</account>\n`;
  xml += `  <securitycode>${TARGET_SECURITY_CODE}</securitycode>\n`;
  xml += `  <action>ORDER</action>\n`;
  xml += `  <orderaction>${order.orderAction}</orderaction>\n`;
  xml += `  <header>\n`;
  if (order.orderRef) xml += `    <orderref>${order.orderRef}</orderref>\n`;
  xml += `    <deliveryaddress>\n`;
  xml += `      <deliverycontact>${escapeXml(order.deliveryContact)}</deliverycontact>\n`;
  if (order.deliveryCompany) xml += `      <deliverycompany>${escapeXml(order.deliveryCompany)}</deliverycompany>\n`;
  xml += `      <addressline1>${escapeXml(order.addressLine1)}</addressline1>\n`;
  if (order.addressLine2) xml += `      <addressline2>${escapeXml(order.addressLine2)}</addressline2>\n`;
  if (order.addressLine3) xml += `      <addressline3>${escapeXml(order.addressLine3)}</addressline3>\n`;
  xml += `      <addresstown>${escapeXml(order.town)}</addresstown>\n`;
  xml += `      <postcode>${escapeXml(order.postcode)}</postcode>\n`;
  if (order.phone) xml += `      <deliveryphone>${escapeXml(order.phone)}</deliveryphone>\n`;
  if (order.email) xml += `      <deliveryemail>${escapeXml(order.email)}</deliveryemail>\n`;
  xml += `    </deliveryaddress>\n`;
  xml += `  </header>\n`;
  for (const line of order.lines) {
    xml += `  <line>\n`;
    xml += `    <stockcode>${escapeXml(line.stockcode)}</stockcode>\n`;
    xml += `    <quantity>${line.quantity}</quantity>\n`;
    xml += `  </line>\n`;
  }
  xml += `</tcrequest>`;

  return await postTargetXml(xml);
}

export async function getTargetOrderStatus(ordnum?: string, ordref?: string): Promise<any> {
  const extras: Record<string, string> = {};
  if (ordnum) extras.ordnum = ordnum;
  if (ordref) extras.orderref = ordref;
  const xml = buildRequest("ORDERSTATUS", extras);
  return await postTargetXml(xml);
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

let targetSyncInterval: ReturnType<typeof setInterval> | null = null;

export function startTargetScheduler(intervalHours = 6) {
  if (targetSyncInterval) return;

  if (!TARGET_ACCOUNT || !TARGET_SECURITY_CODE) {
    console.log("[Target] No credentials configured, scheduler not started");
    return;
  }

  console.log(`[Target Scheduler] Started — syncing every ${intervalHours} hours`);

  targetSyncInterval = setInterval(async () => {
    try {
      console.log("[Target Scheduler] Running scheduled sync...");
      const result = await syncTargetProducts();
      console.log(`[Target Scheduler] Done: ${result.imported} new, ${result.updated} updated, ${result.outOfStock} out of stock`);

      console.log("[Target Scheduler] Starting internet price matching...");
      const priceResult = await matchInternetPrices(500);
      console.log(`[Target Scheduler] Price match done: ${priceResult.priceUpdated} updated, ${priceResult.noResultsFound} no results`);
    } catch (e: any) {
      console.error("[Target Scheduler] Error:", e.message);
    }
  }, intervalHours * 60 * 60 * 1000);
}
