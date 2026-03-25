import { XMLParser, XMLBuilder } from "fast-xml-parser";
import { storage } from "./storage";
import { matchInternetPrices, resetMatchProgress } from "./priceMatcher";
import { minSellPrice } from "./priceUtils";


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
  const results: TargetProduct[] = [];
  for (const code of stockcodes) {
    try {
      const xml = buildRequest("STOCKCHECK", { stockcode: code });
      const result = await postTargetXml(xml);
      const response = result.response || result;
      if (response.result !== "OK") continue;
      const products = response.product;
      if (!products) continue;
      const prodArray = Array.isArray(products) ? products : [products];
      results.push(...prodArray.map(parseTargetProduct));
    } catch {}
  }
  return results;
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
  HDNA: "servers-workstations",
  HDHR: "storage",
  MSAT: "storage",
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
  SP48: "ups-power-protection",
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
  GACH: "controllers-gaming",
  GMAC: "controllers-gaming",
  COUS: "controllers-gaming",
  VRHE: "controllers-gaming",
  PNBR: "printers",
  PNIJ: "printers",
  PNLA: "printers",
  PNLC: "printers",
  PNMU: "printers",
  PNRC: "printers",
  PNRM: "printers",
  PNSM: "printers",
  SPD3: "printers",
  "9CBB": "printers",
  "9CBC": "printers",
  "9CBD": "printers",
  "9CBE": "printers",
  "9CBF": "printers",
  ICCO: "ink-toner",
  ICCP: "ink-toner",
  ICEP: "ink-toner",
  ICIB: "ink-toner",
  ICIC: "ink-toner",
  ICIE: "ink-toner",
  ICIH: "ink-toner",
  ICIX: "ink-toner",
  ICKO: "ink-toner",
  ICLC: "ink-toner",
  ICLE: "ink-toner",
  ICLH: "ink-toner",
  ICOC: "ink-toner",
  ICOH: "ink-toner",
  ICSA: "ink-toner",
  PNRA: "ink-toner",
  PNRT: "ink-toner",
  PNST: "ink-toner",
  A88F: "ink-toner",
  A890: "ink-toner",
  A891: "ink-toner",
  C7C4: "ink-toner",
  "9CCD": "scanners-multifunction",
  "9CCE": "scanners-multifunction",
  "9CD2": "scanners-multifunction",
  "9CD4": "scanners-multifunction",
  SP01: "servers-workstations",
  SP07: "servers-workstations",
  SP08: "servers-workstations",
  SP09: "servers-workstations",
  SP0A: "servers-workstations",
  SP0N: "servers-workstations",
  SP10: "servers-workstations",
  SP24: "servers-workstations",
  SP26: "servers-workstations",
  SP8G: "servers-workstations",
  SP8W: "servers-workstations",
  SP94: "servers-workstations",
  S801: "servers-workstations",
  SPDT: "servers-workstations",
  SPHV: "servers-workstations",
  SPCU: "servers-workstations",
  SPQ1: "servers-workstations",
  SPQ2: "servers-workstations",
  SPQ3: "servers-workstations",
  SPQ4: "servers-workstations",
  SPQ5: "servers-workstations",
  SEBR: "security-cctv",
  SEDV: "security-cctv",
  SEIP: "security-cctv",
  SEKT: "security-cctv",
  UBVI: "security-cctv",
  SMHO: "smart-home",
  SMLI: "smart-home",
  SMPL: "smart-home",
  SMRA: "smart-home",
  SMSE: "smart-home",
  SMSW: "smart-home",
  CMWE: "webcams-cameras",
  DBCM: "webcams-cameras",
  DPEX: "webcams-cameras",
  DPOH: "webcams-cameras",
  SPPR: "webcams-cameras",
  PSUP: "ups-power-protection",
  PSPS: "power-supplies",
  PSCM: "power-supplies",
  "2774": "paper-supplies",
  "2777": "paper-supplies",
  OFSC: "paper-supplies",
  SHOP: "paper-supplies",
  DOCK: "accessories",
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
  AVME: "accessories",
  AVMP: "accessories",
  TAAC: "accessories",
  WETE: "accessories",
  F29E: "accessories",
  EBES: "accessories",
  PENX: "accessories",
  EPGA: "accessories",
  IPAC: "accessories",
  PABA: "accessories",
  PACM: "accessories",
  WIST: "accessories",
  ACTR: "accessories",
  SDD2: "storage",
  SDD3: "storage",
  SDD4: "storage",
  SDDE: "storage",
  SDFM: "storage",
  SDSO: "storage",
  SDUS: "storage",
  SD13: "storage",
  SDXC: "storage",
  SDHC: "storage",
  SDMM: "storage",
  SDCF: "storage",
  SDMS: "storage",
  SAM2: "storage",
  USBF: "storage",
  USBD: "storage",
  USBS: "storage",
  FLDR: "storage",
  FLUS: "storage",
  RZWC: "webcams-cameras",
  CMRZ: "webcams-cameras",
  CMLO: "webcams-cameras",
  CMLE: "webcams-cameras",
  CMJ5: "webcams-cameras",
  CMLG: "webcams-cameras",
  CMMI: "webcams-cameras",
  CM4K: "webcams-cameras",
  CMHD: "webcams-cameras",
  EPUP: "ups-power-protection",
  PSUU: "ups-power-protection",
  APCB: "ups-power-protection",
  UPSA: "ups-power-protection",
  UPSB: "ups-power-protection",
  UPSC: "ups-power-protection",
  PRIN: "processors",
  PRAM: "processors",
  PR20: "processors",
  SWOS: "software",
  SWOF: "software",
  SWAV: "software",
  SWBA: "software",
  SWGR: "software",
  SWUT: "software",
  SVSV: "software",
  SBLD: "pre-built-pcs",
  PBAR: "pre-built-pcs",
  PBFO: "pre-built-pcs",

  // NAS Storage Systems — belong with servers
  SP5E: "servers-workstations",
  SP5F: "servers-workstations",
  SP5K: "servers-workstations",
  SP5M: "servers-workstations",
  SP5N: "servers-workstations",
  SP5P: "servers-workstations",
  SP5V: "servers-workstations",
  SP67: "servers-workstations",

  // Networking — NP product range (completely missing from original map)
  NPAA: "networking",
  NPAC: "networking",
  NPAD: "networking",
  NPAK: "networking",
  NPAP: "networking",
  NPAR: "networking",
  NPAU: "networking",
  NPAW: "networking",
  NPBT: "networking",
  NPDR: "networking",
  NPFC: "networking",
  NPGI: "networking",
  NPGS: "networking",
  NPHP: "networking",
  NPMB: "networking",
  NPMD: "networking",
  NPME: "networking",
  NPMO: "networking",
  NPSM: "networking",
  NPSW: "networking",
  NPTP: "networking",
  NPUN: "networking",
  NPUS: "networking",
  NPWA: "networking",
  NPWI: "networking",
  NPWP: "networking",
  NPKV: "networking",
  NPIP: "security-cctv",

  // Mice — MI product range (completely missing from original map)
  MIBT: "mice",
  MIC1: "mice",
  MIC2: "mice",
  MIC3: "mice",
  MICH: "mice",
  MICM: "mice",
  MIGM: "mice",
  MILO: "mice",
  MIPS: "mice",
  MIAC: "accessories",

  // Monitors — additional TFT, refurb, accessories, TV codes
  MOT1: "monitors",
  MOT2: "monitors",
  MOT5: "monitors",
  MOT9: "monitors",
  MOTV: "monitors",
  MOAC: "monitors",
  MOBR: "monitors",
  MOCD: "monitors",
  MOCR: "monitors",
  MORF: "monitors",
  MOSA: "monitors",
  MOCC: "security-cctv",

  // Motherboards — additional socket/embedded
  MBFU: "motherboards",
  MBI7: "motherboards",
  MBIN: "motherboards",
  MBRM: "accessories",
  REMB: "motherboards",

  // Storage — mSATA already added above; refurb HDD also above
  // Hard drive refurbs and mSATA added to main storage block above

  // Laptops — brand/model series not yet in map
  LAA2: "laptops",
  LAAF: "laptops",
  LAAP: "laptops",
  LADU: "laptops",
  LAEX: "laptops",
  LAFL: "laptops",
  LALL: "laptops",
  LARE: "laptops",
  LARO: "laptops",
  LATN: "laptops",
  LATP: "laptops",
  LATQ: "laptops",
  LATS: "laptops",
  LATT: "laptops",
  LALC: "accessories",
  LASK: "accessories",
  LATO: "accessories",
  LAWA: "accessories",

  // Accessories — various missing categories
  EPIP: "accessories",
  KINA: "accessories",
  MCCA: "accessories",
  MEEL: "cables-adapters",
  MESP: "accessories",
  MPSP: "ups-power-protection",

  // Optical / consumable media
  MCCD: "optical-drives",
  MCDV: "optical-drives",
  MCKI: "paper-supplies",
  MCPP: "paper-supplies",
};

const targetCategoryFallback: Record<string, string> = {
  GR: "graphics-cards",
  IN: "processors",
  AM: "processors",
  FM: "processors",
  PR: "processors",
  MB: "motherboards",
  HB: "motherboards",
  ME: "memory",
  SS: "storage",
  HD: "storage",
  KI: "storage",
  SA: "storage",
  SD: "storage",
  US: "storage",
  FL: "storage",
  CA: "cases",
  PS: "power-supplies",
  FA: "cooling",
  CP: "cooling",
  TH: "cooling",
  MO: "monitors",
  A4: "monitors",
  KB: "keyboards",
  KE: "keyboards",
  MS: "mice",
  MI: "mice",
  EP: "mice",
  NW: "networking",
  NP: "networking",
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
  SB: "pre-built-pcs",
  SW: "software",
  SV: "software",
  PN: "printers",
  IC: "ink-toner",
  A8: "ink-toner",
  C7: "ink-toner",
  "9C": "printers",
  "27": "paper-supplies",
  OF: "paper-supplies",
  SH: "paper-supplies",
  SP: "servers-workstations",
  SE: "security-cctv",
  SM: "smart-home",
  CM: "webcams-cameras",
  DB: "webcams-cameras",
  DP: "webcams-cameras",
  AC: "accessories",
  BA: "accessories",
  DO: "accessories",
  BR: "accessories",
  CR: "accessories",
  PE: "accessories",
  IP: "accessories",
  PA: "accessories",
  WI: "accessories",
  WE: "accessories",
  F2: "accessories",
  EB: "accessories",
  C8: "accessories",
  AV: "accessories",
  TA: "accessories",
  GM: "controllers-gaming",
  CO: "controllers-gaming",
  VR: "controllers-gaming",
  GA: "controllers-gaming",
  "10": "accessories",
  RE: "accessories",
};

export function nameBasedCategoryOverride(name: string, catBySlug: Map<string, number>): number | null {
  const n = name.toLowerCase();
  if (/webcam|web cam/.test(n)) return catBySlug.get("webcams-cameras") || null;
  if (/\bups\b|uninterruptible power|battery backup unit/.test(n)) return catBySlug.get("ups-power-protection") || null;

  // PC Monitors — must come before PSU check so monitor names with wattage don't get misclassified
  // Exclude accessories: arms, mounts, stands, cables; also exclude DJ/audio/baby monitors
  const isMonitorAccessory = /\b(arm|mount|stand|cleaner|wipe|riser|wall\s*mount|bracket)\b.{0,50}\bmonitor\b|\bmonitor\b.{0,50}\b(arm|mount|stand|cleaner|bracket|cable)\b/.test(n);
  const hasMonitorWord = /\bmonitor\b/.test(n) && !/\bdj\s*monitor\b|\baudio\s*monitor\b|\bbaby\s*monitor\b/.test(n);
  // Also catch display panels from known monitor brands that omit the word "monitor"
  const isMonitorBrand = /\biiyama\b|\bviewsonic\b|\bbenq\b|\b(aoc)\s+\d|\bphilips\b.{0,20}\d+\s*(inch|")|\bpixl\b.{0,20}(inch|hz|ips|fhd|monitor)/.test(n);
  const hasDisplaySpec = /\b(ips|va|oled|qled|nano.ips)\b.{0,30}\b(panel|display|screen|technology)|\b(qhd|fhd|uhd|wqhd|4k|2k)\b.{0,30}\b(ips|va|oled|panel|display)|\b\d{2,3}\s*hz\b.{0,30}\b(ips|va|oled|panel|curved)/.test(n);
  if (!isMonitorAccessory && (hasMonitorWord || (isMonitorBrand && hasDisplaySpec))) return catBySlug.get("monitors") || null;

  // Networking devices — route to networking before PSU check (POE/powered switches mention "powered")
  if (/\bunifi\b|\bubiquiti\b|\bnano\s*station|\bairmax\b|\busw[\s-]|\buap[\s-]|\bpoe\s+(switch|hub|injector|splitter)|\bmanaged\s+(poe\s+)?switch|\bgigabit\s+(poe\s+)?switch|\bnetgear\b|\btp.?link\b|\bnetworking\s+switch/.test(n)) return catBySlug.get("networking") || null;

  // PSU extension / sleeved cables — route to cables category, not PSU
  if (/\b(psu|power)\b.{0,30}\b(extension|sleeved|cable\s+kit|braided)\b|\b(extension|sleeved|cable\s+kit|braided)\b.{0,30}\b(psu|power\s+supply)\b/.test(n)) return catBySlug.get("cables-adapters") || null;

  // PC cases — MUST come before PSU check: cases with bundled PSUs mention "500W PSU" but are still cases
  const caseNames = [
    /\bpc\s+case\b/,
    /\b(mid|full|mini|micro|slim|tower)\s*(tower|size)\s*case\b/,
    /\bcase\b.{0,60}\b(mid|full|mini|micro|atx|itx)\b/,
    /\b(mid|full|mini|micro)[\s-]?tower\b.{0,60}\bcase\b/,
    /\bsmall\s+form\s+factor\s+case\b|\bsff\b.{0,30}\bcase\b|\bcase\b.{0,30}\bsff\b/,
    /\bchassis\b(?!.{0,20}\bfan\b.{0,10}\bcontroller\b)/,
    /\btower\s+case\b/,
    /\b(atx|itx)\s+(case|chassis)\b/,
    /\bcase\b.{0,80}\b(itx|atx)\b.{0,20}(case|chassis|bundle|\bpsu\b|power)/,
    /\bdesktop\s+(case|chassis)\b/,
    /\brackmount.{0,30}(case|chassis|enclosure)\b/,
    /\btempered\s+glass.{0,40}\bcase\b/,
    /\bcase\b.{0,40}\btempered\s+glass\b/,
    /\b(gaming|office|home|business)\b.{0,20}\bcase\b/,
    /\bcase\b.{0,15}\b(usb\s+[23]\.0|with\s+\d+w|black\s+interior)\b/,
  ];
  const isCase = caseNames.some(r => r.test(n)) && !/\bcontroller\b.{0,30}\bcase\b/.test(n);
  if (isCase) return catBySlug.get("cases") || null;

  // PSUs — after cases so "Mid Tower Case with 500W PSU" goes to cases, not PSU
  const isPsu = /\bpower\s+supply\b|\bpsu\b|\b\d{3,4}\s*w\b.{0,40}(atx|sfx|modular|gold|bronze|platinum|titanium|80.plus)|\b(80.plus|fully\s+modular|semi.modular)\b.{0,80}\bw\b|\bsfx.l?\b.*\bpower\b|\batx\s+3\.\d\b/.test(n) && !/\bcase\b|\bchassis\b/.test(n);
  if (isPsu) return catBySlug.get("power-supplies") || null;

  // RAM / System memory — must come BEFORE storage checks to avoid misclassification
  // Exclude laptops, tablets, notebooks, pre-built systems, and motherboards that mention DDR slots
  const isDevice = /\blaptop\b|\bnotebook\b|\btablet\b|\bchromebook\b|\bmacbook\b|\ball.in.one\b|\bdesktop\s+(pc|computer)\b|\bpre.?built\b|\b\d{2}\.\d"|\b\d{2}\.\d\s?inch|\bwindows\s+\d+\s+(home|pro)\b|\bandroid\s+\d+\b|\bcore\s+i[3579]\b|\bryzen\s+[357]\b|\bceleron\b|\bpentium\b|\bcore\s+ultra\b/.test(n);
  // Motherboard: require "motherboard" explicitly, or socket/chipset combos, or form-factor+socket combos
  // Removed bare "atx" — too broad, catches PSUs/cases. "m-atx/micro-atx/mini-itx/e-atx" still valid when not a PSU/case.
  const isMotherboard = /\bmotherboard\b|\bsocket\s+(1[7-9]\d\d|am[45]|lga\d+)\b|\b(ddr[345]\s+slots?|ddr[345]\s+dimm)\b|\b(m-atx|micro-atx|mini-itx|e-atx)\b.{0,40}(board|socket|chipset|lga|am[45]|z\d{3}|b\d{3}|x\d{3}|h\d{3})|\b(z\d{3}|b\d{3}|x\d{3}|h\d{3})\b.{0,30}(atx|m-atx|micro-atx|mini-itx)/.test(n);
  // Motherboards go to motherboards category regardless of DDR mentions
  if (isMotherboard) return catBySlug.get("motherboards") || null;

  if (!isDevice && /\b(ddr[3-6]|lpddr[3-6]|lpddr)\b/.test(n) && !/sd\s?card|flash\s?drive|usb\s?drive|thumb\s?drive/i.test(n)) return catBySlug.get("memory") || null;
  if (!isDevice && /\b(so-dimm|sodimm|rdimm|udimm|lrdimm|dimm)\b/.test(n) && !/sd\s?card|flash\s?drive/i.test(n)) return catBySlug.get("memory") || null;
  if (!isDevice && /\bpc[345][a-z]?[-_]\d{4,}/.test(n) && !/ssd|nvme|m\.2|hard\s?drive|solid\s?state/i.test(n)) return catBySlug.get("memory") || null;
  if (!isDevice && /(\becc\b.*\b\d+gb\b|\b\d+gb\b.*\becc\b)/.test(n) && !/ssd|nvme|hard\s?drive|solid\s?state/i.test(n)) return catBySlug.get("memory") || null;
  if (/\b(vengeance|ripjaws|trident\s?z|fury\s?beast|fury\s?renegade|flare\s?x|dominator\s?platinum)\b/.test(n) && /\b\d+gb\b/.test(n) && !/ssd|nvme|m\.2|hard\s?drive|solid\s?state/i.test(n)) return catBySlug.get("memory") || null;

  // USB flash drives / thumb drives — broad patterns to catch all variants
  if (/usb.*flash|flash.*drive|thumb.*drive|pen.*drive|usb.*stick|datatraveler|flash\s?voyager|cruzer|ultra\s?fit|ultra\s?flair|ultra\s?dual|swivel.*usb|usb.*swivel/.test(n)) return catBySlug.get("storage") || null;
  if (/\busb\b.{1,30}\b(drive|drives|64gb|128gb|256gb|512gb|16gb|32gb|8gb)\b/.test(n) && !/hub|charger|cable|adapter|card reader/i.test(n)) return catBySlug.get("storage") || null;

  // SD / memory cards
  if (/micro\s?sd|microsd|sd\s?card|sdhc|sdxc|compactflash|cf\s?card|memory\s?card|xqd\s?card|cfe\s?card/.test(n)) return catBySlug.get("storage") || null;

  // Printers, ink, scanners
  if (/\bprinter\b/.test(n) && !/3d printer/i.test(n)) return catBySlug.get("printers") || null;
  if (/ink\s?cartridge|toner\s?cartridge|inkjet\s?cartridge|toner\s?unit/.test(n)) return catBySlug.get("ink-toner") || null;
  if (/\bscanner\b|multifunction.*printer|all.in.one.*printer/.test(n)) return catBySlug.get("scanners-multifunction") || null;

  // NAS / CCTV / Smart home
  if (/\bnas\b|network.*attached.*storage/.test(n) && !/ssd|hdd|hard\s?drive|hard\s?disk/.test(n)) return catBySlug.get("servers-workstations") || null;
  if (/cctv|ip\s?camera|security\s?camera|dashcam|dash\s?cam/.test(n)) return catBySlug.get("security-cctv") || null;
  if (/smart\s?(plug|bulb|switch|speaker|display|home|strip)|echo\s|alexa\s|google\s*home\b/.test(n)) return catBySlug.get("smart-home") || null;

  // Optical drives / disc writers
  if (/dvd.*writer|blu.?ray.*writer|dvd.*re.?writer|optical.*drive|disc.*writer|cd.*rw|dvd.?rw|bd.?rw/.test(n)) return catBySlug.get("optical-drives") || null;

  // Tablets / 2-in-1 devices — group with laptops (no separate tablets category)
  if (/\btablet\b|\b2.in.1\b|\b2-in-1\b|\bchromebook\b|\bipad\b|\bandroid.*\d+\.\d+"\b|\bsurface\s+(pro|go|laptop)\b/.test(n)) return catBySlug.get("laptops") || null;

  // Docking stations / port replicators
  if (/dock(ing)?(\s+station)?|port\s+replicator|thunderbolt\s+dock/.test(n) && !/hard\s?drive|ssd|storage/i.test(n)) return catBySlug.get("accessories") || null;

  return null;
}

export async function syncTargetProducts(): Promise<{ imported: number; updated: number; skipped: number; outOfStock: number; errors: number; total: number }> {
  const result = { imported: 0, updated: 0, skipped: 0, outOfStock: 0, errors: 0, total: 0 };

  // Fetch every category from Target dynamically, then pull full product details
  // (including prices) for each via STOCKCAT. STOCKCHECKALL doesn't include prices.
  console.log(`[Target] Fetching category list from Target API...`);
  let targetProducts: TargetProduct[] = [];
  const seenStockcodes = new Set<string>();

  let allCategoryCodes: string[] = [];
  try {
    const liveCats = await getTargetCategories();
    allCategoryCodes = liveCats.map(c => c.code);
    console.log(`[Target] Got ${allCategoryCodes.length} live categories from API`);
  } catch (e: any) {
    console.warn(`[Target] Category list fetch failed (${e.message}), using hardcoded list`);
    allCategoryCodes = [...new Set(Object.keys(targetCategoryMap))];
  }

  let catsFetched = 0, catsEmpty = 0, catsFailed = 0;
  const failedCats: string[] = [];
  for (const catCode of allCategoryCodes) {
    try {
      const products = await getTargetProductsByCategory(catCode);
      for (const p of products) {
        if (!seenStockcodes.has(p.stockcode)) {
          seenStockcodes.add(p.stockcode);
          targetProducts.push(p);
        }
      }
      if (products.length > 0) catsFetched++;
      else catsEmpty++;
    } catch (ce: any) {
      if (ce.message?.includes("NO RESULTS")) { catsEmpty++; }
      else { catsFailed++; failedCats.push(catCode); console.error(`[Target] Error fetching category ${catCode}: ${ce.message}`); }
    }
  }
  console.log(`[Target] Category sweep done — ${catsFetched} with products, ${catsEmpty} empty, ${catsFailed} errors, ${targetProducts.length} unique products`);

  // Retry any failed categories once
  if (failedCats.length > 0) {
    console.log(`[Target] Retrying ${failedCats.length} failed categories...`);
    let retryOk = 0;
    for (const catCode of failedCats) {
      try {
        const products = await getTargetProductsByCategory(catCode);
        for (const p of products) {
          if (!seenStockcodes.has(p.stockcode)) {
            seenStockcodes.add(p.stockcode);
            targetProducts.push(p);
          }
        }
        if (products.length > 0) retryOk++;
      } catch {}
    }
    console.log(`[Target] Retry complete — ${retryOk} categories recovered, total now ${targetProducts.length}`);
  }

  // STOCKCHECKALL supplement: find any stockcodes Target has that our category sweep missed
  try {
    console.log(`[Target] Running STOCKCHECKALL to find any missed stockcodes...`);
    const allProds = await getTargetAllProducts();
    const missedCodes = allProds
      .map(p => p.stockcode)
      .filter(sc => sc && !seenStockcodes.has(sc));
    console.log(`[Target] STOCKCHECKALL found ${allProds.length} total, ${missedCodes.length} not yet seen`);

    // STOCKCHECK missed codes in batches (capped at 300 to avoid API overload)
    const cap = missedCodes.slice(0, 300);
    let supplemented = 0;
    for (const sc of cap) {
      try {
        const checked = await checkTargetStock([sc]);
        for (const p of checked) {
          if (p.stockcode && !seenStockcodes.has(p.stockcode)) {
            seenStockcodes.add(p.stockcode);
            targetProducts.push(p);
            supplemented++;
          }
        }
      } catch {}
    }
    if (supplemented > 0) console.log(`[Target] Supplement added ${supplemented} products, new total: ${targetProducts.length}`);
  } catch (e: any) {
    console.warn(`[Target] STOCKCHECKALL supplement failed (non-fatal): ${e.message}`);
  }

  const inStockCount = targetProducts.filter(tp => tp.stock > 0).length;
  result.total = targetProducts.length;
  console.log(`[Target] Fetched ${targetProducts.length} products total (${inStockCount} in stock, ${targetProducts.length - inStockCount} out of stock)`);

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
  const catById  = new Map<number, string>();
  for (const c of categories) { catBySlug.set(c.slug, c.id); catById.set(c.id, c.slug); }

  let matchedByMpn = 0, matchedBySlug = 0, newCount = 0;
  for (const tp of targetProducts) {
    try {
      const isInStock = tp.stock > 0;
      if (!isInStock) result.outOfStock++;

      const name = cleanTargetTitle(tp.description, tp.manufacturer);
      if (!name || name.length < 5) {
        if (result.skipped < 5) console.log(`[Target] SKIP (no name): stockcode=${tp.stockcode} desc="${tp.description?.substring(0,40)}"`);
        result.skipped++; continue;
      }

      const slug = slugify(name);
      if (!slug || slug.length < 3) { result.skipped++; continue; }

      const costPriceExVat = tp.price;
      if (costPriceExVat <= 0) {
        if (result.skipped < 5) console.log(`[Target] SKIP (no price): stockcode=${tp.stockcode} name="${name.substring(0,50)}" raw_price="${(tp as any)._rawPrice}"`);
        result.skipped++; continue;
      }

      // Determine category BEFORE pricing so the floor reflects market norms per category
      let categoryId: number | null = null;
      let categorySlug: string | undefined;
      if (tp.category) {
        const areaCode = tp.category.substring(0, 2);
        const cs = targetCategoryMap[tp.category] || targetCategoryFallback[areaCode];
        if (cs) { categoryId = catBySlug.get(cs) || null; categorySlug = cs; }
      }
      const nameOverride = nameBasedCategoryOverride(name, catBySlug);
      if (nameOverride) { categoryId = nameOverride; categorySlug = catById.get(nameOverride); }

      const sellPrice = minSellPrice(costPriceExVat, categorySlug);

      const images: string[] = [];
      if (tp.largeimageurl) images.push(tp.largeimageurl);
      if (tp.imageurl && !images.includes(tp.imageurl)) images.push(tp.imageurl);
      const mainImage = images[0] || null;

      const mpn = tp.manupartcode?.trim() || null;
      const mpnKey = mpn && mpn.length > 3 ? mpn.toLowerCase().trim() : null;

      const existingByMpnMatch = mpnKey ? existingByMpn.get(mpnKey) : null;
      const existingBySlugMatch = existingBySlug.get(slug);
      const existing = existingByMpnMatch || existingBySlugMatch;

      if (existing) {
        if (existingByMpnMatch) matchedByMpn++;
        else matchedBySlug++;
        const updates: Record<string, any> = {};
        if (existing.inStock !== isInStock) updates.inStock = isInStock;

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
          const newMinSell = minSellPrice(costPriceExVat, categorySlug);
          if (existing.price > newMinSell + 0.50 || existing.price < newMinSell - 0.50) {
            updates.price = newMinSell;
          }
        }

        if (categoryId && existing.categoryId !== categoryId) {
          updates.categoryId = categoryId;
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

        if (tp.overview) {
          const cleaned = tp.overview.replace(/<[^>]+>/g, " ").replace(/&[a-z]+;/gi, " ").replace(/\s{3,}/g, "  ").trim();
          const parts = cleaned.split(/\s{2,}/).map((s: string) => s.trim()).filter((s: string) => s.length > 2 && s.includes(":"));
          const parsedFeatures = parts.length > 1 ? parts : cleaned.split(/[,;|]/).map((s: string) => s.trim()).filter((s: string) => s.length > 3 && s.length < 200);
          const needsUpdate = !existing.features || existing.features === "[]" ||
            (parsedFeatures.length > 1 && existing.features && !JSON.parse(existing.features as string || "[]").some((f: string) => f.includes(":")));
          if (parsedFeatures.length > 0 && needsUpdate) updates.features = JSON.stringify(parsedFeatures);
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
        const cleaned = tp.overview.replace(/<[^>]+>/g, " ").replace(/&[a-z]+;/gi, " ").replace(/\s{3,}/g, "  ").trim();
        // Target uses double-space as key-spec delimiter: "Key: Value  Key: Value"
        const parts = cleaned.split(/\s{2,}/).map((s: string) => s.trim()).filter((s: string) => s.length > 2 && s.includes(":"));
        if (parts.length > 1) {
          features.push(...parts);
        } else {
          // Fallback: comma/semicolon split for non-standard formats
          const fallback = cleaned.split(/[,;|]/).map((s: string) => s.trim()).filter((s: string) => s.length > 3 && s.length < 200);
          features.push(...fallback);
        }
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
        inStock: isInStock,
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

export function startTargetScheduler(intervalHours = 3) {
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

      const { storage } = await import("./storage");
      const fixResult = await storage.fixRamCategories();
      if (fixResult.fixed > 0) console.log(`[Target Scheduler] Category fix: ${fixResult.fixed} products corrected`);

      console.log("[Target Scheduler] Cleaning bad/mismatched images...");
      const { cleanBadImages, pullMissingImages } = await import("./productEnricher");
      const cleanResult = await cleanBadImages();
      console.log(`[Target Scheduler] Image clean: ${cleanResult.fixed} fixed, ${cleanResult.cleared} cleared`);
      if (cleanResult.cleared > 0) {
        const pullResult = await pullMissingImages();
        console.log(`[Target Scheduler] Image pull: ${pullResult.updated} updated`);
      }

      console.log("[Target Scheduler] Starting internet price matching...");
      resetMatchProgress();
      const priceResult = await matchInternetPrices(500);
      console.log(`[Target Scheduler] Price match done: ${priceResult.priceUpdated} updated, ${priceResult.noResultsFound} no results`);
    } catch (e: any) {
      console.error("[Target Scheduler] Error:", e.message);
    }
  }, intervalHours * 60 * 60 * 1000);
}
