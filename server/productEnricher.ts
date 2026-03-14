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

  const zoomRegex = /data-(?:zoom-image|large|full|original|hi-res)=["']([^"']+)["']/gi;
  while ((match = zoomRegex.exec(html)) !== null) {
    let src = match[1];
    if (src.startsWith("//")) src = "https:" + src;
    else if (src.startsWith("/")) {
      try { src = new URL(src, baseUrl).href; } catch { continue; }
    }
    if (src.startsWith("http") && src.match(/\.(jpg|jpeg|png|webp)/i) && !src.includes("logo")) {
      imgs.unshift(src);
    }
  }

  const srcsetRegex = /srcset=["']([^"']+)["']/gi;
  while ((match = srcsetRegex.exec(html)) !== null) {
    const parts = match[1].split(",");
    for (const part of parts) {
      const [url] = part.trim().split(/\s+/);
      if (!url) continue;
      let src = url;
      if (src.startsWith("//")) src = "https:" + src;
      else if (src.startsWith("/")) {
        try { src = new URL(src, baseUrl).href; } catch { continue; }
      }
      if (src.startsWith("http") && src.match(/\.(jpg|jpeg|png|webp)/i) && !src.includes("logo") && !src.includes("icon") && !src.includes("1x1")) {
        if (part.includes("2x") || part.includes("1200") || part.includes("800") || part.includes("1000")) {
          imgs.push(src);
        }
      }
    }
  }

  const jsonLdRegex = /"image"\s*:\s*"(https?:\/\/[^"]+\.(jpg|jpeg|png|webp)[^"]*)"/gi;
  while ((match = jsonLdRegex.exec(html)) !== null) {
    if (!match[1].includes("logo") && !match[1].includes("icon")) {
      imgs.push(match[1]);
    }
  }

  const jsonLdArrayRegex = /"image"\s*:\s*\[([\s\S]*?)\]/gi;
  while ((match = jsonLdArrayRegex.exec(html)) !== null) {
    const urlMatches = match[1].match(/"(https?:\/\/[^"]+\.(jpg|jpeg|png|webp)[^"]*)"/gi);
    if (urlMatches) {
      for (const u of urlMatches) {
        const cleaned = u.replace(/"/g, "");
        if (!cleaned.includes("logo") && !cleaned.includes("icon")) {
          imgs.push(cleaned);
        }
      }
    }
  }

  return [...new Set(imgs)].slice(0, 10);
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

function parseSpecsFromDescription(description: string): Record<string, string> {
  const specs: Record<string, string> = {};
  if (!description) return specs;

  const lines = description.split(/[\n\r]+/).map(l => l.trim()).filter(l => l.length > 0);

  for (const line of lines) {
    const colonMatch = line.match(/^([A-Za-z][^:]{1,50}):\s*(.{2,150})$/);
    if (colonMatch) {
      const key = colonMatch[1].trim();
      const val = colonMatch[2].trim();
      if (key.length >= 2 && key.length <= 50 && val.length >= 1 && val.length <= 150) {
        if (!key.toLowerCase().includes("http") && !key.toLowerCase().includes("www") && !key.toLowerCase().includes("email")) {
          specs[key] = val;
        }
      }
    }

    const dashMatch = line.match(/^[-•·]\s*([A-Za-z][^:–-]{1,50})\s*[-–:]\s*(.{2,150})$/);
    if (dashMatch) {
      const key = dashMatch[1].trim();
      const val = dashMatch[2].trim();
      if (key.length >= 2 && key.length <= 50 && val.length >= 1) {
        specs[key] = val;
      }
    }
  }

  return specs;
}

function parseFeaturesFromDescription(description: string): string[] {
  const features: string[] = [];
  if (!description) return features;

  const lines = description.split(/[\n\r]+/).map(l => l.trim()).filter(l => l.length > 0);

  for (const line of lines) {
    if ((line.startsWith("-") || line.startsWith("•") || line.startsWith("·") || line.startsWith("*")) && line.length > 10 && line.length < 200) {
      const cleaned = line.replace(/^[-•·*]\s*/, "").trim();
      if (cleaned.length > 8 && !cleaned.includes(":") && !cleaned.toLowerCase().includes("http")) {
        features.push(cleaned);
      }
    }
  }

  return features.slice(0, 12);
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

async function enrichFromEbuyer(searchTerm: string): Promise<EnrichmentData | null> {
  const query = encodeURIComponent(searchTerm.substring(0, 80));
  const searchHtml = await fetchPage(`https://www.ebuyer.com/search?q=${query}`);
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
    const page = await fetchPage(`https://www.ebuyer.com${link}`);
    if (!page) continue;

    const specs = extractSpecs(page);
    if (Object.keys(specs).length > 0) data.specs = { ...data.specs, ...specs };

    const features = extractFeatures(page);
    if (features.length > 0) data.features = [...(data.features || []), ...features];

    const images = extractImages(page, "https://www.ebuyer.com");
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

async function enrichFromOverclockers(searchTerm: string): Promise<EnrichmentData | null> {
  const query = encodeURIComponent(searchTerm.substring(0, 80));
  const searchHtml = await fetchPage(`https://www.overclockers.co.uk/search?sSearch=${query}`);
  if (!searchHtml) return null;

  const productLinks: string[] = [];
  const linkRegex = /href="(https:\/\/www\.overclockers\.co\.uk\/[^"#]*\.html)"/gi;
  let match;
  while ((match = linkRegex.exec(searchHtml)) !== null) {
    const link = match[1];
    if (!productLinks.includes(link) && productLinks.length < 2 && !link.includes("/search") && !link.includes("/category")) {
      productLinks.push(link);
    }
  }

  if (productLinks.length === 0) return null;

  const data: EnrichmentData = {};

  for (const link of productLinks) {
    await delay(1000);
    const page = await fetchPage(link);
    if (!page) continue;

    const specs = extractSpecs(page);
    if (Object.keys(specs).length > 0) data.specs = { ...data.specs, ...specs };

    const features = extractFeatures(page);
    if (features.length > 0) data.features = [...(data.features || []), ...features];

    const images = extractImages(page, "https://www.overclockers.co.uk");
    const ogImages = extractOgImages(page);
    const allImages = [...images, ...ogImages];
    if (allImages.length > 0) data.images = [...(data.images || []), ...allImages];

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

async function enrichFromBox(searchTerm: string): Promise<EnrichmentData | null> {
  const query = encodeURIComponent(searchTerm.substring(0, 80));
  const searchHtml = await fetchPage(`https://www.box.co.uk/search?q=${query}`);
  if (!searchHtml) return null;

  const productLinks: string[] = [];
  const linkRegex = /href="(\/[^"#]*-p-\d+\.html)"/gi;
  let match;
  while ((match = linkRegex.exec(searchHtml)) !== null) {
    const link = match[1];
    if (!productLinks.includes(link) && productLinks.length < 2) {
      productLinks.push(link);
    }
  }

  const altLinkRegex = /href="(\/product\/[^"#]+)"/gi;
  while ((match = altLinkRegex.exec(searchHtml)) !== null) {
    const link = match[1];
    if (!productLinks.includes(link) && productLinks.length < 2) {
      productLinks.push(link);
    }
  }

  if (productLinks.length === 0) return null;

  const data: EnrichmentData = {};

  for (const link of productLinks) {
    await delay(1000);
    const page = await fetchPage(`https://www.box.co.uk${link}`);
    if (!page) continue;

    const specs = extractSpecs(page);
    if (Object.keys(specs).length > 0) data.specs = { ...data.specs, ...specs };

    const features = extractFeatures(page);
    if (features.length > 0) data.features = [...(data.features || []), ...features];

    const images = extractImages(page, "https://www.box.co.uk");
    const ogImages = extractOgImages(page);
    const allImages = [...images, ...ogImages];
    if (allImages.length > 0) data.images = [...(data.images || []), ...allImages];

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

async function enrichFromNovatech(searchTerm: string): Promise<EnrichmentData | null> {
  const query = encodeURIComponent(searchTerm.substring(0, 80));
  const searchHtml = await fetchPage(`https://www.novatech.co.uk/search/?search=${query}`);
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
    const page = await fetchPage(`https://www.novatech.co.uk${link}`);
    if (!page) continue;

    const specs = extractSpecs(page);
    if (Object.keys(specs).length > 0) data.specs = { ...data.specs, ...specs };

    const features = extractFeatures(page);
    if (features.length > 0) data.features = [...(data.features || []), ...features];

    const images = extractImages(page, "https://www.novatech.co.uk");
    const ogImages = extractOgImages(page);
    const allImages = [...images, ...ogImages];
    if (allImages.length > 0) data.images = [...(data.images || []), ...allImages];

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

async function enrichFromLambdatek(searchTerm: string): Promise<EnrichmentData | null> {
  const query = encodeURIComponent(searchTerm.substring(0, 80));
  const searchHtml = await fetchPage(`https://www.lambda-tek.com/search/${query}`);
  if (!searchHtml) return null;

  const productLinks: string[] = [];
  const linkRegex = /href="(\/[^"#]*[A-Z0-9-]+\.html)"/gi;
  let match;
  while ((match = linkRegex.exec(searchHtml)) !== null) {
    const link = match[1];
    if (!productLinks.includes(link) && productLinks.length < 2 && !link.includes("/search")) {
      productLinks.push(link);
    }
  }

  if (productLinks.length === 0) return null;

  const data: EnrichmentData = {};

  for (const link of productLinks) {
    await delay(1000);
    const page = await fetchPage(`https://www.lambda-tek.com${link}`);
    if (!page) continue;

    const specs = extractSpecs(page);
    if (Object.keys(specs).length > 0) data.specs = { ...data.specs, ...specs };

    const features = extractFeatures(page);
    if (features.length > 0) data.features = [...(data.features || []), ...features];

    const images = extractImages(page, "https://www.lambda-tek.com");
    const ogImages = extractOgImages(page);
    const allImages = [...images, ...ogImages];
    if (allImages.length > 0) data.images = [...(data.images || []), ...allImages];

    if (data.specs && Object.keys(data.specs).length > 3) break;
  }

  if (data.features) data.features = [...new Set(data.features)].slice(0, 10);
  if (data.images) data.images = [...new Set(data.images)].slice(0, 6);

  const hasData = (data.specs && Object.keys(data.specs).length > 0) ||
    (data.features && data.features.length > 0) ||
    (data.images && data.images.length > 0);

  return hasData ? data : null;
}

function extractOgImages(html: string): string[] {
  const images: string[] = [];
  const ogRegex = /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/gi;
  let match;
  while ((match = ogRegex.exec(html)) !== null) {
    let src = match[1];
    if (src.startsWith("//")) src = "https:" + src;
    if (src.startsWith("http") && src.match(/\.(jpg|jpeg|png|webp)/i) && !src.includes("logo") && !src.includes("icon") && !src.includes("favicon")) {
      images.push(src);
    }
  }

  const twitterRegex = /<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/gi;
  while ((match = twitterRegex.exec(html)) !== null) {
    let src = match[1];
    if (src.startsWith("//")) src = "https:" + src;
    if (src.startsWith("http") && src.match(/\.(jpg|jpeg|png|webp)/i) && !src.includes("logo")) {
      images.push(src);
    }
  }

  return [...new Set(images)];
}

async function fetchDuckDuckGoImages(searchTerm: string): Promise<string[]> {
  try {
    const query = encodeURIComponent(`${searchTerm} product photo`);
    const html = await fetchPage(`https://lite.duckduckgo.com/lite/?q=${query}&kp=1`);
    if (!html) return [];

    const images: string[] = [];
    const resultRegex = /href="(https?:\/\/[^"]+\.(jpg|jpeg|png|webp)[^"]*)"/gi;
    let match;
    while ((match = resultRegex.exec(html)) !== null && images.length < 4) {
      const src = match[1];
      if (!src.includes("duckduckgo") && !src.includes("logo") && !src.includes("icon") && !src.includes("avatar") && !src.includes("pixel")) {
        images.push(src);
      }
    }

    return images;
  } catch {
    return [];
  }
}

async function fetchGoogleShoppingImage(searchTerm: string): Promise<string[]> {
  try {
    const query = encodeURIComponent(searchTerm);
    const html = await fetchPage(`https://www.google.co.uk/search?q=${query}&tbm=isch&safe=active`);
    if (!html) return [];

    const images: string[] = [];
    const imgRegex = /\["(https:\/\/[^"]+\.(?:jpg|jpeg|png|webp)[^"]*)"/gi;
    let match;
    while ((match = imgRegex.exec(html)) !== null && images.length < 3) {
      const src = match[1].replace(/\\u0026/g, "&");
      if (src.length > 50 && !src.includes("gstatic") && !src.includes("google") && !src.includes("logo") && !src.includes("icon")) {
        images.push(src);
      }
    }

    return images;
  } catch {
    return [];
  }
}

async function fetchGoogleCachedProductPage(searchTerm: string, site?: string): Promise<EnrichmentData | null> {
  try {
    const siteFilter = site ? `site:${site} ` : "";
    const query = encodeURIComponent(`${siteFilter}${searchTerm}`);
    const html = await fetchPage(`https://www.google.co.uk/search?q=${query}&hl=en&gl=uk`);
    if (!html || html.length < 5000) return null;

    const data: EnrichmentData = {};

    const imgRegex = /\["(https:\/\/[^"]+\.(?:jpg|jpeg|png|webp)[^"]*)",\d+,\d+\]/gi;
    let match;
    const imgs: string[] = [];
    while ((match = imgRegex.exec(html)) !== null && imgs.length < 8) {
      const src = match[1].replace(/\\u003d/g, "=").replace(/\\u0026/g, "&").replace(/\\x3d/g, "=").replace(/\\x26/g, "&");
      if (src.length > 50 && !src.includes("gstatic") && !src.includes("google") && !src.includes("logo") && !src.includes("icon") && !src.includes("favicon") && !src.includes("1x1") && !src.includes("pixel")) {
        imgs.push(src);
      }
    }

    const encImgRegex = /src="(https:\/\/encrypted-tbn[^"]+)"/gi;
    while ((match = encImgRegex.exec(html)) !== null && imgs.length < 10) {
      imgs.push(match[1].replace(/&amp;/g, "&"));
    }

    if (imgs.length > 0) data.images = [...new Set(imgs)].slice(0, 10);

    const snippetRegex = /class="[^"]*(?:VwiC3b|IsZvec|yXK7lf)[^"]*"[^>]*>([\s\S]*?)<\//gi;
    const snippets: string[] = [];
    while ((match = snippetRegex.exec(html)) !== null) {
      const text = cleanHtml(match[1]);
      if (text.length > 40 && !text.includes("Missing:") && !text.includes("Must include:")) {
        snippets.push(text);
      }
    }
    if (snippets.length > 0 && snippets[0].length > 50) {
      data.description = snippets[0].slice(0, 300);
    }

    const linkRegex = /href="(https?:\/\/[^"]+)" [^>]*data-/gi;
    const productLinks: string[] = [];
    while ((match = linkRegex.exec(html)) !== null && productLinks.length < 3) {
      const url = match[1].replace(/&amp;/g, "&");
      if (!url.includes("google") && !url.includes("youtube") && !url.includes("facebook") && !url.includes("twitter") && !url.includes("reddit")) {
        productLinks.push(url);
      }
    }

    for (const link of productLinks.slice(0, 2)) {
      await delay(1500);
      const page = await fetchPage(link);
      if (!page || page.length < 5000) continue;

      const specs = extractSpecs(page);
      if (Object.keys(specs).length > 0) data.specs = { ...data.specs, ...specs };

      const features = extractFeatures(page);
      if (features.length > 0) data.features = [...(data.features || []), ...features];

      const pageImages = extractImages(page, new URL(link).origin);
      const ogImages = extractOgImages(page);
      const allPageImgs = [...pageImages, ...ogImages].filter(img =>
        !img.includes("logo") && !img.includes("icon") && !img.includes("favicon") && !img.includes("banner") && !img.includes("sprite") && !img.includes("pixel") && !img.includes("1x1")
      );
      if (allPageImgs.length > 0) {
        data.images = [...new Set([...(data.images || []), ...allPageImgs])].slice(0, 15);
      }

      const metaDesc = page.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']{40,})["']/i);
      if (metaDesc && (!data.description || metaDesc[1].length > data.description.length)) {
        data.description = metaDesc[1].trim().slice(0, 300);
      }

      if (data.specs && Object.keys(data.specs).length >= 5 && data.images && data.images.length >= 4) break;
    }

    if (data.features) data.features = [...new Set(data.features)].slice(0, 12);

    const hasData = (data.specs && Object.keys(data.specs).length > 0) ||
      (data.features && data.features.length > 0) ||
      (data.images && data.images.length > 0) ||
      data.description;

    return hasData ? data : null;
  } catch (e: any) {
    console.log(`[Enricher]   Google cached page error: ${e.message}`);
    return null;
  }
}

const MANUFACTURER_DOMAINS: Record<string, string> = {
  "corsair": "corsair.com",
  "msi": "msi.com",
  "gigabyte": "gigabyte.com",
  "asus": "asus.com",
  "nzxt": "nzxt.com",
  "evga": "evga.com",
  "kingston": "kingston.com",
  "samsung": "samsung.com",
  "crucial": "crucial.com",
  "noctua": "noctua.at",
  "cooler master": "coolermaster.com",
  "be quiet!": "bequiet.com",
  "seasonic": "seasonic.com",
  "western digital": "westerndigital.com",
  "wd": "westerndigital.com",
  "amd": "amd.com",
  "intel": "intel.com",
  "fractal design": "fractal-design.com",
  "thermaltake": "thermaltake.com",
  "arctic": "arctic.de",
  "lian li": "lian-li.com",
  "phanteks": "phanteks.com",
  "g.skill": "gskill.com",
  "seagate": "seagate.com",
  "sapphire": "sapphiretech.com",
  "xfx": "xfxforce.com",
  "powercolor": "powercolor.com",
  "zotac": "zotac.com",
  "palit": "palit.com",
  "pny": "pny.com",
  "asrock": "asrock.com",
  "deepcool": "deepcool.com",
  "antec": "antec.com",
  "silverstone": "silverstonetek.com",
  "razer": "razer.com",
  "logitech": "logitechg.com",
  "steelseries": "steelseries.com",
  "hyperx": "hyperx.com",
  "benq": "benq.com",
  "aoc": "aoc.com",
  "acer": "acer.com",
  "dell": "dell.com",
  "lg": "lg.com",
  "tp-link": "tp-link.com",
  "netgear": "netgear.com",
  "adata": "adata.com",
  "sabrent": "sabrent.com",
  "team": "teamgroupinc.com",
  "patriot": "patriotmemory.com",
  "cougar": "cougargaming.com",
  "montech": "montech.com",
};

async function fetchManufacturerImages(vendor: string, productName: string, mpn?: string): Promise<EnrichmentData | null> {
  const vendorLower = vendor.toLowerCase().replace(/\s+/g, " ").trim();
  const domain = MANUFACTURER_DOMAINS[vendorLower];

  const searchTerm = mpn && mpn.length > 4 ? `${vendor} ${mpn}` : `${vendor} ${productName}`.substring(0, 80);
  console.log(`[Enricher]   Trying manufacturer data via Google (${vendor}): "${searchTerm}"`);

  try {
    const data = await fetchGoogleCachedProductPage(searchTerm, domain);

    if (data) {
      console.log(`[Enricher]   Manufacturer (${vendor}): ${(data.images || []).length} images, ${Object.keys(data.specs || {}).length} specs, ${(data.features || []).length} features`);
    }

    if (!data || (!data.images || data.images.length < 2)) {
      console.log(`[Enricher]   Trying broader Google search for ${vendor}...`);
      const broadData = await fetchGoogleCachedProductPage(searchTerm);
      if (broadData) {
        if (!data) return broadData;
        if (broadData.images && broadData.images.length > 0) {
          data.images = [...new Set([...(data.images || []), ...broadData.images])].slice(0, 15);
        }
        if (broadData.specs && Object.keys(broadData.specs).length > Object.keys(data.specs || {}).length) {
          data.specs = { ...data.specs, ...broadData.specs };
        }
        if (broadData.features && broadData.features.length > (data.features || []).length) {
          data.features = [...new Set([...(data.features || []), ...broadData.features])].slice(0, 12);
        }
        if (broadData.description && (!data.description || broadData.description.length > data.description.length)) {
          data.description = broadData.description;
        }
        console.log(`[Enricher]   After broad search: ${(data.images || []).length} images, ${Object.keys(data.specs || {}).length} specs`);
      }
      await delay(2000);
    }

    return data;
  } catch (e: any) {
    console.log(`[Enricher]   Manufacturer (${vendor}) error: ${e.message}`);
    return null;
  }
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
    src = src.replace(/\._[A-Z0-9_,]+_\./, "._AC_SL1500_.");
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

  if (vendor) {
    const mfgData = await fetchManufacturerImages(vendor, shortName, mpn);
    if (mfgData) {
      if (mfgData.images && mfgData.images.length > 0) {
        data.images = mfgData.images;
        data.image = mfgData.images[0];
      }
      if (mfgData.specs && Object.keys(mfgData.specs).length > 0) data.specs = mfgData.specs;
      if (mfgData.features && mfgData.features.length > 0) data.features = mfgData.features;
      if (mfgData.description) data.description = mfgData.description;
    }
    await delay(2000);
  }

  for (const term of searchTerms) {
    console.log(`[Enricher]   Trying Amazon images: "${term}"`);
    const amazonImages = await fetchAmazonImages(term);
    if (amazonImages.length > 0) {
      data.images = [...new Set([...(data.images || []), ...amazonImages])].slice(0, 15);
      if (!data.image) data.image = amazonImages[0];
      console.log(`[Enricher]   Found ${amazonImages.length} Amazon images (total: ${data.images.length})`);
      break;
    }
    await delay(3000);
  }

  const retailerSources: Array<{ name: string; fn: (term: string) => Promise<EnrichmentData | null> }> = [
    { name: "Scan.co.uk", fn: enrichFromScan },
    { name: "CCL", fn: enrichFromCCL },
    { name: "eBuyer", fn: enrichFromEbuyer },
    { name: "Overclockers UK", fn: enrichFromOverclockers },
    { name: "Box.co.uk", fn: enrichFromBox },
    { name: "Novatech", fn: enrichFromNovatech },
    { name: "Lambda-tek", fn: enrichFromLambdatek },
  ];

  for (const term of searchTerms) {
    for (const source of retailerSources) {
      const hasEnoughSpecs = data.specs && Object.keys(data.specs).length >= 8;
      const hasEnoughImages = data.images && data.images.length >= 8;
      if (hasEnoughSpecs && hasEnoughImages) break;

      console.log(`[Enricher]   Trying ${source.name}: "${term}"`);
      try {
        const result = await source.fn(term);
        if (result) {
          if (result.specs && Object.keys(result.specs).length > 0) data.specs = { ...data.specs, ...result.specs };
          if (result.features && result.features.length > 0) data.features = [...new Set([...(data.features || []), ...result.features])].slice(0, 20);
          if (result.description && !data.description) data.description = result.description;
          if (result.images && result.images.length > 0) {
            data.images = [...new Set([...(data.images || []), ...result.images])].slice(0, 15);
            if (!data.image) data.image = data.images[0];
          }
          console.log(`[Enricher]   ${source.name} found: ${Object.keys(result.specs || {}).length} specs, ${(result.features || []).length} features, ${(result.images || []).length} images (total images: ${(data.images || []).length})`);
        }
      } catch (e: any) {
        console.log(`[Enricher]   ${source.name} error: ${e.message}`);
      }
      await delay(1500);
    }

    if (data.specs && Object.keys(data.specs).length >= 5) break;
  }

  if (!data.images || data.images.length < 3) {
    for (const term of searchTerms) {
      console.log(`[Enricher]   Trying DuckDuckGo images: "${term}"`);
      const ddgImages = await fetchDuckDuckGoImages(term);
      if (ddgImages.length > 0) {
        data.images = [...new Set([...(data.images || []), ...ddgImages])].slice(0, 15);
        if (!data.image) data.image = ddgImages[0];
        console.log(`[Enricher]   DuckDuckGo found ${ddgImages.length} images (total: ${data.images.length})`);
        if (data.images.length >= 4) break;
      }
      await delay(2000);

      console.log(`[Enricher]   Trying Google image search: "${term}"`);
      const googleImages = await fetchGoogleShoppingImage(term);
      if (googleImages.length > 0) {
        data.images = [...new Set([...(data.images || []), ...googleImages])].slice(0, 15);
        if (!data.image) data.image = googleImages[0];
        console.log(`[Enricher]   Google found ${googleImages.length} images (total: ${data.images.length})`);
        if (data.images.length >= 4) break;
      }
      await delay(2000);
    }
  }

  const hasData = (data.specs && Object.keys(data.specs).length > 0) ||
    (data.features && data.features.length > 0) ||
    (data.images && data.images.length > 0) ||
    data.image;

  return hasData ? data : null;
}

function generateSeoDescription(name: string, vendor: string | undefined, specs: Record<string, string>, features: string[]): string {
  const parts: string[] = [];
  const brand = vendor || specs["Brand"] || "";

  parts.push(`Buy the ${name} from Thorn Tech Solutions Ltd, a trusted UK PC components retailer.`);

  const specHighlights: string[] = [];
  if (specs["Memory / Capacity"]) specHighlights.push(specs["Memory / Capacity"]);
  if (specs["Capacity"]) specHighlights.push(specs["Capacity"]);
  if (specs["Clock Speed"]) specHighlights.push(`${specs["Clock Speed"]} clock speed`);
  if (specs["Speed"]) specHighlights.push(`${specs["Speed"]} speed`);
  if (specs["Cores"]) specHighlights.push(`${specs["Cores"]} cores`);
  if (specs["Socket"]) specHighlights.push(`${specs["Socket"]} socket`);
  if (specs["Chipset"]) specHighlights.push(`${specs["Chipset"]} chipset`);
  if (specs["Form Factor"]) specHighlights.push(`${specs["Form Factor"]} form factor`);
  if (specs["Interface"]) specHighlights.push(`${specs["Interface"]} interface`);
  if (specs["Efficiency"]) specHighlights.push(`${specs["Efficiency"]} rated`);
  if (specs["Panel Type"]) specHighlights.push(`${specs["Panel Type"]} panel`);
  if (specs["Resolution"]) specHighlights.push(`${specs["Resolution"]} resolution`);
  if (specs["Refresh Rate"]) specHighlights.push(`${specs["Refresh Rate"]} refresh rate`);
  if (specs["Wattage"]) specHighlights.push(`${specs["Wattage"]} power`);

  if (specHighlights.length > 0) {
    parts.push(`Key specs: ${specHighlights.slice(0, 5).join(", ")}.`);
  }

  if (features.length > 0) {
    parts.push(`Features include ${features.slice(0, 3).join(", ")}.`);
  }

  parts.push("Fast 1-3 day UK delivery, free shipping over £200. All prices include VAT.");

  return parts.join(" ");
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

      let existingSpecs: Record<string, string> = {};
      try { if (product.specs) existingSpecs = typeof product.specs === "string" ? JSON.parse(product.specs) : product.specs; } catch {}
      let existingFeatures: string[] = [];
      try { if (product.features) existingFeatures = typeof product.features === "string" ? JSON.parse(product.features) : product.features; } catch {}
      let existingImages: string[] = [];
      try { if (product.images) existingImages = typeof product.images === "string" ? JSON.parse(product.images) : product.images; } catch {}

      const hasGoodSpecs = Object.keys(existingSpecs).length >= 3;
      const hasGoodFeatures = existingFeatures.length >= 3;
      const hasGoodImages = existingImages.length >= 2 && product.image && !product.image.includes("vip-computers.com") && !product.image.includes("placeholder");
      const hasGoodDescription = product.description && product.description.length >= 80;

      const { specs: nameSpecs, features: nameFeatures } = parseSpecsFromName(product.name, product.vendor || undefined, product.description || undefined);
      const descSpecs = parseSpecsFromDescription(product.description || "");
      const descFeatures = parseFeaturesFromDescription(product.description || "");

      let webData: EnrichmentData | null = null;
      if (!hasGoodSpecs || !hasGoodImages || !hasGoodFeatures) {
        try {
          const category = product.categoryId ? categories.find(c => c.id === product.categoryId) : null;
          webData = await enrichProduct(product.name, product.vendor || undefined, product.mpn || undefined, category?.name || undefined);
        } catch (e: any) {
          console.log(`[Enricher]   Web fetch failed: ${e.message}`);
        }
      } else {
        console.log(`[Enricher]   Product already has good data (${Object.keys(existingSpecs).length} specs, ${existingFeatures.length} features, ${existingImages.length} images) — skipping web fetch`);
      }

      const mergedSpecs = { ...nameSpecs, ...descSpecs, ...(webData?.specs || {}) };
      const finalSpecs = hasGoodSpecs
        ? { ...mergedSpecs, ...existingSpecs }
        : { ...existingSpecs, ...mergedSpecs };
      const mergedFeatures = [...new Set([...(webData?.features || []), ...descFeatures, ...nameFeatures])];
      const finalFeatures = hasGoodFeatures
        ? [...new Set([...existingFeatures, ...mergedFeatures])].slice(0, 20)
        : [...new Set([...mergedFeatures, ...existingFeatures])].slice(0, 20);

      if (Object.keys(finalSpecs).length > Object.keys(existingSpecs).length) {
        updates.specs = JSON.stringify(finalSpecs);
        console.log(`[Enricher]   Specs: ${Object.keys(existingSpecs).length} → ${Object.keys(finalSpecs).length}`);
      } else if (Object.keys(existingSpecs).length === 0 && Object.keys(finalSpecs).length > 0) {
        updates.specs = JSON.stringify(finalSpecs);
      }

      if (finalFeatures.length > existingFeatures.length) {
        updates.features = JSON.stringify(finalFeatures);
        console.log(`[Enricher]   Features: ${existingFeatures.length} → ${finalFeatures.length}`);
      } else if (existingFeatures.length === 0 && finalFeatures.length > 0) {
        updates.features = JSON.stringify(finalFeatures);
      }

      if (webData?.images && webData.images.length > 0) {
        const combinedImages = [...new Set([...existingImages, ...webData.images])].slice(0, 15);
        if (combinedImages.length > existingImages.length) {
          updates.images = JSON.stringify(combinedImages);
          console.log(`[Enricher]   Images: ${existingImages.length} → ${combinedImages.length}`);
        }
        const isBadImage = !product.image || product.image.includes("vip-computers.com") || product.image.includes("placeholder") || product.image.includes("no-image") || product.image.includes("default");
        if (isBadImage) {
          updates.image = webData.images[0];
          console.log(`[Enricher]   Replaced bad main image with: ${webData.images[0]}`);
        }
      } else if (product.image) {
        console.log(`[Enricher]   Keeping existing image: ${product.image}`);
      }

      if (webData?.description && !hasGoodDescription) {
        updates.description = webData.description;
        console.log(`[Enricher]   Added description (${webData.description.length} chars)`);
      } else if (!hasGoodDescription) {
        const generated = generateSeoDescription(product.name, product.vendor || undefined, finalSpecs, finalFeatures);
        if (generated.length > 80) {
          updates.description = generated;
          console.log(`[Enricher]   Generated SEO description (${generated.length} chars)`);
        }
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
    if (!p.image || p.image.includes("vip-computers.com") || p.image.includes("placeholder") || p.image.includes("no-image") || p.image.includes("default")) return true;
    let existingImgs: string[] = [];
    try { if (p.images) existingImgs = typeof p.images === "string" ? JSON.parse(p.images) : p.images; } catch {}
    if (existingImgs.length < 2) return true;
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

      let foundImages: string[] = [];

      if (product.vendor) {
        const mfgData = await fetchManufacturerImages(product.vendor, product.name, product.mpn || undefined);
        if (mfgData?.images && mfgData.images.length > 0) {
          foundImages = mfgData.images;
          console.log(`[PullImages] Manufacturer (${product.vendor}) found ${mfgData.images.length} for: ${product.name}`);
        }
        await delay(2000);
      }

      for (const term of searchTerms) {
        const amazonImgs = await fetchAmazonImages(term);
        if (amazonImgs.length > 0) {
          foundImages = [...new Set([...foundImages, ...amazonImgs])].slice(0, 15);
          console.log(`[PullImages] Amazon found ${amazonImgs.length} for: ${product.name} (total: ${foundImages.length})`);
          break;
        }
        await delay(3000);
      }

      if (foundImages.length < 4) {
        for (const term of searchTerms) {
          const retailerFns: Array<{ name: string; fn: (t: string) => Promise<EnrichmentData | null> }> = [
            { name: "Scan", fn: enrichFromScan },
            { name: "CCL", fn: enrichFromCCL },
            { name: "eBuyer", fn: enrichFromEbuyer },
            { name: "Overclockers", fn: enrichFromOverclockers },
            { name: "Box", fn: enrichFromBox },
            { name: "Novatech", fn: enrichFromNovatech },
          ];
          for (const source of retailerFns) {
            try {
              const result = await source.fn(term);
              if (result?.images && result.images.length > 0) {
                foundImages = [...new Set([...foundImages, ...result.images])].slice(0, 15);
                console.log(`[PullImages] ${source.name} found ${result.images.length} for: ${product.name} (total: ${foundImages.length})`);
                if (foundImages.length >= 6) break;
              }
            } catch {}
            await delay(1500);
          }
          if (foundImages.length >= 4) break;
        }
      }

      if (foundImages.length < 2) {
        for (const term of searchTerms) {
          const ddgImgs = await fetchDuckDuckGoImages(term);
          if (ddgImgs.length > 0) {
            foundImages = [...new Set([...foundImages, ...ddgImgs])].slice(0, 15);
            console.log(`[PullImages] DuckDuckGo found ${ddgImgs.length} for: ${product.name} (total: ${foundImages.length})`);
            break;
          }
          await delay(2000);
        }
      }

      if (foundImages.length > 0) {
        let currentImages: string[] = [];
        try { if (product.images) currentImages = typeof product.images === "string" ? JSON.parse(product.images) : product.images; } catch {}
        const goodExisting = currentImages.filter(img => img && !img.includes("vip-computers.com") && !img.includes("placeholder") && !img.includes("no-image"));
        const merged = [...new Set([...goodExisting, ...foundImages])].slice(0, 15);

        const updates: Record<string, any> = { images: JSON.stringify(merged) };
        const isBadMainImage = !product.image || product.image.includes("vip-computers.com") || product.image.includes("placeholder") || product.image.includes("no-image") || product.image.includes("default");
        if (isBadMainImage) {
          updates.image = merged[0];
        }
        await storage.updateProduct(product.id, updates);
        updated++;
        pullImageProgress.updated = updated;
        console.log(`[PullImages] ${pullImageProgress.current}/${needImages.length}: ${product.name} → ${merged.length} images (${goodExisting.length} kept + ${foundImages.length} new)`);
      } else {
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
