import { storage } from "./storage";

const SITE_URL = "https://thorntechsolutionsltd.com";
const SITE_NAME = "Thorn Tech Solutions Ltd";

function escHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

const CATEGORY_SEO: Record<string, { title: string; description: string; keywords: string[] }> = {
  "processors": {
    title: "Buy Processors (CPUs) UK",
    description: "Shop Intel & AMD processors at competitive UK prices. From budget Ryzen 5 to high-end Core i9 and Threadripper CPUs for gaming, content creation and workstations. All CPUs are brand new with full UK warranty.",
    keywords: ["buy CPU UK", "Intel processors UK", "AMD Ryzen UK", "gaming CPU", "best processor UK"]
  },
  "graphics-cards": {
    title: "Buy Graphics Cards (GPUs) UK",
    description: "Shop NVIDIA GeForce RTX and AMD Radeon RX graphics cards at great UK prices. Find the right GPU for 1080p, 1440p or 4K gaming. All GPUs are brand new, boxed and backed by UK warranty.",
    keywords: ["buy GPU UK", "RTX graphics cards UK", "cheap GPUs UK", "gaming graphics card", "NVIDIA UK"]
  },
  "motherboards": {
    title: "Buy Motherboards UK",
    description: "Browse ATX, Micro-ATX and Mini-ITX motherboards for Intel and AMD platforms. From budget B-series to enthusiast X-series and Z-series boards with WiFi, PCIe 5.0 and DDR5 support.",
    keywords: ["buy motherboard UK", "gaming motherboard UK", "AMD motherboard", "Intel motherboard", "ATX motherboard"]
  },
  "memory": {
    title: "Buy RAM / Memory UK",
    description: "Shop DDR4 and DDR5 desktop and laptop memory modules from Corsair, Kingston, G.Skill and more. High-speed kits for gaming, content creation and professional workloads.",
    keywords: ["buy RAM UK", "DDR5 RAM UK", "DDR4 memory", "gaming RAM", "laptop memory UK"]
  },
  "storage": {
    title: "Buy SSDs & Storage UK",
    description: "Shop NVMe SSDs, SATA SSDs and hard drives for fast, reliable PC storage. PCIe Gen4 and Gen5 drives from Samsung, WD, Crucial, Seagate and more with full UK warranty.",
    keywords: ["buy SSD UK", "NVMe SSD UK", "hard drive UK", "PC storage", "M.2 SSD"]
  },
  "power-supplies": {
    title: "Buy Power Supplies (PSUs) UK",
    description: "Shop modular and semi-modular PC power supplies from 450W to 1600W. 80+ Bronze, Gold, Platinum and Titanium rated PSUs from Corsair, Seasonic, EVGA and be quiet!.",
    keywords: ["buy PSU UK", "PC power supply UK", "modular PSU", "gaming power supply", "80+ Gold PSU"]
  },
  "cooling": {
    title: "Buy PC Cooling UK",
    description: "Shop air coolers, AIO liquid coolers and case fans for your PC build. Tower coolers, 240mm/360mm AIO radiators and RGB fans from Noctua, Corsair, Arctic and more.",
    keywords: ["buy PC cooling UK", "AIO cooler UK", "CPU cooler", "case fans", "liquid cooling UK"]
  },
  "cases": {
    title: "Buy PC Cases UK",
    description: "Shop ATX, Micro-ATX and Mini-ITX PC cases for your gaming or workstation build. Mid-tower, full-tower and compact cases from Corsair, NZXT, Fractal Design, Lian Li and more.",
    keywords: ["buy PC case UK", "gaming case UK", "ATX case", "mid-tower case", "PC tower"]
  },
  "monitors": {
    title: "Buy Monitors UK",
    description: "Shop gaming, professional and ultrawide monitors. 1080p, 1440p and 4K displays with high refresh rates, IPS/VA panels and adaptive sync from ASUS, LG, Samsung and more.",
    keywords: ["buy monitor UK", "gaming monitor UK", "4K monitor", "ultrawide monitor", "144Hz monitor"]
  },
  "keyboards": {
    title: "Buy Keyboards UK",
    description: "Shop mechanical, membrane and wireless keyboards for gaming and productivity. RGB backlit, hot-swappable and compact layouts from Corsair, Razer, Logitech and more.",
    keywords: ["buy keyboard UK", "mechanical keyboard UK", "gaming keyboard", "wireless keyboard"]
  },
  "mice": {
    title: "Buy Gaming & Wireless Mice UK",
    description: "Shop gaming, wireless and ergonomic mice for every use case. High-DPI sensors, lightweight designs and programmable buttons from Logitech, Razer, SteelSeries and more.",
    keywords: ["buy mouse UK", "gaming mouse UK", "wireless mouse", "ergonomic mouse"]
  },
  "headsets-audio": {
    title: "Buy Gaming Headsets & Audio UK",
    description: "Shop gaming headsets, speakers and audio accessories. Surround sound, wireless and wired headsets from HyperX, SteelSeries, Corsair, Razer and more for immersive PC gaming.",
    keywords: ["buy gaming headset UK", "PC headset", "wireless headset UK", "gaming audio"]
  },
  "laptops": {
    title: "Buy Laptops UK",
    description: "Shop gaming, business and everyday laptops from top brands. Portable power for work, study and play with fast UK delivery and full manufacturer warranty.",
    keywords: ["buy laptop UK", "gaming laptop UK", "business laptop", "student laptop"]
  },
  "networking": {
    title: "Buy Networking Hardware UK",
    description: "Shop WiFi adapters, routers, ethernet cards and network cables. Get reliable connectivity for gaming, streaming and working from home.",
    keywords: ["buy WiFi adapter UK", "networking hardware", "ethernet card", "router UK"]
  },
  "cables-adapters": {
    title: "Buy Cables & Adapters UK",
    description: "Shop display cables, USB cables, adapters and extensions. HDMI, DisplayPort, USB-C and more for connecting your PC components and peripherals.",
    keywords: ["buy cables UK", "HDMI cable", "DisplayPort cable", "USB-C adapter", "PC cables"]
  },
  "controllers-gaming": {
    title: "Buy Game Controllers UK",
    description: "Shop game controllers, joysticks and gaming accessories. Xbox, PlayStation and third-party controllers for PC gaming with full UK warranty.",
    keywords: ["buy game controller UK", "PC controller", "Xbox controller PC", "gaming accessories"]
  },
  "accessories": {
    title: "Buy PC Accessories UK",
    description: "Shop mouse mats, cable management, tools and other PC accessories. Everything you need to complete your setup and keep it tidy.",
    keywords: ["buy PC accessories UK", "mouse mat", "cable management", "PC tools"]
  },
  "pre-built-pcs": {
    title: "Buy Pre-Built Gaming PCs UK",
    description: "Shop ready-to-go gaming and workstation desktop PCs. Pre-built systems with the latest CPUs and GPUs, tested and ready for immediate use with UK warranty.",
    keywords: ["buy pre-built PC UK", "gaming PC UK", "desktop PC", "workstation PC"]
  },
  "software": {
    title: "Buy Software UK",
    description: "Shop operating systems, antivirus and productivity software. Windows licences, security suites and utility software for your PC.",
    keywords: ["buy software UK", "Windows licence UK", "antivirus software", "PC software"]
  },
  "optical-drives": {
    title: "Buy Optical Drives UK",
    description: "Shop DVD and Blu-ray internal and external drives. Read and write optical discs for data backup, media playback and software installation.",
    keywords: ["buy optical drive UK", "DVD drive", "Blu-ray drive", "external disc drive"]
  },
};

interface SeoData {
  title: string;
  description: string;
  canonical: string;
  ogType: string;
  jsonLd?: object;
  noscriptContent?: string;
}

export async function getSeoData(path: string): Promise<SeoData | null> {
  const productMatch = path.match(/^\/product\/([^/?#]+)/);
  if (productMatch) {
    const product = await storage.getProductBySlug(productMatch[1]);
    if (product) {
      const price = (product.price / 100).toFixed(2);
      const desc = product.description
        ? product.description.replace(/<[^>]*>/g, "").slice(0, 160)
        : `Buy ${product.name} from ${SITE_NAME}. Fast UK delivery, competitive prices.`;
      return {
        title: `${product.name} | Buy Online UK | ${SITE_NAME}`,
        description: desc,
        canonical: `${SITE_URL}/product/${product.slug}`,
        ogType: "product",
        jsonLd: {
          "@context": "https://schema.org",
          "@type": "Product",
          "name": product.name,
          "description": desc,
          "url": `${SITE_URL}/product/${product.slug}`,
          "image": product.image || `${SITE_URL}/og-banner.png`,
          "brand": product.brand ? { "@type": "Brand", "name": product.brand } : undefined,
          "sku": product.sku || undefined,
          "offers": {
            "@type": "Offer",
            "url": `${SITE_URL}/product/${product.slug}`,
            "priceCurrency": "GBP",
            "price": price,
            "priceValidUntil": new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0],
            "availability": product.inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
            "seller": { "@type": "Organization", "name": SITE_NAME },
            "shippingDetails": {
              "@type": "OfferShippingDetails",
              "shippingRate": {
                "@type": "MonetaryAmount",
                "value": product.price >= 20000 ? "0.00" : "7.99",
                "currency": "GBP"
              },
              "deliveryTime": {
                "@type": "ShippingDeliveryTime",
                "handlingTime": { "@type": "QuantitativeValue", "minValue": 0, "maxValue": 1, "unitCode": "DAY" },
                "transitTime": { "@type": "QuantitativeValue", "minValue": 1, "maxValue": 3, "unitCode": "DAY" }
              },
              "shippingDestination": { "@type": "DefinedRegion", "addressCountry": "GB" }
            }
          }
        },
        noscriptContent: `<h1>${escHtml(product.name)}</h1><p>${escHtml(desc)}</p><p>Price: £${price} inc. VAT</p><p>${product.inStock ? "In Stock" : "Out of Stock"}</p><p><a href="${SITE_URL}/product/${product.slug}">View product</a></p>`,
      };
    }
  }

  const catMatch = path.match(/^\/category\/([^/?#]+)/);
  if (catMatch) {
    const cat = await storage.getCategoryBySlug(catMatch[1]);
    if (cat) {
      const products = await storage.getProductsByCategory(cat.id);
      const inStock = products.filter(p => p.inStock);
      const catSeo = CATEGORY_SEO[cat.slug];
      const desc = catSeo?.description || cat.description || `Browse ${cat.name} at ${SITE_NAME}. ${inStock.length} products in stock with fast UK delivery.`;
      const seoTitle = catSeo?.title || `Buy ${cat.name} Online UK`;
      const brands = [...new Set(inStock.map(p => p.vendor).filter(Boolean))].slice(0, 8);
      return {
        title: `${seoTitle} | ${SITE_NAME}`,
        description: `${desc.slice(0, 130)} ${inStock.length} in stock. Free UK delivery over £200.`,
        canonical: `${SITE_URL}/category/${cat.slug}`,
        ogType: "website",
        jsonLd: {
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          "name": cat.name,
          "description": desc,
          "url": `${SITE_URL}/category/${cat.slug}`,
          "numberOfItems": inStock.length,
          "provider": { "@type": "Organization", "name": SITE_NAME }
        },
        noscriptContent: `<h1>${escHtml(seoTitle)} - ${escHtml(SITE_NAME)}</h1><p>${escHtml(desc)}</p>${brands.length > 0 ? `<h2>Brands</h2><p>${brands.map(b => escHtml(b!)).join(", ")}</p>` : ""}<h2>${escHtml(cat.name)} Products (${inStock.length} in stock)</h2><ul>${inStock.slice(0, 30).map(p => `<li><a href="${SITE_URL}/product/${p.slug}">${escHtml(p.name)} - £${(p.price / 100).toFixed(2)}</a></li>`).join("")}</ul><p>Fast 1-3 day UK delivery. Free shipping on orders over £200. All prices include VAT. <a href="${SITE_URL}">Back to all categories</a></p>`,
      };
    }
  }

  const blogPostMatch = path.match(/^\/blog\/([^/?#]+)/);
  if (blogPostMatch) {
    const post = await storage.getBlogPostBySlug(blogPostMatch[1]);
    if (post && post.published) {
      const desc = post.excerpt || post.content.replace(/<[^>]*>/g, "").slice(0, 160);
      return {
        title: `${post.title} | ${SITE_NAME} Blog`,
        description: desc,
        canonical: `${SITE_URL}/blog/${post.slug}`,
        ogType: "article",
        jsonLd: {
          "@context": "https://schema.org",
          "@type": "BlogPosting",
          "headline": post.title,
          "description": desc,
          "url": `${SITE_URL}/blog/${post.slug}`,
          "datePublished": post.createdAt,
          "dateModified": post.updatedAt || post.createdAt,
          "author": { "@type": "Organization", "name": SITE_NAME },
          "publisher": { "@type": "Organization", "name": SITE_NAME, "logo": { "@type": "ImageObject", "url": `${SITE_URL}/favicon.png` } },
          "image": post.coverImage || `${SITE_URL}/og-banner.png`,
        },
        noscriptContent: `<h1>${escHtml(post.title)}</h1><p>${escHtml(desc)}</p>`,
      };
    }
  }

  if (path === "/blog" || path === "/blog/") {
    return {
      title: `Tech Blog | PC Hardware News & Guides | ${SITE_NAME}`,
      description: "Read the latest PC hardware news, buying guides, and tech tips from Thorn Tech Solutions Ltd.",
      canonical: `${SITE_URL}/blog`,
      ogType: "website",
    };
  }

  if (path === "/reviews" || path === "/reviews/") {
    return {
      title: `Customer Reviews | ${SITE_NAME}`,
      description: "Read customer reviews of Thorn Tech Solutions Ltd. See what UK buyers say about our PC components, delivery speed, and customer service.",
      canonical: `${SITE_URL}/reviews`,
      ogType: "website",
    };
  }

  if (path === "/contact" || path === "/contact/") {
    return {
      title: `Contact Us | ${SITE_NAME}`,
      description: "Get in touch with Thorn Tech Solutions Ltd. Email thorntech@hotmail.com or call 07868 552028. Based in Sutton Bridge, Lincolnshire.",
      canonical: `${SITE_URL}/contact`,
      ogType: "website",
    };
  }

  if (path === "/about" || path === "/about/") {
    return {
      title: `About Us | ${SITE_NAME}`,
      description: "Learn about Thorn Tech Solutions Ltd, a UK-based PC components retailer. Company Reg: 17058756. Based in Sutton Bridge, Lincolnshire.",
      canonical: `${SITE_URL}/about`,
      ogType: "website",
      noscriptContent: `<h1>About Thorn Tech Solutions Ltd</h1><p>Thorn Tech Solutions Ltd is a UK-based PC components retailer (Company Reg: 17058756) based in Sutton Bridge, Lincolnshire. We sell CPUs, graphics cards, motherboards, RAM, SSDs, cases, PSUs, cooling, and peripherals from top brands. Contact us at thorntech@hotmail.com or call 07868 552028.</p>`,
    };
  }

  if (path === "/returns" || path === "/returns/") {
    return {
      title: `Returns Policy | ${SITE_NAME}`,
      description: "Our returns policy at Thorn Tech Solutions Ltd. 30-day returns on all PC components. UK consumer rights protected.",
      canonical: `${SITE_URL}/returns`,
      ogType: "website",
    };
  }

  if (path === "/privacy" || path === "/privacy/") {
    return {
      title: `Privacy Policy | ${SITE_NAME}`,
      description: "Privacy policy for Thorn Tech Solutions Ltd. How we handle your data when shopping for PC components online.",
      canonical: `${SITE_URL}/privacy`,
      ogType: "website",
    };
  }

  if (path === "/basket" || path === "/basket/") {
    return {
      title: `Shopping Basket | ${SITE_NAME}`,
      description: "Your shopping basket at Thorn Tech Solutions Ltd. Review your PC components before checkout.",
      canonical: `${SITE_URL}/basket`,
      ogType: "website",
    };
  }

  if (path === "/" || path === "") {
    const [products, categories] = await Promise.all([storage.getProducts(), storage.getCategories()]);
    const inStock = products.filter(p => p.inStock && p.price > 0 && p.slug !== "test-product-do-not-buy");
    const catLinks = categories.map(c => `<li><a href="${SITE_URL}/category/${c.slug}">${escHtml(c.name)}</a></li>`).join("");
    const prodLinks = inStock.slice(0, 30).map(p => `<li><a href="${SITE_URL}/product/${p.slug}">${escHtml(p.name)} - £${(p.price / 100).toFixed(2)}</a></li>`).join("");
    return {
      title: `Buy PC Components Online UK | ${SITE_NAME}`,
      description: `Buy PC components online from ${SITE_NAME}. ${inStock.length}+ products in stock: CPUs, graphics cards, motherboards, RAM, SSDs, gaming PC parts. Fast 1-3 day UK delivery, free shipping over £200.`,
      canonical: SITE_URL,
      ogType: "website",
      jsonLd: {
        "@context": "https://schema.org",
        "@type": "WebSite",
        "url": SITE_URL,
        "name": SITE_NAME,
        "potentialAction": {
          "@type": "SearchAction",
          "target": `${SITE_URL}/search?q={search_term_string}`,
          "query-input": "required name=search_term_string"
        }
      },
      noscriptContent: `<h1>Buy PC Components Online UK - ${escHtml(SITE_NAME)}</h1><p>Shop ${inStock.length}+ PC components from trusted brands. Fast 1-3 day UK delivery, free over £200. All prices include VAT.</p><h2>Categories</h2><ul>${catLinks}</ul><h2>Popular Products</h2><ul>${prodLinks}</ul><p>Contact: thorntech@hotmail.com | 07868 552028 | Sutton Bridge, Lincolnshire | Company Reg: 17058756</p>`,
    };
  }

  return null;
}

export function injectSeoIntoHtml(html: string, seo: SeoData): string {
  html = html.replace(
    /<title>[^<]*<\/title>/,
    `<title>${escHtml(seo.title)}</title>`
  );

  html = html.replace(
    /<meta name="description" content="[^"]*" \/>/,
    `<meta name="description" content="${escHtml(seo.description)}" />`
  );

  html = html.replace(
    /<link rel="canonical" href="[^"]*" \/>/,
    `<link rel="canonical" href="${seo.canonical}" />`
  );

  html = html.replace(
    /<meta property="og:title" content="[^"]*" \/>/,
    `<meta property="og:title" content="${escHtml(seo.title)}" />`
  );
  html = html.replace(
    /<meta property="og:description" content="[^"]*" \/>/,
    `<meta property="og:description" content="${escHtml(seo.description)}" />`
  );
  html = html.replace(
    /<meta property="og:url" content="[^"]*" \/>/,
    `<meta property="og:url" content="${seo.canonical}" />`
  );
  html = html.replace(
    /<meta property="og:type" content="[^"]*" \/>/,
    `<meta property="og:type" content="${seo.ogType}" />`
  );
  html = html.replace(
    /<meta name="twitter:title" content="[^"]*" \/>/,
    `<meta name="twitter:title" content="${escHtml(seo.title)}" />`
  );
  html = html.replace(
    /<meta name="twitter:description" content="[^"]*" \/>/,
    `<meta name="twitter:description" content="${escHtml(seo.description)}" />`
  );

  let extraHead = "";
  if (seo.jsonLd) {
    extraHead += `\n    <script type="application/ld+json">${JSON.stringify(seo.jsonLd)}</script>`;
  }

  if (extraHead) {
    html = html.replace("</head>", `${extraHead}\n  </head>`);
  }

  if (seo.noscriptContent) {
    html = html.replace(
      '<div id="root"></div>',
      `<div id="root"></div>\n    <noscript><div style="max-width:800px;margin:0 auto;padding:40px 20px;font-family:sans-serif;">${seo.noscriptContent}<p><a href="${SITE_URL}">Thorn Tech Solutions Ltd</a> — Buy PC Components Online UK</p></div></noscript>`
    );
  }

  return html;
}
