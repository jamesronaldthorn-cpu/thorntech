import { storage } from "./storage";

const SITE_URL = "https://thorntechsolutionsltd.com";
const SITE_NAME = "Thorn Tech Solutions Ltd";

function escHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

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
      const desc = cat.description || `Browse ${cat.name} at ${SITE_NAME}. ${inStock.length} products in stock with fast UK delivery.`;
      return {
        title: `${cat.name} | Buy Online UK | ${SITE_NAME}`,
        description: desc.slice(0, 160),
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
        noscriptContent: `<h1>${escHtml(cat.name)}</h1><p>${escHtml(desc)}</p><ul>${inStock.slice(0, 20).map(p => `<li><a href="${SITE_URL}/product/${p.slug}">${escHtml(p.name)} - £${(p.price / 100).toFixed(2)}</a></li>`).join("")}</ul>`,
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
