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
  if (price.OnOffer === "True" && price.OfferDiscount1 > 0) {
    return price.OfferDiscount1;
  }

  if (price.Discount1 > 0) {
    return price.Discount1;
  }

  if (price.TradePrice && price.TradePrice > 0) {
    return price.TradePrice;
  }

  const fallbacks = [price.Discount2, price.Discount3, price.OfferDiscount1, price.OfferDiscount2, price.OfferDiscount3].filter((v): v is number => typeof v === 'number' && v > 0);
  if (fallbacks.length > 0) return Math.min(...fallbacks);

  return 0;
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

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 120000);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "text/xml; charset=utf-8",
        SOAPAction: action,
      },
      body: envelope,
      signal: controller.signal,
    });

    if (!res.ok) throw new Error(`SOAP request failed: ${res.status}`);
    return res.text();
  } finally {
    clearTimeout(timeout);
  }
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
    const debugSkus = [127414];
    for (const dsku of debugSkus) {
      const dp = prices.find(p => p.ProdID === dsku || p.SKU === dsku);
      if (dp) console.log(`[VIP] DEBUG price for SKU ${dsku}:`, JSON.stringify(dp));
    }
  }
  const map = new Map<number, VipPrice>();
  for (const p of prices) {
    map.set(p.ProdID, p);
    if (p.SKU && p.SKU !== p.ProdID) {
      map.set(p.SKU, p);
    }
  }
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
  for (const s of stocks) {
    map.set(s.ProdID, s);
    if (s.SKU && s.SKU !== s.ProdID) {
      map.set(s.SKU, s);
    }
  }
  return map;
}

function cleanProductTitle(raw: string, manufacturer: string, productGroup: string, mpn?: string): string {
  let name = raw.trim();

  if (mpn && mpn.length > 5 && name.endsWith(mpn)) {
    name = name.slice(0, -mpn.length).trim();
  }
  if (mpn && mpn.length > 5 && name.includes(` ${mpn} `)) {
    name = name.replace(` ${mpn} `, " ").trim();
  }

  name = name
    .replace(/\b(OEM|BULK|TRAY|BOX|RET|RETAIL)\b/gi, "")
    .replace(/\b"?NEW"?\s*-?\s*/i, "")
    .replace(/\s*\(?\bMOQ\s*\d+\)?\s*/gi, "")
    .replace(/\s*\(?\bEOL\)?\s*/gi, "")
    .replace(/\bN\/A\b/gi, "")
    .replace(/\bLTD\s*STOCK\b/gi, "")
    .replace(/\bCLEARANCE\b/gi, "")
    .replace(/\bEX\s*DISPLAY\b/gi, "")
    .replace(/\bREFURB(?:ISHED)?\b/gi, "Refurbished");

  name = name.replace(/\s*\(([^)]*)\)/g, (_match, inner: string) => {
    const kept: string[] = [];
    const parts = inner.split("/");
    for (const part of parts) {
      const p = part.trim();
      if (/^\d+\s*GB\s+GDDR\d\w?$/i.test(p)) { kept.push(p); continue; }
      if (/^\d+\s*GB\s+DDR[45]\w?$/i.test(p)) { kept.push(p); continue; }
      if (/^\d+\s*TB\b/i.test(p)) { kept.push(p); continue; }
      if (/^\d+\s*GB\b/i.test(p) && !/Gb\/s/i.test(p)) { kept.push(p); continue; }
      if (/^\d+x\d+\s*GB$/i.test(p)) { kept.push(p); continue; }
      if (/^(?:E-?ATX|ATX|Micro\s*ATX|M-?ATX|M-?ITX|Mini[- ]ITX)$/i.test(p)) { kept.push(p); continue; }
      if (/^[A-Z]\d{3,4}\w?$/i.test(p)) { kept.push(p); continue; }
      if (/^(?:Socket\s+)?(?:AM[45]|1[78]\d{2}|LGA\s*\d+)/i.test(p)) { kept.push(p); continue; }
      if (/^\d+["']\s*(IPS|VA|TN|OLED)/i.test(p)) { kept.push(p); continue; }
    }
    return kept.length > 0 ? " " + kept.join(" ") : "";
  });

  if (manufacturer) {
    const nameNoSpaces = name.replace(/\s+/g, "").toLowerCase();
    const mfgNoSpaces = manufacturer.replace(/\s+/g, "").toLowerCase();
    if (nameNoSpaces === mfgNoSpaces || name.trim().toLowerCase() === manufacturer.toLowerCase()) {
      const pg = productGroup || "";
      name = `${manufacturer} ${pg}`.trim();
    }
  }

  const words = name.split(/\s+/).filter(w => w.length > 0);
  const titleCased = words.map(word => {
    if (/^[A-Z]{2,}$/.test(word)) {
      const upper = ["RGB", "LED", "USB", "SSD", "HDD", "DDR4", "DDR5", "HDMI", "DP", "ATX", "ITX",
        "MATX", "EATX", "NVME", "PCIE", "PCI", "AMD", "AIO", "TDP", "PWM", "LCD", "IPS", "VA",
        "TN", "OLED", "QHD", "FHD", "UHD", "CPU", "GPU", "PSU", "RAM", "SATA", "LGA", "GDDR6",
        "GDDR6X", "GDDR7", "LPDDR5", "LPDDR5X", "GEN4", "GEN5", "GEN3", "BT", "AC", "AX", "WI-FI",
        "TB", "GB", "MB", "GHZ", "MHZ", "RPM", "CFM", "RTX", "GTX", "RX", "XT", "XL", "XTX",
        "ARGB", "CL", "ECC", "DIMM", "SODIMM", "M.2", "U.2", "AM4", "AM5", "LGA1700", "LGA1851",
        "TKL", "UK", "PC", "QD", "HDR", "DPI"];
      if (upper.includes(word)) return word;

      const brandUpper = ["ASUS", "MSI", "EVGA", "NZXT", "EKWB", "AOC", "JBL", "HWL", "OWC", "PNY",
        "XFX", "XPG", "KFA2", "BFG", "OCZ", "FSP", "HYTE"];
      if (brandUpper.includes(word)) return word;

      return word.charAt(0) + word.slice(1).toLowerCase();
    }
    return word;
  });

  name = titleCased.join(" ");

  name = name
    .replace(/\bGeforce\b/gi, "GeForce")
    .replace(/\bRadeon\b/gi, "Radeon")
    .replace(/\bRyzen\b/gi, "Ryzen")
    .replace(/\bThreadripper\b/gi, "Threadripper")
    .replace(/\bCore\s+I(\d)/gi, "Core i$1")
    .replace(/\bNvidia\b/gi, "NVIDIA")
    .replace(/\bIntel\b/gi, "Intel")
    .replace(/\bSapphire\b/gi, "Sapphire")
    .replace(/\bGigabyte\b/gi, "Gigabyte")
    .replace(/\bCorsair\b/gi, "Corsair")
    .replace(/\bKingston\b/gi, "Kingston")
    .replace(/\bSamsung\b/gi, "Samsung")
    .replace(/\bSeagate\b/gi, "Seagate")
    .replace(/\bCrucial\b/gi, "Crucial")
    .replace(/\bWestern\s+Digital\b/gi, "Western Digital")
    .replace(/\bLogitech\b/gi, "Logitech")
    .replace(/\bRazer\b/gi, "Razer")
    .replace(/\bSteelseries\b/gi, "SteelSeries")
    .replace(/\bHyperx\b/gi, "HyperX")
    .replace(/\bDeepcool\b/gi, "DeepCool")
    .replace(/\bNoctua\b/gi, "Noctua")
    .replace(/\bThermaltake\b/gi, "Thermaltake")
    .replace(/\bCoolermaster\b/gi, "Cooler Master")
    .replace(/\bCooler\s+Master\b/gi, "Cooler Master")
    .replace(/\bBe\s+Quiet\b/gi, "be quiet!")
    .replace(/\bBequiet\b/gi, "be quiet!")
    .replace(/\bFractal\s+Design\b/gi, "Fractal Design")
    .replace(/\bAsrock\b/gi, "ASRock")
    .replace(/\bBenq\b/gi, "BenQ")
    .replace(/\bTplink\b/gi, "TP-Link")
    .replace(/\bTp-Link\b/gi, "TP-Link")
    .replace(/\bNetgear\b/gi, "NETGEAR");

  const groupLabel: Record<string, string> = {
    "CPUs": "Processor",
    "Graphics Cards": "Graphics Card",
    "Hard Drives": "Hard Drive",
    "Solid State Drives": "SSD",
    "External Storage": "External Drive",
    "Power Supply Units": "Power Supply",
    "Coolers": "CPU Cooler",
    "Headsets": "Gaming Headset",
    "Keyboards": "Keyboard",
    "Mice": "Mouse",
    "Monitors": "Monitor",
    "Motherboards": "Motherboard",
    "Memory": "Memory",
    "Cases": "PC Case",
    "Speakers": "Speaker",
    "Webcams": "Webcam",
    "Networking - Wired": "Network Switch",
    "Networking - Wireless": "Wi-Fi Router",
    "Notebooks": "Laptop",
  };

  name = name.replace(/\s{2,}/g, " ").trim();
  name = name.replace(/^[-–—,.\s]+|[-–—,.\s]+$/g, "").trim();

  return name;
}

function getProductName(product: VipProduct): string {
  let raw = product.Description;
  if (product.Attributes) {
    const attrs = Array.isArray(product.Attributes) ? product.Attributes : [product.Attributes];
    const nameAttr = attrs.find((a: any) => a.AttributeName === "Product Name");
    if (nameAttr?.AttributeValue) raw = String(nameAttr.AttributeValue);
  }
  return cleanProductTitle(raw, product.Manufacturer, product.ProductGroup, product.ManufacturersPartNumber);
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
  const existingByMpn = new Map<string, typeof existingProducts[0]>();
  for (const p of existingProducts) {
    if (p.mpn && p.mpn.length > 3) {
      existingByMpn.set(p.mpn.toLowerCase().trim(), p);
    }
  }

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
      let price = priceMap.get(vp.ProdID) || priceMap.get(vp.SKU);
      let stock = stockMap.get(vp.ProdID) || stockMap.get(vp.SKU);

      if (vp.ProdID === 183738 || vp.SKU === 127414 || vp.ProdID === 127414 || (vp.Description && vp.Description.includes("9070 XT") && vp.Description.includes("PRIME"))) {
        console.log(`[VIP] DEBUG product: ProdID=${vp.ProdID}, SKU=${vp.SKU}, desc="${vp.Description}", priceFound=${!!price}, costPrice=${price ? getBestCostPrice(price) : 'N/A'}`);
      }

      const buyPrice = price ? getBestCostPrice(price) : 0;
      if (buyPrice <= 0) {
        result.skipped++;
        continue;
      }

      const costPriceExVat = buyPrice;
      const minSellPrice = Math.ceil(costPriceExVat * 1.2 * 1.02 * 100) / 100;
      const isInStock = stock ? stock.AvailQty > 0 : false;
      if (!isInStock) result.outOfStock++;

      const name = getProductName(vp);
      let slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/-+$/, "").replace(/^-+/, "").substring(0, 80);
      if (slug.length < 10) {
        slug = `${slug}-${vp.SKU || vp.ProdID}`.substring(0, 100);
      }
      const imageUrl = buildImageUrl(vp);

      const catSlug = vipCategoryMap[vp.ProductGroup];
      let categoryId: number | null = catSlug ? (catBySlug.get(catSlug) || null) : null;
      if (categoryId) result.categoriesMatched++;

      const mpn = vp.ManufacturersPartNumber?.trim() || null;
      const mpnKey = mpn && mpn.length > 3 ? mpn.toLowerCase().trim() : null;
      const existing = (mpnKey && existingByMpn.get(mpnKey)) || existingBySlug.get(slug);
      if (existing) {
        const updates: Record<string, any> = {};
        if (existing.name !== name) updates.name = name;
        if (existing.slug !== slug) updates.slug = slug;
        if (existing.inStock !== isInStock) updates.inStock = isInStock;
        if (imageUrl && imageUrl !== existing.image) updates.image = imageUrl;
        if (vp.Manufacturer && vp.Manufacturer !== existing.vendor) updates.vendor = vp.Manufacturer;
        if (mpn && existing.mpn !== mpn) updates.mpn = mpn;

        const costChanged = !existing.costPrice || Math.abs(existing.costPrice - costPriceExVat) > 0.01;
        if (costChanged) {
          updates.costPrice = costPriceExVat;
        }
        const newMinSell = Math.ceil(costPriceExVat * 1.2 * 1.02 * 100) / 100;
        if (Math.abs(existing.price - newMinSell) > 0.50) {
          updates.price = newMinSell;
          console.log(`[VIP] Price updated: ${existing.name} — cost £${costPriceExVat.toFixed(2)} → sell £${newMinSell.toFixed(2)} (was £${existing.price.toFixed(2)})`);
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
          slug = `${slug}-${vp.SKU || vp.ProdID}`.substring(0, 100);
          productData.slug = slug;
          try {
            await storage.createProduct(productData);
            existingBySlug.set(slug, { id: 0, slug, inStock: isInStock, image: imageUrl, price: minSellPrice, costPrice: costPriceExVat, vendor: vp.Manufacturer || null } as any);
            result.imported++;
          } catch {
            result.skipped++;
          }
        } else {
          throw dupErr;
        }
      }
    } catch (e: any) {
      const errMsg = e?.message || e?.detail || (typeof e === 'object' ? JSON.stringify(e) : String(e)) || "unknown error";
      const errLine = `ProdID=${vp.ProdID} SKU=${vp.SKU} "${vp.Description || 'no desc'}": ${errMsg}`;
      result.errors.push(errLine);
      if (result.errors.length <= 5) {
        console.log(`[VIP] ERROR: ${errLine}`);
      }
    }
  }

  console.log(`[VIP] Sync complete: ${result.imported} imported, ${result.updated} updated, ${result.skipped} skipped, ${result.outOfStock} out of stock, ${result.errors.length} errors`);
  if (result.errors.length > 0) {
    console.log(`[VIP] First 10 errors:`);
    result.errors.slice(0, 10).forEach((e, i) => console.log(`[VIP]   ${i + 1}. ${e}`));
  }
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

export async function debugProductPrice(sku: number): Promise<any> {
  const sessionKey = await login();
  const priceMap = await getPrices(sessionKey);
  const priceData = priceMap.get(sku);
  const bestCost = priceData ? getBestCostPrice(priceData) : null;
  const minSell = bestCost ? Math.ceil(bestCost * 1.2 * 1.02 * 100) / 100 : null;
  return { sku, rawPriceData: priceData || null, selectedCost: bestCost, minSellPrice: minSell };
}

export async function deduplicateProducts(): Promise<number> {
  const allProducts = await storage.getProducts();
  const mpnGroups = new Map<string, typeof allProducts>();
  const nameGroups = new Map<string, typeof allProducts>();

  for (const p of allProducts) {
    if (p.mpn && p.mpn.length > 3) {
      const key = p.mpn.toLowerCase().trim();
      if (!mpnGroups.has(key)) mpnGroups.set(key, []);
      mpnGroups.get(key)!.push(p);
    }
    const nameKey = p.name.toLowerCase().replace(/[^a-z0-9]/g, "");
    if (!nameGroups.has(nameKey)) nameGroups.set(nameKey, []);
    nameGroups.get(nameKey)!.push(p);
  }

  let removed = 0;
  const removedIds = new Set<number>();

  for (const [, group] of mpnGroups) {
    if (group.length <= 1) continue;
    group.sort((a, b) => a.id - b.id);
    const keep = group[0];
    for (let i = 1; i < group.length; i++) {
      if (!removedIds.has(group[i].id)) {
        await storage.deleteProduct(group[i].id);
        removedIds.add(group[i].id);
        removed++;
        console.log(`[Dedup] Removed (MPN): "${group[i].name}" (id ${group[i].id}), kept "${keep.name}" (id ${keep.id})`);
      }
    }
  }

  for (const [, group] of nameGroups) {
    if (group.length <= 1) continue;
    const active = group.filter(p => !removedIds.has(p.id));
    if (active.length <= 1) continue;
    active.sort((a, b) => a.id - b.id);
    const keep = active[0];
    for (let i = 1; i < active.length; i++) {
      if (!removedIds.has(active[i].id)) {
        await storage.deleteProduct(active[i].id);
        removedIds.add(active[i].id);
        removed++;
        console.log(`[Dedup] Removed (name): "${active[i].name}" (id ${active[i].id}), kept "${keep.name}" (id ${keep.id})`);
      }
    }
  }

  return removed;
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
      const dedupResult = await deduplicateProducts();
      if (dedupResult > 0) console.log(`[VIP Scheduler] Dedup: removed ${dedupResult} duplicates`);
      console.log("[VIP Scheduler] Starting internet price matching...");
      const priceResult = await matchInternetPrices(500);
      console.log(`[VIP Scheduler] Price match done: ${priceResult.priceUpdated} updated, ${priceResult.noResultsFound} no results`);
    } catch (e: any) {
      console.error("[VIP Scheduler] Error:", e.message);
    }
  }, intervalHours * 60 * 60 * 1000);
}
