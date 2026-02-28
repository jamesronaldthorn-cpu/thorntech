import { storage } from "./storage";

export async function parseFeedXml(xml: string): Promise<any[]> {
  const { XMLParser } = await import("fast-xml-parser");
  const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_" });
  const parsed = parser.parse(xml);

  const items: any[] = [];

  const rss = parsed?.rss?.channel?.item;
  if (rss) {
    const arr = Array.isArray(rss) ? rss : [rss];
    arr.forEach((item: any) => {
      items.push({
        name: item.title || item["g:title"] || "Untitled",
        description: item.description || item["g:description"] || "",
        price: parseFloat(item["g:price"]?.replace(/[^0-9.]/g, "") || item["g:sale_price"]?.replace(/[^0-9.]/g, "") || "0"),
        image: item["g:image_link"] || item.enclosure?.["@_url"] || null,
        vendor: item["g:brand"] || null,
        inStock: item["g:availability"] !== "out of stock" && item["g:availability"] !== "out_of_stock",
        compareAtPrice: item["g:sale_price"] && item["g:price"] ? parseFloat(item["g:price"].replace(/[^0-9.]/g, "")) : null,
      });
    });
  }

  const feed = parsed?.feed?.entry;
  if (feed) {
    const arr = Array.isArray(feed) ? feed : [feed];
    arr.forEach((item: any) => {
      items.push({
        name: item.title?.["#text"] || item.title || "Untitled",
        description: item.summary?.["#text"] || item.summary || item.content?.["#text"] || "",
        price: 0,
        image: null,
        vendor: null,
        inStock: true,
      });
    });
  }

  if (items.length === 0) {
    const products = parsed?.products?.product || parsed?.catalog?.product;
    if (products) {
      const arr = Array.isArray(products) ? products : [products];
      arr.forEach((item: any) => {
        items.push({
          name: item.name || item.title || "Untitled",
          description: item.description || "",
          price: parseFloat(item.price || "0"),
          image: item.image || item.image_url || item.image_link || null,
          vendor: item.brand || item.vendor || null,
          inStock: item.availability !== "out of stock" && item.in_stock !== "false",
          compareAtPrice: item.compare_at_price ? parseFloat(item.compare_at_price) : null,
        });
      });
    }
  }

  return items;
}

export async function importProducts(items: any[], categoryId: number | null): Promise<{ imported: number; skipped: number; products: any[]; skippedNames: string[] }> {
  const created: any[] = [];
  const skipped: string[] = [];
  const existingProducts = await storage.getProducts();
  const existingSlugs = new Set(existingProducts.map(p => p.slug));

  for (const item of items) {
    if (item.price <= 0 && !item.name) continue;
    const slug = item.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/-+$/, "").substring(0, 80);
    if (existingSlugs.has(slug)) {
      skipped.push(item.name);
      continue;
    }
    existingSlugs.add(slug);
    try {
      const product = await storage.createProduct({
        name: item.name,
        slug,
        description: item.description || null,
        price: item.price || 0,
        compareAtPrice: item.compareAtPrice || null,
        categoryId,
        image: item.image || null,
        badge: null,
        inStock: item.inStock !== false,
        vendor: item.vendor || null,
        stripeProductId: null,
        stripePriceId: null,
      });
      created.push({ id: product.id, name: product.name });
    } catch (e: any) {
      skipped.push(`${item.name}: ${e.message}`);
    }
  }

  return { imported: created.length, skipped: skipped.length, products: created, skippedNames: skipped };
}

export async function importFromUrl(url: string, categoryId: number | null) {
  const feedRes = await fetch(url);
  if (!feedRes.ok) throw new Error(`Failed to fetch feed: ${feedRes.status}`);
  const xml = await feedRes.text();
  const items = await parseFeedXml(xml);
  if (items.length === 0) throw new Error("No products found in feed");
  return importProducts(items, categoryId);
}

let schedulerInterval: ReturnType<typeof setInterval> | null = null;

export function startFeedScheduler() {
  if (schedulerInterval) return;

  console.log("[Feed Scheduler] Started — checking every 5 minutes for feeds due for import");

  schedulerInterval = setInterval(async () => {
    try {
      const sources = await storage.getFeedSources();
      const now = new Date();

      for (const source of sources) {
        if (!source.enabled) continue;

        const lastImport = source.lastImportAt ? new Date(source.lastImportAt) : null;
        const intervalMs = source.intervalHours * 60 * 60 * 1000;
        const isDue = !lastImport || (now.getTime() - lastImport.getTime() >= intervalMs);

        if (!isDue) continue;

        console.log(`[Feed Scheduler] Importing from: ${source.name} (${source.url})`);

        try {
          const result = await importFromUrl(source.url, source.categoryId);
          await storage.updateFeedSource(source.id, {
            lastImportAt: now,
            lastImportCount: result.imported,
            lastError: null,
          });
          console.log(`[Feed Scheduler] ${source.name}: imported ${result.imported}, skipped ${result.skipped}`);
        } catch (e: any) {
          await storage.updateFeedSource(source.id, {
            lastImportAt: now,
            lastImportCount: 0,
            lastError: e.message,
          });
          console.error(`[Feed Scheduler] ${source.name} error: ${e.message}`);
        }
      }
    } catch (e: any) {
      console.error("[Feed Scheduler] Error:", e.message);
    }
  }, 5 * 60 * 1000);
}
