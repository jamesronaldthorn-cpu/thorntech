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

function parseSpecsFromName(name: string, vendor?: string, description?: string): { specs: Record<string, string>; features: string[] } {
  const specs: Record<string, string> = {};
  const features: string[] = [];
  const combined = `${name} ${description || ""}`;
  const nameLower = combined.toLowerCase();

  if (vendor) specs["Brand"] = vendor;

  const brandPatterns = [
    "AMD", "Intel", "NVIDIA", "ASUS", "MSI", "Gigabyte", "EVGA", "Corsair", "Kingston",
    "Samsung", "Western Digital", "WD", "Seagate", "Crucial", "G.Skill", "HyperX",
    "Cooler Master", "NZXT", "Thermaltake", "be quiet!", "Noctua", "Arctic",
    "Razer", "Logitech", "SteelSeries", "HyperX", "Rode", "Elgato", "Blue",
    "LG", "Dell", "BenQ", "AOC", "ASUS", "Acer", "ViewSonic", "Samsung",
    "TP-Link", "Netgear", "ASUS", "Linksys", "Ubiquiti",
    "Fractal Design", "Lian Li", "Phanteks", "Antec", "Silverstone",
    "Seasonic", "EVGA", "Corsair", "Cooler Master", "be quiet!",
    "Creative", "Sennheiser", "JBL", "Sony", "Bose", "Audio-Technica",
    "Microsoft", "Apple", "Google", "Lenovo", "HP", "Acer", "ASUS",
    "Sapphire", "XFX", "PowerColor", "Zotac", "Palit", "PNY", "Inno3D",
    "ASRock", "Biostar", "ADATA", "Patriot", "Team", "Sabrent", "Transcend",
    "Deepcool", "Alphacool", "EK", "Lian Li", "Montech", "Cougar",
    "Cherry", "Ducky", "Keychron", "Glorious", "Wooting",
    "Trust", "Targus", "Kensington", "Belkin", "Anker",
  ];
  if (!vendor) {
    for (const brand of brandPatterns) {
      if (name.toLowerCase().includes(brand.toLowerCase())) {
        specs["Brand"] = brand;
        break;
      }
    }
  }

  const memMatch = name.match(/(\d+)\s*GB/i);
  if (memMatch) specs["Memory / Capacity"] = memMatch[1] + " GB";

  const tbMatch = name.match(/(\d+)\s*TB/i);
  if (tbMatch) specs["Capacity"] = tbMatch[1] + " TB";

  const mbMatch = name.match(/(\d+)\s*MB/i);
  if (mbMatch && parseInt(mbMatch[1]) >= 128) specs["Cache / Buffer"] = mbMatch[1] + " MB";

  const ddrMatch = name.match(/(DDR[45]\s*[-]?\s*\d*)/i);
  if (ddrMatch) specs["Memory Type"] = ddrMatch[1].toUpperCase().replace(/\s+/g, "");

  const gddrMatch = name.match(/(GDDR\d[A-Z]?)/i);
  if (gddrMatch) specs["VRAM Type"] = gddrMatch[1].toUpperCase();

  const clockMatch = name.match(/([\d.]+)\s*GHz/i);
  if (clockMatch) specs["Clock Speed"] = clockMatch[1] + " GHz";

  const mhzMatch = name.match(/(\d{3,5})\s*MHz/i);
  if (mhzMatch) specs["Speed"] = mhzMatch[1] + " MHz";

  const coreMatch = name.match(/(\d+)\s*[-]?\s*core/i);
  if (coreMatch) specs["Cores"] = coreMatch[1];

  const threadMatch = name.match(/(\d+)\s*[-]?\s*thread/i);
  if (threadMatch) specs["Threads"] = threadMatch[1];

  const wattMatch = name.match(/(\d+)\s*W(?:att)?(?:\b|$|,)/i);
  if (wattMatch) specs["Wattage"] = wattMatch[1] + "W";

  const sizeMatch = name.match(/([\d.]+)["'']\s*(?:inch)?|(\d+(?:\.\d+)?)\s*inch/i);
  if (sizeMatch) specs["Screen Size"] = (sizeMatch[1] || sizeMatch[2]) + '"';

  const resMatch = name.match(/(\d{3,4})\s*x\s*(\d{3,4})/);
  if (resMatch) specs["Resolution"] = resMatch[1] + " x " + resMatch[2];

  if (nameLower.includes("4k") || nameLower.includes("uhd")) specs["Resolution"] = "4K UHD (3840 x 2160)";
  if (nameLower.includes("1440p") || nameLower.includes("qhd")) specs["Resolution"] = "2560 x 1440 (QHD)";
  if (nameLower.includes("1080p") || nameLower.includes("full hd")) specs["Resolution"] = "1920 x 1080 (Full HD)";
  if (nameLower.includes("720p")) specs["Resolution"] = "1280 x 720 (HD)";

  const hzMatch = name.match(/(\d+)\s*Hz/i);
  if (hzMatch && parseInt(hzMatch[1]) >= 30) specs["Refresh Rate"] = hzMatch[1] + " Hz";

  const rpmMatch = name.match(/(\d+)\s*RPM/i);
  if (rpmMatch) specs["Speed"] = rpmMatch[1] + " RPM";

  const mmMatch = name.match(/(\d+)\s*mm(?:\s|$|,)/i);
  if (mmMatch) specs["Size"] = mmMatch[1] + " mm";

  const voltMatch = name.match(/([\d.]+)\s*V(?:olt)?(?:\s|$)/i);
  if (voltMatch) specs["Voltage"] = voltMatch[1] + "V";

  const ampMatch = name.match(/([\d.]+)\s*A(?:mp)?(?:\s|$)/i);
  if (ampMatch && parseFloat(ampMatch[1]) > 0) specs["Amperage"] = ampMatch[1] + "A";

  const dbMatch = name.match(/([\d.]+)\s*dB/i);
  if (dbMatch) specs["Noise Level"] = dbMatch[1] + " dB";

  const formFactors = ["E-ATX", "ATX", "Micro-ATX", "mATX", "Mini-ITX", "ITX", "M.2", "2.5\"", "3.5\"", "SFX", "SFX-L", "TFX"];
  for (const ff of formFactors) {
    if (nameLower.includes(ff.toLowerCase())) {
      specs["Form Factor"] = ff;
      break;
    }
  }

  const sockets = ["AM4", "AM5", "LGA 1851", "LGA 1700", "LGA 1200", "LGA 1151", "LGA1851", "LGA1700", "LGA1200", "LGA1151", "TR4", "TR5", "sTRX4", "sTR5", "SP5", "SP3"];
  for (const s of sockets) {
    if (nameLower.includes(s.toLowerCase())) {
      specs["Socket"] = s;
      break;
    }
  }

  const chipsets = ["Z790", "Z690", "B760", "B660", "H770", "H610", "X670E", "X670", "B650E", "B650", "A620", "X570", "B550", "A520", "B450", "X470", "Z590", "B560", "H570", "H510", "W790", "X299"];
  for (const cs of chipsets) {
    if (nameLower.includes(cs.toLowerCase())) {
      specs["Chipset"] = cs;
      break;
    }
  }

  const colours = ["Black", "White", "Silver", "Red", "Blue", "Green", "Pink", "Grey", "Gray", "Gold", "Orange", "Purple"];
  for (const c of colours) {
    if (name.includes(c) || name.includes(c.toUpperCase())) {
      specs["Colour"] = c;
      break;
    }
  }

  if (nameLower.includes("nvme")) { specs["Interface"] = "NVMe"; features.push("NVMe solid state drive for fast boot and load times"); }
  else if (nameLower.includes("sata iii") || nameLower.includes("sata3")) specs["Interface"] = "SATA III (6 Gbps)";
  else if (nameLower.includes("sata")) specs["Interface"] = "SATA";
  if (nameLower.includes("pcie") || nameLower.includes("pci-e")) {
    const pcieMatch = name.match(/PCIe?\s*(?:Gen\s*)?(\d)(?:\.(\d))?/i);
    if (pcieMatch) specs["Interface"] = `PCIe Gen ${pcieMatch[1]}${pcieMatch[2] ? "." + pcieMatch[2] : ""}`;
  }
  if (nameLower.includes("usb 3.2") || nameLower.includes("usb3.2")) specs["USB"] = "USB 3.2";
  if (nameLower.includes("usb 3.0") || nameLower.includes("usb3.0")) specs["USB"] = "USB 3.0";
  if (nameLower.includes("usb 2.0")) specs["USB"] = "USB 2.0";
  if (nameLower.includes("thunderbolt")) specs["Connectivity"] = "Thunderbolt";
  if (nameLower.includes("hdmi 2.1")) specs["Video Output"] = "HDMI 2.1";
  else if (nameLower.includes("hdmi")) specs["Video Output"] = "HDMI";
  if (nameLower.includes("displayport") || nameLower.includes("dp ")) specs["Video Output"] = (specs["Video Output"] ? specs["Video Output"] + " + " : "") + "DisplayPort";

  if (nameLower.includes("gen3") || nameLower.includes("gen 3")) specs["Generation"] = "Gen 3";
  if (nameLower.includes("gen4") || nameLower.includes("gen 4")) specs["Generation"] = "Gen 4";
  if (nameLower.includes("gen5") || nameLower.includes("gen 5")) specs["Generation"] = "Gen 5";

  const cpuModels = [
    /Ryzen\s*\d\s+\d{4}[A-Z]*/i, /Core\s*i\d[-\s]\d{4,5}[A-Z]*/i, /Ryzen\s*Threadripper/i,
    /Xeon\s*[A-Z]?\d+/i, /Athlon\s*\d+/i, /Pentium\s*\w+/i, /Celeron\s*\w+/i,
  ];
  for (const pat of cpuModels) {
    const m = name.match(pat);
    if (m) { specs["Processor"] = m[0]; break; }
  }

  const gpuModels = [
    /RTX\s*\d{4}\s*(?:Ti|SUPER)?/i, /GTX\s*\d{3,4}\s*(?:Ti|SUPER)?/i,
    /RX\s*\d{4}\s*(?:XT|XTX)?/i, /Arc\s*[AB]\d{3,4}/i, /Quadro\s*\w+/i,
  ];
  for (const pat of gpuModels) {
    const m = name.match(pat);
    if (m) { specs["GPU"] = m[0]; break; }
  }

  if (nameLower.includes("usb-c") || nameLower.includes("usb type-c")) features.push("USB-C connectivity");
  if (nameLower.includes("bluetooth")) features.push("Bluetooth wireless connectivity");
  if (nameLower.includes("wifi") || nameLower.includes("wi-fi")) features.push("Built-in Wi-Fi");
  if (nameLower.includes("wifi 6e") || nameLower.includes("wi-fi 6e")) { features.push("Wi-Fi 6E support"); specs["Wi-Fi"] = "Wi-Fi 6E"; }
  else if (nameLower.includes("wifi 6") || nameLower.includes("wi-fi 6")) { features.push("Wi-Fi 6 support"); specs["Wi-Fi"] = "Wi-Fi 6"; }
  if (nameLower.includes("rgb")) features.push("RGB lighting");
  if (nameLower.includes("argb") || nameLower.includes("a-rgb")) features.push("Addressable RGB lighting");
  if (nameLower.includes("modular") || nameLower.includes("fully modular")) features.push("Modular design for clean cable management");
  if (nameLower.includes("semi-modular") || nameLower.includes("semi modular")) features.push("Semi-modular cable design");
  if (nameLower.includes("mechanical")) features.push("Mechanical key switches");
  if (nameLower.includes("wireless")) features.push("Wireless connectivity");
  if (nameLower.includes("noise cancel")) features.push("Active noise cancellation");
  if (nameLower.includes("hot swap") || nameLower.includes("hot-swap")) features.push("Hot-swappable design");
  if (nameLower.includes("dust filter") || nameLower.includes("dust-filter")) features.push("Integrated dust filters");
  if (nameLower.includes("tempered glass")) features.push("Tempered glass side panel");
  if (nameLower.includes("mesh") && nameLower.includes("front")) features.push("Mesh front panel for airflow");
  if (nameLower.includes("80 plus platinum") || nameLower.includes("80+ platinum")) { features.push("80 PLUS Platinum certified efficiency"); specs["Efficiency"] = "80 PLUS Platinum"; }
  else if (nameLower.includes("80 plus gold") || nameLower.includes("80+ gold")) { features.push("80 PLUS Gold certified efficiency"); specs["Efficiency"] = "80 PLUS Gold"; }
  else if (nameLower.includes("80 plus bronze") || nameLower.includes("80+ bronze")) { features.push("80 PLUS Bronze certified efficiency"); specs["Efficiency"] = "80 PLUS Bronze"; }
  else if (nameLower.includes("80 plus") || nameLower.includes("80+")) { features.push("80 PLUS certified efficiency"); specs["Efficiency"] = "80 PLUS"; }
  if (nameLower.includes("ips")) { specs["Panel Type"] = "IPS"; features.push("IPS panel for wide viewing angles and accurate colours"); }
  else if (nameLower.includes("va panel") || nameLower.includes(" va ")) specs["Panel Type"] = "VA";
  else if (nameLower.includes(" tn ")) specs["Panel Type"] = "TN";
  else if (nameLower.includes("oled")) { specs["Panel Type"] = "OLED"; features.push("OLED display for deep blacks and vivid colours"); }
  if (nameLower.includes("curved")) features.push("Curved display for immersive viewing");
  if (nameLower.includes("ultrawide")) features.push("Ultrawide aspect ratio");
  if (nameLower.includes("freesync")) features.push("AMD FreeSync adaptive sync");
  if (nameLower.includes("g-sync") || nameLower.includes("gsync")) features.push("NVIDIA G-Sync compatible");
  if (nameLower.includes("hdr")) features.push("HDR support");
  if (nameLower.includes("aio") || nameLower.includes("all-in-one")) features.push("All-in-one liquid cooler");
  if (nameLower.includes("tower cooler") || nameLower.includes("air cooler")) features.push("Tower air cooler design");
  if (nameLower.includes("dual fan") || nameLower.includes("2 fan")) features.push("Dual fan design");
  if (nameLower.includes("triple fan") || nameLower.includes("3 fan")) features.push("Triple fan design");
  if (nameLower.includes("backlit") || nameLower.includes("back-lit")) features.push("Backlit keys/display");
  if (nameLower.includes("ergonomic")) features.push("Ergonomic design");
  if (nameLower.includes("programmable")) features.push("Programmable buttons/keys");
  if (nameLower.includes("detachable")) features.push("Detachable cable");
  if (nameLower.includes("braided")) features.push("Braided cable for durability");
  if (nameLower.includes("surround sound") || nameLower.includes("7.1")) features.push("7.1 surround sound");
  if (nameLower.includes("waterproof") || nameLower.includes("water resistant") || nameLower.includes("ip6") || nameLower.includes("ip5")) features.push("Water resistant");
  if (nameLower.includes("ecc")) { specs["ECC"] = "Yes"; features.push("ECC memory support"); }
  if (nameLower.includes("registered") || nameLower.includes("rdimm")) specs["Type"] = "Registered (RDIMM)";
  if (nameLower.includes("unbuffered") || nameLower.includes("udimm")) specs["Type"] = "Unbuffered (UDIMM)";
  if (nameLower.includes("sodimm") || nameLower.includes("so-dimm")) specs["Type"] = "SO-DIMM (Laptop)";
  if (nameLower.includes("low profile")) features.push("Low profile design");

  const modelMatch = name.match(/(?:model|part)\s*(?:no\.?|number|#)?\s*:?\s*([A-Z0-9][-A-Z0-9]{3,20})/i);
  if (modelMatch) specs["Model Number"] = modelMatch[1];

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

async function fetchAmazonImages(searchTerm: string, _category?: string): Promise<string[]> {
  const url = `https://www.amazon.co.uk/s?k=${encodeURIComponent(searchTerm)}`;
  const html = await fetchPage(url);
  if (!html || html.length < 10000) return [];

  const imgs: string[] = [];
  const imgRegex = /src="(https:\/\/m\.media-amazon\.com\/images\/I\/[^"]+\.(?:jpg|jpeg|png|webp)[^"]*)"/gi;
  let match;
  while ((match = imgRegex.exec(html)) !== null && imgs.length < 4) {
    let src = match[1];
    if (src.includes(".js")) continue;
    if (src.includes("._AC_US40") || src.includes("._AC_US20") || src.includes("pixel") || src.includes("sprite") || src.includes("icon") || src.includes("badge")) continue;
    if (src.includes("._SS40") || src.includes("._SS20")) continue;
    src = src.replace(/\._[A-Z0-9_,]+_\./, "._AC_SL500_.");
    if (!imgs.includes(src)) imgs.push(src);
  }
  return imgs;
}

async function fetchEANImage(ean: string): Promise<string | null> {
  if (!ean || ean.length < 8) return null;
  try {
    const url = `https://ean-online.org/img/${ean}.jpg`;
    const res = await fetch(url, { method: "HEAD", signal: AbortSignal.timeout(5000) });
    if (res.ok && res.headers.get("content-type")?.includes("image")) return url;
  } catch {}
  return null;
}

async function fetchProductImageByName(name: string, vendor?: string): Promise<string[]> {
  const cleaned = name
    .replace(/\([^)]*\)/g, "")
    .replace(/\b(OEM|BULK|TRAY|RET|RETAIL|BOX|LTD STOCK|CLEARANCE|EX DISPLAY)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim()
    .substring(0, 60);

  const searchQuery = vendor && !cleaned.toLowerCase().startsWith(vendor.toLowerCase())
    ? `${vendor} ${cleaned} PC component`
    : `${cleaned} PC component`;

  const amazonImgs = await fetchAmazonImages(searchQuery);
  if (amazonImgs.length > 0) return amazonImgs;

  return [];
}

async function enrichProduct(name: string, vendor?: string, mpn?: string, categoryName?: string): Promise<EnrichmentData | null> {
  const searchTerms: string[] = [];

  const shortName = name.replace(/\([^)]*\)/g, "").trim();
  if (vendor && !shortName.toLowerCase().startsWith(vendor.toLowerCase())) {
    searchTerms.push(`${vendor} ${shortName}`.substring(0, 80));
  } else {
    searchTerms.push(shortName.substring(0, 80));
  }

  if (mpn && mpn.length > 3) searchTerms.push(mpn);

  const data: EnrichmentData = {};

  for (const term of searchTerms) {
    console.log(`[Enricher]   Trying Amazon images: "${term}"`);
    const amazonImages = await fetchAmazonImages(term);
    if (amazonImages.length > 0) {
      data.images = amazonImages;
      data.image = amazonImages[0];
      console.log(`[Enricher]   Found ${amazonImages.length} Amazon images`);
      break;
    }
    await delay(3000);
  }

  for (const term of searchTerms) {
    console.log(`[Enricher]   Trying Scan.co.uk specs: "${term}"`);
    const scanData = await enrichFromScan(term);
    if (scanData) {
      if (scanData.specs && Object.keys(scanData.specs).length > 0) data.specs = scanData.specs;
      if (scanData.features && scanData.features.length > 0) data.features = scanData.features;
      if (scanData.description) data.description = scanData.description;
      if (!data.images && scanData.images && scanData.images.length > 0) {
        data.images = scanData.images;
        data.image = scanData.images[0];
      }
      if (data.specs && Object.keys(data.specs).length > 0) break;
    }
    await delay(1500);

    console.log(`[Enricher]   Trying CCL specs: "${term}"`);
    const cclData = await enrichFromCCL(term);
    if (cclData) {
      if (cclData.specs && Object.keys(cclData.specs).length > 0) data.specs = { ...data.specs, ...cclData.specs };
      if (cclData.features && cclData.features.length > 0) data.features = [...(data.features || []), ...cclData.features];
      if (!data.images && cclData.images && cclData.images.length > 0) {
        data.images = cclData.images;
        data.image = cclData.images[0];
      }
      if (data.specs && Object.keys(data.specs).length > 0) break;
    }
    await delay(1500);
  }

  const hasData = (data.specs && Object.keys(data.specs).length > 0) ||
    (data.features && data.features.length > 0) ||
    (data.images && data.images.length > 0) ||
    data.image;

  return hasData ? data : null;
}

const enrichedIds = new Set<number>();

let enrichLiveProgress = { current: 0, total: 0, currentProduct: "" };

export function getEnrichProgress() {
  return { enriched: enrichedIds.size, ...enrichLiveProgress };
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
  const categories = await storage.getCategories();
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
  enrichLiveProgress = { current: 0, total: batch.length, currentProduct: "" };

  for (const product of batch) {
    try {
      result.totalProcessed++;
      enrichLiveProgress = { current: result.totalProcessed, total: batch.length, currentProduct: product.name };
      console.log(`[Enricher] ${result.totalProcessed}/${batch.length}: ${product.name}`);

      const updates: Record<string, any> = { enrichedAt: new Date() };

      const { specs: nameSpecs, features: nameFeatures } = parseSpecsFromName(product.name, product.vendor || undefined, product.description || undefined);

      let webData: EnrichmentData | null = null;
      try {
        const category = product.categoryId ? categories.find(c => c.id === product.categoryId) : null;
        webData = await enrichProduct(product.name, product.vendor || undefined, product.mpn || undefined, category?.name || undefined);
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
        if (!product.image || product.image.includes("vip-computers.com")) {
          updates.image = webData.images[0];
          console.log(`[Enricher]   Set image: ${webData.images[0]}`);
        }
      } else if (product.image) {
        console.log(`[Enricher]   Keeping existing image: ${product.image}`);
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

let pullImageProgress = { running: false, current: 0, total: 0, updated: 0, skipped: 0, errors: 0, currentProduct: "", done: false };

export function getPullImageProgress() {
  return { ...pullImageProgress };
}

export function resetPullImageProgress() {
  pullImageProgress = { running: false, current: 0, total: 0, updated: 0, skipped: 0, errors: 0, currentProduct: "", done: false };
}

export async function pullMissingImages(): Promise<{ updated: number; skipped: number; errors: number }> {
  const allProducts = await storage.getProducts();
  const categories = await storage.getCategories();
  const needImages = allProducts.filter(p => {
    if (enrichedIds.has(p.id)) return false;
    if (!p.image || p.image.includes("vip-computers.com")) return true;
    return false;
  });
  console.log(`[PullImages] ${needImages.length} products need images out of ${allProducts.length} total (${enrichedIds.size} already handled by enricher)`);

  pullImageProgress = { running: true, current: 0, total: needImages.length, updated: 0, skipped: 0, errors: 0, currentProduct: "", done: false };

  let updated = 0;
  let skipped = 0;
  let errors = 0;

  for (const product of needImages) {
    pullImageProgress.current++;
    pullImageProgress.currentProduct = product.name;

    try {
      const category = product.categoryId ? categories.find(c => c.id === product.categoryId) : null;
      const searchTerms: string[] = [];
      const shortName = product.name.replace(/\([^)]*\)/g, "").trim();
      if (product.vendor && !shortName.toLowerCase().startsWith(product.vendor.toLowerCase())) {
        searchTerms.push(`${product.vendor} ${shortName}`.substring(0, 80));
      } else {
        searchTerms.push(shortName.substring(0, 80));
      }
      if (product.mpn && product.mpn.length > 3) searchTerms.push(product.mpn);

      let foundImage: string | null = null;
      for (const term of searchTerms) {
        const imgs = await fetchAmazonImages(term);
        if (imgs.length > 0) {
          foundImage = imgs[0];
          const updates: Record<string, any> = { image: imgs[0], images: JSON.stringify(imgs) };
          await storage.updateProduct(product.id, updates);
          updated++;
          pullImageProgress.updated = updated;
          console.log(`[PullImages] ${pullImageProgress.current}/${needImages.length}: ${product.name} → ${imgs[0]}`);
          break;
        }
        await delay(3000);
      }

      if (!foundImage) {
        skipped++;
        pullImageProgress.skipped = skipped;
        console.log(`[PullImages] No image found for: ${product.name} (keeping existing)`);
      }

      await delay(2000);
    } catch (e: any) {
      errors++;
      pullImageProgress.errors = errors;
      console.error(`[PullImages] Error: ${product.name}: ${e.message}`);
    }
  }

  pullImageProgress = { running: false, current: needImages.length, total: needImages.length, updated, skipped, errors, currentProduct: "", done: true };
  return { updated, skipped, errors };
}
