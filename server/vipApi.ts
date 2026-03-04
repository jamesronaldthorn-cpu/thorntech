import { XMLParser } from "fast-xml-parser";
import { storage } from "./storage";
import { matchInternetPrices } from "./priceMatcher";

const VIP_SECURITY_URL = "https://xml3.vip-computers.com/Security.asmx";
const VIP_PRODUCTS_URL = "https://xml3.vip-computers.com/Products.asmx";

const SECURITY_NS = "http://vip.group/VIPXML3/Security";
const PRODUCTS_NS = "http://vip.group/VIPXML3/Products";


interface VipProduct {
  ProdID: number;
  SKU: number;
  Description: string;
  Manufacturer: string;
  ManufacturersPartNumber: string;
  ProductGroup: string;
  ProductImage: string;
  EAN: number | string;
  Attributes?: any[];
}

interface VipPrice {
  ProdID: number;
  SKU: number;
  OnOffer: string;
  TradePrice?: number;
  Discount1: number;
  Discount2?: number;
  Discount3?: number;
  OfferDiscount1: number;
  OfferDiscount2?: number;
  OfferDiscount3?: number;
  RRP?: number;
  SRP?: number;
  [key: string]: any;
}

function getBestCostPrice(price: VipPrice): number {
  const candidates: number[] = [];

  if (price.OnOffer === "True") {
    if (price.OfferDiscount1 > 0) candidates.push(price.OfferDiscount1);
    if (price.OfferDiscount2 && price.OfferDiscount2 > 0) candidates.push(price.OfferDiscount2);
    if (price.OfferDiscount3 && price.OfferDiscount3 > 0) candidates.push(price.OfferDiscount3);
  }

  if (price.Discount1 > 0) candidates.push(price.Discount1);
  if (price.Discount2 && price.Discount2 > 0) candidates.push(price.Discount2);
  if (price.Discount3 && price.Discount3 > 0) candidates.push(price.Discount3);
  if (price.TradePrice && price.TradePrice > 0) candidates.push(price.TradePrice);

  if (candidates.length === 0) return 0;
  return Math.min(...candidates);
}

interface VipStock {
  ProdID: number;
  SKU: number;
  AvailQty: number;
  OnOrder: number;
  ProductStatus: number;
}

function buildImageUrl(product: VipProduct): string | null {
  if (product.ProductImage) {
    const match = product.ProductImage.match(/\/(\d+)\.jpg$/i);
    if (match) {
      return `https://www.vip-computers.com/uk/images/products/${match[1]}.jpg`;
    }
  }
  return null;
}

async function soapRequest(url: string, action: string, body: string, headers?: string): Promise<string> {
  const envelope = `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  ${headers || ""}
  <soap:Body>
    ${body}
  </soap:Body>
</soap:Envelope>`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "text/xml; charset=utf-8",
      SOAPAction: action,
    },
    body: envelope,
  });

  if (!res.ok) throw new Error(`SOAP request failed: ${res.status}`);
  return res.text();
}

async function login(): Promise<string> {
  const accountId = process.env.VIP_ACCOUNT_ID || "";
  const username = process.env.VIP_USERNAME || "";
  const password = process.env.VIP_PASSWORD || "";

  if (!accountId || !username || !password) {
    throw new Error("VIP Computers credentials not configured (VIP_ACCOUNT_ID, VIP_USERNAME, VIP_PASSWORD)");
  }

  const xml = await soapRequest(
    VIP_SECURITY_URL,
    `${SECURITY_NS}/Login`,
    `<Login xmlns="${SECURITY_NS}">
      <AccountNumber>${accountId}</AccountNumber>
      <UserName>${username}</UserName>
      <Password>${password}</Password>
    </Login>`
  );

  const parser = new XMLParser({ ignoreAttributes: false });
  const parsed = parser.parse(xml);
  const ticket = parsed?.["soap:Envelope"]?.["soap:Body"]?.LoginResponse?.LoginResult?.ServiceTicket?.Ticket;

  if (!ticket?.IsAuthenticated || ticket.IsAuthenticated === "false") {
    throw new Error("VIP authentication failed — check credentials");
  }

  return ticket.SessionKey;
}

function authHeader(sessionKey: string): string {
  return `<soap:Header>
    <AuthHeader xmlns="${PRODUCTS_NS}">
      <SessionKey>${sessionKey}</SessionKey>
      <UserName>${process.env.VIP_USERNAME}</UserName>
      <AccountNo>${process.env.VIP_ACCOUNT_ID}</AccountNo>
    </AuthHeader>
  </soap:Header>`;
}

async function getProducts(sessionKey: string): Promise<VipProduct[]> {
  const xml = await soapRequest(
    VIP_PRODUCTS_URL,
    `${PRODUCTS_NS}/GetProducts`,
    `<GetProducts xmlns="${PRODUCTS_NS}" />`,
    authHeader(sessionKey)
  );

  const parser = new XMLParser({ ignoreAttributes: false });
  const parsed = parser.parse(xml);
  const catalog = parsed?.["soap:Envelope"]?.["soap:Body"]?.GetProductsResponse?.GetProductsResult?.ProductCatalog;
  const products = catalog?.Products;
  if (!products) return [];
  return Array.isArray(products) ? products : [products];
}

async function getPrices(sessionKey: string): Promise<Map<number, VipPrice>> {
  const xml = await soapRequest(
    VIP_PRODUCTS_URL,
    `${PRODUCTS_NS}/GetProductPrices`,
    `<GetProductPrices xmlns="${PRODUCTS_NS}" />`,
    authHeader(sessionKey)
  );

  const parser = new XMLParser({ ignoreAttributes: false });
  const parsed = parser.parse(xml);
  const priceData = parsed?.["soap:Envelope"]?.["soap:Body"]?.GetProductPricesResponse?.GetProductPricesResult;

  let prices: VipPrice[] = [];
  function findArray(obj: any, depth = 0): VipPrice[] | null {
    if (depth > 5 || !obj || typeof obj !== "object") return null;
    if (Array.isArray(obj)) return obj;
    for (const key of Object.keys(obj)) {
      if (Array.isArray(obj[key]) && obj[key].length > 10) return obj[key];
      const r = findArray(obj[key], depth + 1);
      if (r) return r;
    }
    return null;
  }

  prices = findArray(priceData) || [];
  if (prices.length > 0) {
    const sample = prices[0];
    console.log(`[VIP] Price fields available: ${Object.keys(sample).join(", ")}`);
    console.log(`[VIP] Sample price record:`, JSON.stringify(sample));
  }
  const map = new Map<number, VipPrice>();
  for (const p of prices) map.set(p.ProdID, p);
  return map;
}

async function getStock(sessionKey: string): Promise<Map<number, VipStock>> {
  const xml = await soapRequest(
    VIP_PRODUCTS_URL,
    `${PRODUCTS_NS}/GetProductStock`,
    `<GetProductStock xmlns="${PRODUCTS_NS}" />`,
    authHeader(sessionKey)
  );

  const parser = new XMLParser({ ignoreAttributes: false });
  const parsed = parser.parse(xml);
  const stockData = parsed?.["soap:Envelope"]?.["soap:Body"]?.GetProductStockResponse?.GetProductStockResult;

  let stocks: VipStock[] = [];
  function findArray(obj: any, depth = 0): VipStock[] | null {
    if (depth > 5 || !obj || typeof obj !== "object") return null;
    if (Array.isArray(obj)) return obj;
    for (const key of Object.keys(obj)) {
      if (Array.isArray(obj[key]) && obj[key].length > 10) return obj[key];
      const r = findArray(obj[key], depth + 1);
      if (r) return r;
    }
    return null;
  }

  stocks = findArray(stockData) || [];
  const map = new Map<number, VipStock>();
  for (const s of stocks) map.set(s.ProdID, s);
  return map;
}

function getProductName(product: VipProduct): string {
  if (product.Attributes) {
    const attrs = Array.isArray(product.Attributes) ? product.Attributes : [product.Attributes];
    const nameAttr = attrs.find((a: any) => a.AttributeName === "Product Name");
    if (nameAttr?.AttributeValue) return String(nameAttr.AttributeValue);
  }
  return product.Description;
}

function getProductDescription(product: VipProduct): string {
  const parts: string[] = [];
  if (product.Attributes) {
    const attrs = Array.isArray(product.Attributes) ? product.Attributes : [product.Attributes];
    const skip = new Set(["Product Name", "Web Address", "EAN", "Model Number"]);
    for (const attr of attrs) {
      if (!skip.has(attr.AttributeName) && attr.AttributeValue) {
        parts.push(`${attr.AttributeName}: ${attr.AttributeValue}`);
      }
    }
  }
  return parts.join("\n") || product.Description;
}

const vipCategoryMap: Record<string, string> = {
  "Accessories": "accessories",
  "Adapters & Docks": "cables-adapters",
  "CPUs": "processors",
  "Cables": "cables-adapters",
  "Capture Cards": "accessories",
  "Cases": "cases",
  "Chargers": "accessories",
  "Coolers": "cooling",
  "DJ Equipment": "accessories",
  "Display Acc": "monitors",
  "Exclusive Bundles": "pre-built-pcs",
  "External Storage": "storage",
  "Gaming Accessories": "controllers-gaming",
  "Gaming Furniture": "accessories",
  "Gaming Surfaces/Mats": "accessories",
  "Graphics Cards": "graphics-cards",
  "Hard Drives": "storage",
  "Headsets": "headsets-audio",
  "I/O Cards": "accessories",
  "Keyboards": "keyboards",
  "Memory": "memory",
  "Mice": "mice",
  "Monitors": "monitors",
  "Motherboards": "motherboards",
  "Networking - Wired": "networking",
  "Networking - Wireless": "networking",
  "Notebooks": "laptops",
  "Power Supply Units": "power-supplies",
  "Projectors": "monitors",
  "Server Boards/Systems": "pre-built-pcs",
  "Software": "software",
  "Solid State Drives": "storage",
  "Speakers": "headsets-audio",
  "Streaming": "accessories",
  "Systems": "pre-built-pcs",
  "Toys": "accessories",
  "Webcams": "accessories",
};

export interface VipSyncResult {
  totalProducts: number;
  imported: number;
  updated: number;
  skipped: number;
  outOfStock: number;
  categoriesMatched: number;
  errors: string[];
}

export async function syncVipProducts(): Promise<VipSyncResult> {
  console.log("[VIP] Logging in...");
  const sessionKey = await login();
  console.log("[VIP] Authenticated, fetching data...");

  const [vipProducts, priceMap, stockMap] = await Promise.all([
    getProducts(sessionKey),
    getPrices(sessionKey),
    getStock(sessionKey),
  ]);

  console.log(`[VIP] Fetched ${vipProducts.length} products, ${priceMap.size} prices, ${stockMap.size} stock entries`);

  const storeCategories = await storage.getCategories();
  const catBySlug = new Map(storeCategories.map(c => [c.slug, c.id]));

  const existingProducts = await storage.getProducts();
  const existingBySlug = new Map(existingProducts.map(p => [p.slug, p]));

  const result: VipSyncResult = {
    totalProducts: vipProducts.length,
    imported: 0,
    updated: 0,
    skipped: 0,
    outOfStock: 0,
    categoriesMatched: 0,
    errors: [],
  };

  for (const vp of vipProducts) {
    try {
      const price = priceMap.get(vp.ProdID);
      const stock = stockMap.get(vp.ProdID);

      const buyPrice = price ? getBestCostPrice(price) : 0;
      if (buyPrice <= 0) {
        result.skipped++;
        continue;
      }

      const costPriceExVat = buyPrice;
      const minSellPrice = Math.ceil(costPriceExVat * 1.2 * 1.05 * 100) / 100;
      const isInStock = stock ? stock.AvailQty > 0 : false;
      if (!isInStock) result.outOfStock++;

      const name = getProductName(vp);
      let slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/-+$/, "").substring(0, 80);
      const imageUrl = buildImageUrl(vp);

      const catSlug = vipCategoryMap[vp.ProductGroup];
      let categoryId: number | null = catSlug ? (catBySlug.get(catSlug) || null) : null;
      if (categoryId) result.categoriesMatched++;

      const existing = existingBySlug.get(slug);
      if (existing) {
        const updates: Record<string, any> = {};
        if (existing.inStock !== isInStock) updates.inStock = isInStock;
        if (imageUrl && imageUrl !== existing.image) updates.image = imageUrl;
        if (vp.Manufacturer && vp.Manufacturer !== existing.vendor) updates.vendor = vp.Manufacturer;

        const costChanged = !existing.costPrice || Math.abs(existing.costPrice - costPriceExVat) > 0.01;
        if (costChanged) {
          updates.costPrice = costPriceExVat;
          const newMinSell = Math.ceil(costPriceExVat * 1.2 * 1.05 * 100) / 100;
          if (existing.price < newMinSell) {
            updates.price = newMinSell;
            console.log(`[VIP] Price adjusted: ${existing.name} — cost £${costPriceExVat.toFixed(2)} → sell £${newMinSell.toFixed(2)} (was £${existing.price.toFixed(2)})`);
          }
        }

        if (Object.keys(updates).length > 0) {
          await storage.updateProduct(existing.id, updates);
          result.updated++;
        } else {
          result.skipped++;
        }
        continue;
      }

      if (existingBySlug.has(slug)) {
        slug = `${slug}-${vp.ProdID}`.substring(0, 100);
      }

      const description = getProductDescription(vp);
      const mpn = vp.ManufacturersPartNumber?.trim() || null;
      const ean = vp.EAN ? String(vp.EAN).trim() : null;
      const productData = {
        name,
        slug,
        description,
        price: minSellPrice,
        costPrice: costPriceExVat,
        compareAtPrice: null,
        categoryId,
        image: imageUrl,
        badge: null as string | null,
        inStock: isInStock,
        vendor: vp.Manufacturer || null,
        mpn,
        ean,
        stripeProductId: null,
        stripePriceId: null,
      };
      try {
        await storage.createProduct(productData);
        existingBySlug.set(slug, { id: 0, slug, inStock: isInStock, image: imageUrl, price: minSellPrice, costPrice: costPriceExVat, vendor: vp.Manufacturer || null } as any);
        result.imported++;
      } catch (dupErr: any) {
        if (dupErr.message?.includes("duplicate key")) {
          slug = `${slug}-${vp.ProdID}`.substring(0, 100);
          productData.slug = slug;
          await storage.createProduct(productData);
          existingBySlug.set(slug, { id: 0, slug, inStock: isInStock, image: imageUrl, price: minSellPrice, costPrice: costPriceExVat, vendor: vp.Manufacturer || null } as any);
          result.imported++;
        } else {
          throw dupErr;
        }
      }
    } catch (e: any) {
      result.errors.push(`${vp.Description}: ${e.message}`);
    }
  }

  console.log(`[VIP] Sync complete: ${result.imported} imported, ${result.updated} updated, ${result.skipped} skipped, ${result.outOfStock} out of stock`);
  return result;
}

export async function testConnection(): Promise<{ success: boolean; productCount: number; error?: string }> {
  try {
    const sessionKey = await login();
    const products = await getProducts(sessionKey);
    return { success: true, productCount: products.length };
  } catch (e: any) {
    return { success: false, productCount: 0, error: e.message };
  }
}

let vipSyncInterval: ReturnType<typeof setInterval> | null = null;

export function startVipScheduler(intervalHours = 6) {
  if (vipSyncInterval) return;

  const hasCredentials = process.env.VIP_ACCOUNT_ID && process.env.VIP_USERNAME && process.env.VIP_PASSWORD;
  if (!hasCredentials) {
    console.log("[VIP] No credentials configured, scheduler not started");
    return;
  }

  console.log(`[VIP Scheduler] Started — syncing every ${intervalHours} hours`);

  vipSyncInterval = setInterval(async () => {
    try {
      console.log("[VIP Scheduler] Running scheduled sync...");
      const result = await syncVipProducts();
      console.log(`[VIP Scheduler] Done: ${result.imported} new, ${result.updated} updated, ${result.outOfStock} out of stock`);
      console.log("[VIP Scheduler] Starting internet price matching...");
      const priceResult = await matchInternetPrices(500);
      console.log(`[VIP Scheduler] Price match done: ${priceResult.priceUpdated} updated, ${priceResult.noResultsFound} no results`);
    } catch (e: any) {
      console.error("[VIP Scheduler] Error:", e.message);
    }
  }, intervalHours * 60 * 60 * 1000);
}
