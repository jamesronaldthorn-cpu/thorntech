
import { XMLParser } from "fast-xml-parser";
import { storage } from "./storage";
import { matchInternetPrices } from "./priceMatcher";
import { nameBasedCategoryOverride } from "./targetApi";

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
  if (price.Discount1 > 0) return price.Discount1;
  if (price.TradePrice && price.TradePrice > 0) return price.TradePrice;

  const fallbacks = [
    price.Discount2, price.Discount3,
    price.OfferDiscount1, price.OfferDiscount2, price.OfferDiscount3,
  ].filter((v): v is number => typeof v === "number" && v > 0);
  if (fallbacks.length > 0) return Math.min(...fallbacks);

  // Last resort: use RRP/SRP as cost price basis if everything else is zero
  const rrp = price.RRP && price.RRP > 0 ? price.RRP : 0;
  const srp = price.SRP && price.SRP > 0 ? price.SRP : 0;
  const rrpBest = Math.min(...[rrp, srp].filter(v => v > 0));
  if (rrpBest > 0) {
    // Treat RRP as already including a margin — back-calculate cost at ~83% of RRP
    return Math.round(rrpBest * 0.83 * 100) / 100;
  }

  return 0;
}

interface VipStock {
  ProdID: number;
  SKU: number;
  AvailQty: number;
  OnOrder: number;
  ProductStatus: number;
}

function normalizeVipImageUrl(raw: string): string | null {
  let imgPath = raw.trim();
  if (!imgPath || imgPath === "0" || imgPath.toLowerCase() === "null" || imgPath.toLowerCase() === "n/a") return null;
  if (imgPath.startsWith("ftp://")) {
    const ftpFilename = imgPath.split("/").pop();
    if (ftpFilename && /\.(jpg|jpeg|png|webp|gif)$/i.test(ftpFilename)) {
      return `https://www.vip-computers.com/uk/images/products/${ftpFilename}`;
    }
    return null;
  }
  if (imgPath.startsWith("http")) return imgPath;
  if (imgPath.startsWith("//")) return `https:${imgPath}`;
  if (imgPath.startsWith("/")) return `https://www.vip-computers.com${imgPath}`;
  if (/\.(jpg|jpeg|png|webp|gif)$/i.test(imgPath)) {
    return `https://www.vip-computers.com/uk/images/products/${imgPath}`;
  }
  if (/^\d+$/.test(imgPath)) {
    return `https://www.vip-computers.com/uk/images/products/${imgPath}.jpg`;
  }
  return `https://www.vip-computers.com/uk/images/products/${imgPath}.jpg`;
}

function buildImageUrl(product: VipProduct): string | null {
  if (product.ProductImage) {
    const url = normalizeVipImageUrl(String(product.ProductImage));
    if (url) return url;
  }
  return buildFallbackImageUrl(product);
}

function extractAllVipImages(product: VipProduct): string[] {
  const images: string[] = [];
  if (product.ProductImage) {
    const main = normalizeVipImageUrl(String(product.ProductImage));
    if (main) images.push(main);
  }
  if (product.Attributes) {
    const attrs = Array.isArray(product.Attributes) ? product.Attributes : [product.Attributes];
    const imageAttrNames = ["Image", "Image 1", "Image 2", "Image 3", "Image 4", "Image 5",
      "Additional Image", "Additional Image 1", "Additional Image 2", "Additional Image 3",
      "Gallery Image", "Gallery Image 1", "Gallery Image 2", "Gallery Image 3",
      "Product Image", "Product Image 2", "Product Image 3",
      "Alternate Image", "Alt Image", "Secondary Image"];
    for (const attr of attrs) {
      const name = attr.AttributeName?.trim();
      const value = String(attr.AttributeValue || "").trim();
      if (!name || !value) continue;
      if (imageAttrNames.some(n => name.toLowerCase() === n.toLowerCase()) ||
          name.toLowerCase().includes("image") || name.toLowerCase().includes("photo") || name.toLowerCase().includes("picture")) {
        const url = normalizeVipImageUrl(value);
        if (url && !images.includes(url)) images.push(url);
      }
    }
  }
  return images;
}

function buildFallbackImageUrl(product: VipProduct): string | null {
  if (product.ProdID) {
    return `https://www.vip-computers.com/uk/images/products/${product.ProdID}.jpg`;
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
  const map = new Map<number | string, VipPrice>();
  for (const p of prices) {
    // Index by both numeric and string form to handle XML parser type inconsistencies
    if (p.ProdID != null) { map.set(p.ProdID, p); map.set(String(p.ProdID), p); }
    if (p.SKU != null && p.SKU !== p.ProdID) { map.set(p.SKU, p); map.set(String(p.SKU), p); }
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
  const map = new Map<number | string, VipStock>();
  for (const s of stocks) {
    if (s.ProdID != null) { map.set(s.ProdID, s); map.set(String(s.ProdID), s); }
    if (s.SKU != null && s.SKU !== s.ProdID) { map.set(s.SKU, s); map.set(String(s.SKU), s); }
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
  return cleanProductTitle(raw, product.Manufacturer, product.ProductGroup, product.ManufacturersPartNumber != null ? String(product.ManufacturersPartNumber) : undefined);
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

function extractVipSpecs(product: VipProduct): Record<string, string> {
  const specs: Record<string, string> = {};
  if (!product.Attributes) return specs;
  const attrs = Array.isArray(product.Attributes) ? product.Attributes : [product.Attributes];
  const skip = new Set(["Product Name", "Web Address", "EAN", "Model Number", "Description", "Long Description", "Marketing Text", "Special Features", "Key Features", "Features", "Highlights"]);
  for (const attr of attrs) {
    const name = attr.AttributeName?.trim();
    const value = String(attr.AttributeValue || "").trim();
    if (!name || !value || skip.has(name) || value.length > 200 || value.length < 1) continue;
    specs[name] = value;
  }
  return specs;
}

function extractVipFeatures(product: VipProduct): string[] {
  const features: string[] = [];
  if (!product.Attributes) return features;
  const attrs = Array.isArray(product.Attributes) ? product.Attributes : [product.Attributes];

  const specialFeaturesAttr = attrs.find((a: any) =>
    a.AttributeName === "Special Features" || a.AttributeName === "Key Features" || a.AttributeName === "Features" || a.AttributeName === "Highlights"
  );
  if (specialFeaturesAttr?.AttributeValue) {
    const val = String(specialFeaturesAttr.AttributeValue).trim();
    const parts = val.split(/[,;|]/).map(s => s.trim()).filter(s => s.length > 3 && s.length < 150);
    for (const p of parts) {
      if (!features.includes(p)) features.push(p);
    }
  }

  const longDesc = attrs.find((a: any) => a.AttributeName === "Long Description" || a.AttributeName === "Marketing Text");
  if (longDesc?.AttributeValue) {
    const text = String(longDesc.AttributeValue);
    const bullets = text.split(/[•\n]/).map(s => s.trim()).filter(s => s.length > 10 && s.length < 150);
    for (const b of bullets.slice(0, 15)) {
      if (!features.includes(b)) features.push(b);
    }
  }

  if (features.length === 0) {
    const featureAttrs = ["Key Feature 1", "Key Feature 2", "Key Feature 3", "Key Feature 4", "Key Feature 5",
      "Feature 1", "Feature 2", "Feature 3", "Feature 4", "Feature 5",
      "Highlight 1", "Highlight 2", "Highlight 3", "Highlight 4", "Highlight 5"];
    for (const fa of featureAttrs) {
      const found = attrs.find((a: any) => a.AttributeName === fa);
      if (found?.AttributeValue) {
        const val = String(found.AttributeValue).trim();
        if (val.length > 5 && val.length < 150) features.push(val);
      }
    }
  }

  const specFeatureNames = new Set(["Connectivity", "Technology", "Compatibility", "Included Accessories", "RGB Lighting", "Cooling Technology"]);
  for (const attr of attrs) {
    if (specFeatureNames.has(attr.AttributeName) && attr.AttributeValue) {
      const val = String(attr.AttributeValue).trim();
      if (val.length > 5 && val.length < 120 && !features.includes(val)) {
        features.push(val);
      }
    }
  }

  return features;
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

  let imgSampled = 0;
  let imgNull = 0;
  let imgSet = 0;

  for (const vp of vipProducts) {
    try {
      let price = priceMap.get(vp.ProdID) || priceMap.get(vp.SKU)
        || priceMap.get(String(vp.ProdID)) || priceMap.get(String(vp.SKU));
      let stock = stockMap.get(vp.ProdID) || stockMap.get(vp.SKU)
        || stockMap.get(String(vp.ProdID)) || stockMap.get(String(vp.SKU));

      if (vp.ProdID === 183738 || vp.SKU === 127414 || vp.ProdID === 127414 || (vp.Description && vp.Description.includes("9070 XT") && vp.Description.includes("PRIME"))) {
        console.log(`[VIP] DEBUG product: ProdID=${vp.ProdID}, SKU=${vp.SKU}, desc="${vp.Description}", priceFound=${!!price}, costPrice=${price ? getBestCostPrice(price) : 'N/A'}`);
      }

      const buyPrice = price ? getBestCostPrice(price) : 0;
      if (buyPrice <= 0) {
        if (!price) {
          if (result.skipped < 5) {
            console.log(`[VIP] SKIP (no price): ProdID=${vp.ProdID} SKU=${vp.SKU} "${vp.Description?.substring(0,60)}"`);
          }
        } else {
          if (result.skipped < 5) {
            console.log(`[VIP] SKIP (zero price): ProdID=${vp.ProdID} SKU=${vp.SKU} price=${JSON.stringify(price)}`);
          }
        }
        result.skipped++;
        continue;
      }

      const costPriceExVat = buyPrice;
      const minSellPrice = Math.ceil(costPriceExVat * 1.2 * 1.02 * 100) / 100;
      const isInStock = stock ? stock.AvailQty > 0 : false;
      if (!isInStock) result.outOfStock++;

      const name = getProductName(vp);
      let slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/-+$/, "").replace(/^-+/, "").substring(0, 80);
      const imageUrl = buildImageUrl(vp);
      const allVipImages = extractAllVipImages(vp);

      if (imgSampled < 10) {
        console.log(`[VIP] Image sample #${imgSampled + 1}: "${name}" ProductImage="${vp.ProductImage}" → imageUrl="${imageUrl}" allImages=${allVipImages.length} ProdID=${vp.ProdID}`);
        imgSampled++;
      }
      if (imageUrl) imgSet++;
      else imgNull++;

      const catSlug = vipCategoryMap[vp.ProductGroup];
      let categoryId: number | null = catSlug ? (catBySlug.get(catSlug) || null) : null;
      // Name-based override runs unconditionally — corrects wrong ProductGroup assignments
      const nameOverride = nameBasedCategoryOverride(name, catBySlug);
      if (nameOverride) categoryId = nameOverride;
      if (categoryId) result.categoriesMatched++;

      const mpn = vp.ManufacturersPartNumber != null ? String(vp.ManufacturersPartNumber).trim() : null;
      const mpnKey = mpn && mpn.length > 3 ? mpn.toLowerCase().trim() : null;
      const existing = (mpnKey && existingByMpn.get(mpnKey)) || existingBySlug.get(slug);
      if (existing) {
        const updates: Record<string, any> = {};
        if (existing.name !== name) updates.name = name;
        if (existing.slug !== slug) updates.slug = slug;
        if (existing.inStock !== isInStock) updates.inStock = isInStock;
        const hasNoImage = !existing.image;
        const hasBadImage = existing.image && (existing.image.includes("ftp://") || existing.image.includes("placeholder") || existing.image.includes("no-image") || existing.image.includes("default"));
        if (imageUrl && (hasNoImage || hasBadImage)) {
          updates.image = imageUrl;
        }

        if (allVipImages.length > 0) {
          let existingImages: string[] = [];
          try { if (existing.images) existingImages = typeof existing.images === "string" ? JSON.parse(existing.images) : existing.images; } catch {}
          const goodExisting = existingImages.filter(img => img && !img.includes("placeholder") && !img.includes("no-image") && !img.includes("ftp://"));
          if (goodExisting.length === 0) {
            updates.images = JSON.stringify(allVipImages.slice(0, 15));
          } else {
            const merged = [...new Set([...goodExisting, ...allVipImages])].slice(0, 15);
            if (merged.length > goodExisting.length) {
              updates.images = JSON.stringify(merged);
            }
          }
        }

        const vipSpecs = extractVipSpecs(vp);
        const vipFeatures = extractVipFeatures(vp);
        if (Object.keys(vipSpecs).length > 0) {
          let existingSpecs: Record<string, string> = {};
          try { if (existing.specs) existingSpecs = JSON.parse(existing.specs as string); } catch {}
          if (Object.keys(existingSpecs).length === 0) {
            updates.specs = JSON.stringify(vipSpecs);
          } else {
            const merged = { ...vipSpecs, ...existingSpecs };
            updates.specs = JSON.stringify(merged);
          }
        }
        if (vipFeatures.length > 0) {
          updates.vipFeatures = JSON.stringify(vipFeatures);
        }
        if (vp.Manufacturer && vp.Manufacturer !== existing.vendor) updates.vendor = vp.Manufacturer;
        if (mpn && existing.mpn !== mpn) updates.mpn = mpn;
        // Always push the best category we know — name-override takes precedence
        if (categoryId && existing.categoryId !== categoryId) updates.categoryId = categoryId;

        const existingCost = existing.costPrice || Infinity;
        if (costPriceExVat < existingCost) {
          updates.costPrice = costPriceExVat;
          updates.source = "VIP Computers";
          const newMinSell = Math.ceil(costPriceExVat * 1.2 * 1.02 * 100) / 100;
          if (Math.abs(existing.price - newMinSell) > 0.50) {
            updates.price = newMinSell;
          }
        }

        if (Object.keys(updates).length > 0) {
          try {
            await storage.updateProduct(existing.id, updates);
            result.updated++;
          } catch (updateErr: any) {
            const msg = String(updateErr?.message || "") + String(updateErr?.detail || "") + String(updateErr?.code || "");
            if ((msg.includes("duplicate") || msg.includes("unique") || msg.includes("constraint") || updateErr?.code === "23505") && updates.slug) {
              delete updates.slug;
              delete updates.name;
              if (Object.keys(updates).length > 0) {
                await storage.updateProduct(existing.id, updates);
                result.updated++;
              } else {
                result.skipped++;
              }
            } else {
              throw updateErr;
            }
          }
        } else {
          result.skipped++;
        }
        continue;
      }

      while (existingBySlug.has(slug)) {
        slug = `${slug}-${vp.SKU || vp.ProdID}`.substring(0, 100);
      }

      const description = getProductDescription(vp);
      const ean = vp.EAN ? String(vp.EAN).trim() : null;
      const vipSpecs = extractVipSpecs(vp);
      const vipFeatures = extractVipFeatures(vp);
      const productData = {
        name,
        slug,
        description,
        price: minSellPrice,
        costPrice: costPriceExVat,
        compareAtPrice: null,
        categoryId,
        image: imageUrl,
        images: allVipImages.length > 0 ? JSON.stringify(allVipImages) : null,
        specs: Object.keys(vipSpecs).length > 0 ? JSON.stringify(vipSpecs) : null,
        features: null as string | null,
        vipFeatures: vipFeatures.length > 0 ? JSON.stringify(vipFeatures) : null,
        badge: null as string | null,
        inStock: isInStock,
        vendor: vp.Manufacturer || null,
        mpn,
        ean,
        source: "VIP Computers",
        stripeProductId: null,
        stripePriceId: null,
      };
      try {
        await storage.createProduct(productData);
        existingBySlug.set(slug, { id: 0, slug, inStock: isInStock, image: imageUrl, price: minSellPrice, costPrice: costPriceExVat, vendor: vp.Manufacturer || null } as any);
        if (mpnKey) existingByMpn.set(mpnKey, existingBySlug.get(slug)!);
        result.imported++;
      } catch (insertErr: any) {
        const msg = String(insertErr?.message || "") + String(insertErr?.detail || "") + String(insertErr?.code || "");
        if (msg.includes("duplicate") || msg.includes("unique") || msg.includes("constraint") || insertErr?.code === "23505") {
          result.skipped++;
        } else {
          throw insertErr;
        }
      }
    } catch (e: any) {
      const errMsg = e?.message || e?.detail || (typeof e === 'object' ? JSON.stringify(e) : String(e)) || "unknown error";
      const errCode = e?.code || "no-code";
      const errLine = `ProdID=${vp.ProdID} SKU=${vp.SKU} "${vp.Description || 'no desc'}": [${errCode}] ${errMsg}`;
      result.errors.push(errLine);
      if (result.errors.length <= 10) {
        console.error(`[VIP] ERROR: ${errLine}`);
      }
    }
  }

  console.log(`[VIP] Sync complete: ${result.imported} imported, ${result.updated} updated, ${result.skipped} skipped, ${result.outOfStock} out of stock, ${result.errors.length} errors`);
  console.log(`[VIP] Image stats: ${imgSet} products got VIP image URLs, ${imgNull} had no image from VIP`);
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
  const slugGroups = new Map<string, typeof allProducts>();

  for (const p of allProducts) {
    if (p.mpn && p.mpn.length > 3) {
      const key = p.mpn.toLowerCase().trim();
      if (!mpnGroups.has(key)) mpnGroups.set(key, []);
      mpnGroups.get(key)!.push(p);
    }
    const nameKey = p.name.toLowerCase().replace(/[^a-z0-9]/g, "");
    if (!nameGroups.has(nameKey)) nameGroups.set(nameKey, []);
    nameGroups.get(nameKey)!.push(p);

    const baseSlug = p.slug.replace(/-\d{4,6}$/, "");
    if (!slugGroups.has(baseSlug)) slugGroups.set(baseSlug, []);
    slugGroups.get(baseSlug)!.push(p);
  }

  let removed = 0;
  const removedIds = new Set<number>();

  function dedup(groups: Map<string, typeof allProducts>, label: string) {
    for (const [, group] of groups) {
      if (group.length <= 1) continue;
      const active = group.filter(p => !removedIds.has(p.id));
      if (active.length <= 1) continue;
      active.sort((a, b) => {
        if (a.inStock !== b.inStock) return a.inStock ? -1 : 1;
        return a.id - b.id;
      });
      const keep = active[0];
      for (let i = 1; i < active.length; i++) {
        if (!removedIds.has(active[i].id)) {
          storage.deleteProduct(active[i].id);
          removedIds.add(active[i].id);
          removed++;
          console.log(`[Dedup] Removed (${label}): "${active[i].name}" (id ${active[i].id}), kept "${keep.name}" (id ${keep.id})`);
        }
      }
    }
  }

  dedup(mpnGroups, "MPN");
  dedup(nameGroups, "name");
  dedup(slugGroups, "slug");

  return removed;
}

export async function purgeDeadProducts(): Promise<{ removed: number; total: number; vipCount: number }> {
  const sessionKey = await login();
  const vipProducts = await getProducts(sessionKey);

  const vipMpns = new Set<string>();
  const vipNames = new Set<string>();
  for (const vp of vipProducts) {
    const mpn = vp.ManufacturersPartNumber != null ? String(vp.ManufacturersPartNumber).trim().toLowerCase() : null;
    if (mpn && mpn.length > 3) vipMpns.add(mpn);
    const name = (vp.Description || "").toLowerCase().replace(/[^a-z0-9]/g, "");
    if (name.length > 5) vipNames.add(name);
  }

  const allProducts = await storage.getProducts();
  let removed = 0;
  const testSlug = "test-product-do-not-buy";

  for (const p of allProducts) {
    if (p.slug === testSlug) continue;

    let foundInVip = false;

    if (p.mpn && p.mpn.length > 3) {
      if (vipMpns.has(p.mpn.toLowerCase().trim())) foundInVip = true;
    }

    if (!foundInVip) {
      const nameKey = p.name.toLowerCase().replace(/[^a-z0-9]/g, "");
      if (vipNames.has(nameKey)) foundInVip = true;
    }

    if (!foundInVip) {
      console.log(`[Purge] Removing: "${p.name}" (id ${p.id}, mpn=${p.mpn})`);
      await storage.deleteProduct(p.id);
      removed++;
    }
  }

  console.log(`[Purge] Complete: removed ${removed} dead products. ${allProducts.length - removed} remaining. VIP has ${vipProducts.length} products.`);
  return { removed, total: allProducts.length, vipCount: vipProducts.length };
}

let vipSyncInterval: ReturnType<typeof setInterval> | null = null;

export function startVipScheduler(intervalHours = 3) {
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

      console.log("[VIP Scheduler] Cleaning bad/mismatched images...");
      const { cleanBadImages, pullMissingImages } = await import("./productEnricher");
      const cleanResult = await cleanBadImages();
      console.log(`[VIP Scheduler] Image clean: ${cleanResult.fixed} fixed, ${cleanResult.cleared} cleared`);
      if (cleanResult.cleared > 0) {
        const pullResult = await pullMissingImages();
        console.log(`[VIP Scheduler] Image pull: ${pullResult.updated} updated`);
      }

      console.log("[VIP Scheduler] Starting internet price matching...");
      const priceResult = await matchInternetPrices(500);
      console.log(`[VIP Scheduler] Price match done: ${priceResult.priceUpdated} updated, ${priceResult.noResultsFound} no results`);
    } catch (e: any) {
      console.error("[VIP Scheduler] Error:", e.message);
    }
  }, intervalHours * 60 * 60 * 1000);
}
