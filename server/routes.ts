import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import type { Product, Category } from "@shared/schema";

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function buildSiteUrl(req: any): string {
  const proto = req.headers["x-forwarded-proto"] || req.protocol || "https";
  const host = req.headers["x-forwarded-host"] || req.headers.host;
  return `${proto}://${host}`;
}

function generateGoogleShoppingFeed(products: Product[], categories: Category[], siteUrl: string): string {
  const catMap = new Map(categories.map(c => [c.id, c]));
  const items = products.map(p => {
    const cat = catMap.get(p.categoryId ?? 0);
    const productUrl = `${siteUrl}/product/${p.slug}`;
    const imageUrl = p.image || `${siteUrl}/placeholder-product.png`;
    return `    <item>
      <g:id>${p.id}</g:id>
      <title>${escapeXml(p.name)}</title>
      <description>${escapeXml(p.description || p.name)}</description>
      <link>${escapeXml(productUrl)}</link>
      <g:image_link>${escapeXml(imageUrl)}</g:image_link>
      <g:price>${p.price.toFixed(2)} GBP</g:price>${p.compareAtPrice ? `\n      <g:sale_price>${p.price.toFixed(2)} GBP</g:sale_price>` : ""}
      <g:availability>${p.inStock ? "in_stock" : "out_of_stock"}</g:availability>
      <g:condition>new</g:condition>
      <g:brand>${escapeXml(p.vendor || "Thorn Tech Solutions")}</g:brand>
      <g:product_type>${escapeXml(cat?.name || "PC Components")}</g:product_type>
      <g:identifier_exists>false</g:identifier_exists>
      <g:shipping>
        <g:country>GB</g:country>
        <g:price>0.00 GBP</g:price>
      </g:shipping>
    </item>`;
  });

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <title>Thorn Tech Solutions Ltd - PC Components</title>
    <link>${siteUrl}</link>
    <description>Premium PC components, accessories and peripherals from Thorn Tech Solutions Ltd</description>
${items.join("\n")}
  </channel>
</rss>`;
}

function generateFacebookFeed(products: Product[], categories: Category[], siteUrl: string): string {
  const catMap = new Map(categories.map(c => [c.id, c]));
  const items = products.map(p => {
    const cat = catMap.get(p.categoryId ?? 0);
    const productUrl = `${siteUrl}/product/${p.slug}`;
    const imageUrl = p.image || `${siteUrl}/placeholder-product.png`;
    return `    <item>
      <id>${p.id}</id>
      <title>${escapeXml(p.name)}</title>
      <description>${escapeXml(p.description || p.name)}</description>
      <availability>${p.inStock ? "in stock" : "out of stock"}</availability>
      <condition>new</condition>
      <price>${p.price.toFixed(2)} GBP</price>${p.compareAtPrice ? `\n      <sale_price>${p.price.toFixed(2)} GBP</sale_price>` : ""}
      <link>${escapeXml(productUrl)}</link>
      <image_link>${escapeXml(imageUrl)}</image_link>
      <brand>${escapeXml(p.vendor || "Thorn Tech Solutions")}</brand>
      <product_type>${escapeXml(cat?.name || "PC Components")}</product_type>
    </item>`;
  });

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Thorn Tech Solutions Ltd</title>
    <link>${siteUrl}</link>
    <description>Premium PC Components &amp; Accessories</description>
${items.join("\n")}
  </channel>
</rss>`;
}

function generateGenericProductFeed(products: Product[], categories: Category[], siteUrl: string): string {
  const catMap = new Map(categories.map(c => [c.id, c]));
  const items = products.map(p => {
    const cat = catMap.get(p.categoryId ?? 0);
    const productUrl = `${siteUrl}/product/${p.slug}`;
    return `  <product>
    <id>${p.id}</id>
    <name>${escapeXml(p.name)}</name>
    <slug>${escapeXml(p.slug)}</slug>
    <description>${escapeXml(p.description || "")}</description>
    <price currency="GBP">${p.price.toFixed(2)}</price>${p.compareAtPrice ? `\n    <compare_at_price currency="GBP">${p.compareAtPrice.toFixed(2)}</compare_at_price>` : ""}
    <url>${escapeXml(productUrl)}</url>
    <category>${escapeXml(cat?.name || "")}</category>
    <vendor>${escapeXml(p.vendor || "")}</vendor>
    <in_stock>${p.inStock}</in_stock>${p.badge ? `\n    <badge>${escapeXml(p.badge)}</badge>` : ""}
  </product>`;
  });

  return `<?xml version="1.0" encoding="UTF-8"?>
<products store="Thorn Tech Solutions Ltd" url="${siteUrl}" currency="GBP" generated="${new Date().toISOString()}">
${items.join("\n")}
</products>`;
}

function generateSitemapXml(products: Product[], categories: Category[], siteUrl: string): string {
  const now = new Date().toISOString().split("T")[0];
  const urls = [
    `  <url><loc>${siteUrl}/</loc><changefreq>daily</changefreq><priority>1.0</priority><lastmod>${now}</lastmod></url>`,
    ...categories.map(c => `  <url><loc>${siteUrl}/category/${c.slug}</loc><changefreq>daily</changefreq><priority>0.8</priority><lastmod>${now}</lastmod></url>`),
    ...products.map(p => `  <url><loc>${siteUrl}/product/${p.slug}</loc><changefreq>weekly</changefreq><priority>0.6</priority><lastmod>${now}</lastmod></url>`),
  ];

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join("\n")}
</urlset>`;
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  app.get("/api/categories", async (_req, res) => {
    const cats = await storage.getCategories();
    res.json(cats);
  });

  app.get("/api/categories/:slug", async (req, res) => {
    const cat = await storage.getCategoryBySlug(req.params.slug);
    if (!cat) return res.status(404).json({ error: "Category not found" });
    res.json(cat);
  });

  app.get("/api/categories/:slug/products", async (req, res) => {
    const cat = await storage.getCategoryBySlug(req.params.slug);
    if (!cat) return res.status(404).json({ error: "Category not found" });
    const prods = await storage.getProductsByCategory(cat.id);
    res.json(prods);
  });

  app.get("/api/products", async (_req, res) => {
    const prods = await storage.getProducts();
    res.json(prods);
  });

  app.get("/api/products/:slug", async (req, res) => {
    const product = await storage.getProductBySlug(req.params.slug);
    if (!product) return res.status(404).json({ error: "Product not found" });
    res.json(product);
  });

  app.get("/feeds/google-shopping.xml", async (req, res) => {
    const [prods, cats] = await Promise.all([storage.getProducts(), storage.getCategories()]);
    const siteUrl = buildSiteUrl(req);
    res.set("Content-Type", "application/xml; charset=utf-8");
    res.send(generateGoogleShoppingFeed(prods, cats, siteUrl));
  });

  app.get("/feeds/facebook.xml", async (req, res) => {
    const [prods, cats] = await Promise.all([storage.getProducts(), storage.getCategories()]);
    const siteUrl = buildSiteUrl(req);
    res.set("Content-Type", "application/xml; charset=utf-8");
    res.send(generateFacebookFeed(prods, cats, siteUrl));
  });

  app.get("/feeds/products.xml", async (req, res) => {
    const [prods, cats] = await Promise.all([storage.getProducts(), storage.getCategories()]);
    const siteUrl = buildSiteUrl(req);
    res.set("Content-Type", "application/xml; charset=utf-8");
    res.send(generateGenericProductFeed(prods, cats, siteUrl));
  });

  app.get("/sitemap.xml", async (req, res) => {
    const [prods, cats] = await Promise.all([storage.getProducts(), storage.getCategories()]);
    const siteUrl = buildSiteUrl(req);
    res.set("Content-Type", "application/xml; charset=utf-8");
    res.send(generateSitemapXml(prods, cats, siteUrl));
  });

  app.get("/feeds", async (_req, res) => {
    res.json({
      feeds: {
        google_shopping: "/feeds/google-shopping.xml",
        facebook_meta: "/feeds/facebook.xml",
        generic_products: "/feeds/products.xml",
        sitemap: "/sitemap.xml",
      },
      description: "XML product feeds for Thorn Tech Solutions Ltd. All feeds are dynamically generated from the product database.",
    });
  });

  return httpServer;
}
