import { XMLParser, XMLBuilder } from "fast-xml-parser";
import { storage } from "./storage";

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
  PR: "processors",
  PRIN: "processors",
  PRAM: "processors",
  MB: "motherboards",
  GC: "graphics-cards",
  ME: "memory",
  HD: "storage",
  SS: "storage",
  CS: "cases",
  PS: "power-supplies",
  CP: "cooling",
  MO: "monitors",
  KB: "keyboards-mice",
  NE: "networking",
  SO: "software",
  AC: "accessories",
  CA: "cables-adapters",
  AU: "audio",
  PR: "peripherals",
};

export async function syncTargetProducts(): Promise<{ imported: number; updated: number; skipped: number; outOfStock: number; errors: number; total: number }> {
  const result = { imported: 0, updated: 0, skipped: 0, outOfStock: 0, errors: 0, total: 0 };

  let targetProducts: TargetProduct[];
  try {
    targetProducts = await getTargetAllProducts();
  } catch (e: any) {
    console.error("[Target] Failed to fetch products:", e.message);
    throw e;
  }

  result.total = targetProducts.length;
  console.log(`[Target] Processing ${targetProducts.length} products...`);

  const existingProducts = await storage.getProducts();
  const existingByMpn = new Map<string, any>();
  const existingBySlug = new Map<string, any>();
  for (const p of existingProducts) {
    if (p.mpn && p.mpn.length > 3) existingByMpn.set(p.mpn.toLowerCase().trim(), p);
    existingBySlug.set(p.slug, p);
  }

  const categories = await storage.getCategories();
  const catBySlug = new Map<string, number>();
  for (const c of categories) catBySlug.set(c.slug, c.id);

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
        const catSlug = targetCategoryMap[tp.category] || targetCategoryMap[areaCode];
        if (catSlug) categoryId = catBySlug.get(catSlug) || null;
      }

      const mpn = tp.manupartcode?.trim() || null;
      const mpnKey = mpn && mpn.length > 3 ? mpn.toLowerCase().trim() : null;

      const existing = (mpnKey && existingByMpn.get(mpnKey)) || existingBySlug.get(slug);

      if (existing) {
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
          const goodExisting = existingImages.filter((img: string) => img && !img.includes("placeholder") && !img.includes("no-image"));
          if (goodExisting.length === 0 && images.length > 0) {
            updates.images = JSON.stringify(images);
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
          console.log(`[Target] ${name}: Target cheaper (£${costPriceExVat.toFixed(2)} vs £${existingCost === Infinity ? "none" : existingCost.toFixed(2)}) — switching source to Target`);
        }

        if (tp.manufacturer && tp.manufacturer !== existing.vendor) updates.vendor = tp.manufacturer;
        if (mpn && existing.mpn !== mpn) updates.mpn = mpn;
        if (tp.ean && !existing.ean) updates.ean = tp.ean;

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
        const cleaned = tp.extendeddescription.replace(/<[^>]+>/g, " ").replace(/&[a-z]+;/gi, " ").replace(/\s{2,}/g, " ").trim();
        if (cleaned.length > 50) description = cleaned;
      }

      const features: string[] = [];
      if (tp.overview) {
        const parts = tp.overview.split(/[,;|]/).map((s: string) => s.trim()).filter((s: string) => s.length > 3 && s.length < 150);
        features.push(...parts);
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
        specs: null as string | null,
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

      try {
        const created = await storage.createProduct(productData);
        existingBySlug.set(uniqueSlug, created);
        if (mpnKey) existingByMpn.set(mpnKey, created);
        result.imported++;
      } catch (createErr: any) {
        const msg = String(createErr?.message || "");
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

  console.log(`[Target] Sync complete: ${result.imported} imported, ${result.updated} updated, ${result.skipped} skipped, ${result.outOfStock} out of stock, ${result.errors} errors`);
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
    } catch (e: any) {
      console.error("[Target Scheduler] Error:", e.message);
    }
  }, intervalHours * 60 * 60 * 1000);
}
