import { eq, sql, gte, desc, count, and, or, ilike, notIlike, ne } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { users, categories, products, orders, customFeeds, feedSources, pageViews, basketEvents, blogPosts, customerReviews, type User, type InsertUser, type Category, type InsertCategory, type Product, type InsertProduct, type Order, type InsertOrder, type CustomFeed, type InsertCustomFeed, type FeedSource, type InsertFeedSource, type BlogPost, type InsertBlogPost, type CustomerReview, type InsertCustomerReview } from "@shared/schema";

export interface IStorage {
  createUser(user: InsertUser): Promise<User>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUser(id: number): Promise<User | undefined>;
  getUsers(): Promise<User[]>;
  updateUser(id: number, data: Partial<InsertUser>): Promise<User | undefined>;
  deleteUser(id: number): Promise<boolean>;
  getCategories(): Promise<Category[]>;
  getCategoryBySlug(slug: string): Promise<Category | undefined>;
  createCategory(cat: InsertCategory): Promise<Category>;
  updateCategory(id: number, cat: Partial<InsertCategory>): Promise<Category | undefined>;
  deleteCategory(id: number): Promise<boolean>;
  getProducts(): Promise<Product[]>;
  getAllProductsAdmin(): Promise<Product[]>;
  searchProducts(query: string): Promise<Product[]>;
  getProductsByCategory(categoryId: number): Promise<Product[]>;
  getProductBySlug(slug: string): Promise<Product | undefined>;
  getProduct(id: number): Promise<Product | undefined>;
  createProduct(product: InsertProduct): Promise<Product>;
  updateProduct(id: number, product: Partial<InsertProduct>): Promise<Product | undefined>;
  deleteProduct(id: number): Promise<boolean>;
  createOrder(order: InsertOrder): Promise<Order>;
  getOrder(id: number): Promise<Order | undefined>;
  getOrders(): Promise<Order[]>;
  getOrdersByUserId(userId: number): Promise<Order[]>;
  getOrderByPaymentId(paymentId: string): Promise<Order | undefined>;
  updateOrderStatus(id: number, status: string, paymentId?: string): Promise<Order | undefined>;
  getCustomFeeds(): Promise<CustomFeed[]>;
  getCustomFeedBySlug(slug: string): Promise<CustomFeed | undefined>;
  createCustomFeed(feed: InsertCustomFeed): Promise<CustomFeed>;
  updateCustomFeed(id: number, feed: Partial<InsertCustomFeed>): Promise<CustomFeed | undefined>;
  deleteCustomFeed(id: number): Promise<boolean>;
  getFeedSources(): Promise<FeedSource[]>;
  createFeedSource(source: InsertFeedSource): Promise<FeedSource>;
  updateFeedSource(id: number, source: Partial<InsertFeedSource & { lastImportAt: Date; lastImportCount: number; lastError: string | null }>): Promise<FeedSource | undefined>;
  deleteFeedSource(id: number): Promise<boolean>;
  getBlogPosts(publishedOnly?: boolean): Promise<BlogPost[]>;
  getBlogPostBySlug(slug: string): Promise<BlogPost | undefined>;
  getBlogPost(id: number): Promise<BlogPost | undefined>;
  createBlogPost(post: InsertBlogPost): Promise<BlogPost>;
  updateBlogPost(id: number, post: Partial<InsertBlogPost>): Promise<BlogPost | undefined>;
  deleteBlogPost(id: number): Promise<boolean>;
  recordPageView(path: string, ip?: string, userAgent?: string, referrer?: string): Promise<void>;
  getPageViewStats(): Promise<{ today: number; week: number; month: number; total: number; topPages: { path: string; views: number }[]; recentDays: { date: string; views: number }[] }>;
  recordBasketEvent(productId: number, productName: string, productPrice: number, quantity: number, ip?: string, userAgent?: string): Promise<void>;
  getBasketEvents(limit?: number): Promise<{ id: number; productId: number; productName: string; productPrice: number; quantity: number; ip: string | null; createdAt: Date | null }[]>;
  getBasketStats(): Promise<{ today: number; week: number; total: number; topProducts: { productName: string; count: number }[]; recentEvents: { id: number; productName: string; productPrice: number; quantity: number; createdAt: Date | null; ip: string | null }[] }>;
  getReviews(approvedOnly?: boolean): Promise<CustomerReview[]>;
  createReview(review: InsertCustomerReview): Promise<CustomerReview>;
  approveReview(id: number): Promise<CustomerReview | undefined>;
  deleteReview(id: number): Promise<boolean>;
  fixRamCategories(): Promise<{ fixed: number; details: string[] }>;
  getSuspiciousPrices(): Promise<{ id: number; name: string; price: number; costPrice: number; source: string | null; issue: string }[]>;
}

export class DatabaseStorage implements IStorage {
  private db = drizzle(process.env.DATABASE_URL!);

  async createUser(user: InsertUser): Promise<User> {
    const [created] = await this.db.insert(users).values(user).returning();
    return created;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await this.db.select().from(users).where(eq(users.email, email.toLowerCase()));
    return user;
  }

  async getUser(id: number): Promise<User | undefined> {
    const [user] = await this.db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUsers(): Promise<User[]> {
    return this.db.select().from(users);
  }

  async updateUser(id: number, data: Partial<InsertUser>): Promise<User | undefined> {
    const [updated] = await this.db.update(users).set(data).where(eq(users.id, id)).returning();
    return updated;
  }

  async deleteUser(id: number): Promise<boolean> {
    const result = await this.db.delete(users).where(eq(users.id, id)).returning();
    return result.length > 0;
  }

  async getCategories(): Promise<Category[]> {
    return this.db.select().from(categories);
  }

  async getCategoryBySlug(slug: string): Promise<Category | undefined> {
    const [cat] = await this.db.select().from(categories).where(eq(categories.slug, slug));
    return cat;
  }

  async createCategory(cat: InsertCategory): Promise<Category> {
    const [created] = await this.db.insert(categories).values(cat).returning();
    return created;
  }

  async getProducts(): Promise<Product[]> {
    return this.db.select().from(products).where(
      and(
        sql`NOT (LOWER(${products.name}) LIKE '%test product%' AND ${products.price} < 1)`,
        sql`${products.price} <= 1400`
      )
    );
  }

  async getAllProductsAdmin(): Promise<Product[]> {
    return this.db.select().from(products).where(
      sql`NOT (LOWER(${products.name}) LIKE '%test product%' AND ${products.price} < 1)`
    );
  }

  async searchProducts(query: string): Promise<Product[]> {
    const words = query.toLowerCase().split(/\s+/).filter(w => w.length > 1);
    if (words.length === 0) return [];
    const conditions = words.map(word => {
      const term = `%${word}%`;
      return sql`(LOWER(${products.name}) LIKE ${term} OR LOWER(${products.description}) LIKE ${term} OR LOWER(${products.vendor}) LIKE ${term} OR LOWER(${products.mpn}) LIKE ${term})`;
    });
    let combined = conditions[0];
    for (let i = 1; i < conditions.length; i++) {
      combined = sql`${combined} AND ${conditions[i]}`;
    }
    const testFilter = sql`NOT (LOWER(${products.name}) LIKE '%test product%' AND ${products.price} < 1)`;
    return this.db.select().from(products).where(
      sql`${combined} AND ${testFilter} AND ${products.price} <= 1400`
    ).limit(50);
  }

  async getProductsByCategory(categoryId: number): Promise<Product[]> {
    return this.db.select().from(products).where(
      and(
        eq(products.categoryId, categoryId),
        sql`NOT (LOWER(${products.name}) LIKE '%test product%' AND ${products.price} < 1)`,
        sql`${products.price} <= 1400`
      )
    );
  }

  async getProductBySlug(slug: string): Promise<Product | undefined> {
    const [product] = await this.db.select().from(products).where(eq(products.slug, slug));
    return product;
  }

  async getProduct(id: number): Promise<Product | undefined> {
    const [product] = await this.db.select().from(products).where(eq(products.id, id));
    return product;
  }

  async createProduct(product: InsertProduct): Promise<Product> {
    const [created] = await this.db.insert(products).values(product).returning();
    return created;
  }

  async updateProduct(id: number, product: Partial<InsertProduct>): Promise<Product | undefined> {
    const [updated] = await this.db.update(products).set(product).where(eq(products.id, id)).returning();
    return updated;
  }

  async deleteProduct(id: number): Promise<boolean> {
    const result = await this.db.delete(products).where(eq(products.id, id)).returning();
    return result.length > 0;
  }

  async updateCategory(id: number, cat: Partial<InsertCategory>): Promise<Category | undefined> {
    const [updated] = await this.db.update(categories).set(cat).where(eq(categories.id, id)).returning();
    return updated;
  }

  async deleteCategory(id: number): Promise<boolean> {
    const result = await this.db.delete(categories).where(eq(categories.id, id)).returning();
    return result.length > 0;
  }

  async createOrder(order: InsertOrder): Promise<Order> {
    const [created] = await this.db.insert(orders).values(order).returning();
    return created;
  }

  async getOrder(id: number): Promise<Order | undefined> {
    const [order] = await this.db.select().from(orders).where(eq(orders.id, id));
    return order;
  }

  async getOrders(): Promise<Order[]> {
    return this.db.select().from(orders);
  }

  async getOrdersByUserId(userId: number): Promise<Order[]> {
    return this.db.select().from(orders).where(eq(orders.userId, userId));
  }

  async getOrderByPaymentId(paymentId: string): Promise<Order | undefined> {
    const [order] = await this.db.select().from(orders).where(eq(orders.paymentId, paymentId));
    return order;
  }

  async updateOrderStatus(id: number, status: string, paymentId?: string): Promise<Order | undefined> {
    const updates: any = { status };
    if (paymentId) updates.paymentId = paymentId;
    const [updated] = await this.db.update(orders).set(updates).where(eq(orders.id, id)).returning();
    return updated;
  }

  async getCustomFeeds(): Promise<CustomFeed[]> {
    return this.db.select().from(customFeeds);
  }

  async getCustomFeedBySlug(slug: string): Promise<CustomFeed | undefined> {
    const [feed] = await this.db.select().from(customFeeds).where(eq(customFeeds.slug, slug));
    return feed;
  }

  async createCustomFeed(feed: InsertCustomFeed): Promise<CustomFeed> {
    const [created] = await this.db.insert(customFeeds).values(feed).returning();
    return created;
  }

  async updateCustomFeed(id: number, feed: Partial<InsertCustomFeed>): Promise<CustomFeed | undefined> {
    const [updated] = await this.db.update(customFeeds).set({ ...feed, updatedAt: new Date() }).where(eq(customFeeds.id, id)).returning();
    return updated;
  }

  async deleteCustomFeed(id: number): Promise<boolean> {
    const result = await this.db.delete(customFeeds).where(eq(customFeeds.id, id)).returning();
    return result.length > 0;
  }

  async getFeedSources(): Promise<FeedSource[]> {
    return this.db.select().from(feedSources);
  }

  async createFeedSource(source: InsertFeedSource): Promise<FeedSource> {
    const [created] = await this.db.insert(feedSources).values(source).returning();
    return created;
  }

  async updateFeedSource(id: number, source: Partial<InsertFeedSource & { lastImportAt: Date; lastImportCount: number; lastError: string | null }>): Promise<FeedSource | undefined> {
    const [updated] = await this.db.update(feedSources).set(source).where(eq(feedSources.id, id)).returning();
    return updated;
  }

  async deleteFeedSource(id: number): Promise<boolean> {
    const result = await this.db.delete(feedSources).where(eq(feedSources.id, id)).returning();
    return result.length > 0;
  }

  async getBlogPosts(publishedOnly = false): Promise<BlogPost[]> {
    if (publishedOnly) {
      return this.db.select().from(blogPosts).where(eq(blogPosts.published, true)).orderBy(desc(blogPosts.createdAt));
    }
    return this.db.select().from(blogPosts).orderBy(desc(blogPosts.createdAt));
  }

  async getBlogPostBySlug(slug: string): Promise<BlogPost | undefined> {
    const [post] = await this.db.select().from(blogPosts).where(eq(blogPosts.slug, slug));
    return post;
  }

  async getBlogPost(id: number): Promise<BlogPost | undefined> {
    const [post] = await this.db.select().from(blogPosts).where(eq(blogPosts.id, id));
    return post;
  }

  async createBlogPost(post: InsertBlogPost): Promise<BlogPost> {
    const [created] = await this.db.insert(blogPosts).values(post).returning();
    return created;
  }

  async updateBlogPost(id: number, post: Partial<InsertBlogPost>): Promise<BlogPost | undefined> {
    const [updated] = await this.db.update(blogPosts).set({ ...post, updatedAt: new Date() }).where(eq(blogPosts.id, id)).returning();
    return updated;
  }

  async deleteBlogPost(id: number): Promise<boolean> {
    const result = await this.db.delete(blogPosts).where(eq(blogPosts.id, id)).returning();
    return result.length > 0;
  }

  async recordPageView(path: string, ip?: string, userAgent?: string, referrer?: string): Promise<void> {
    await this.db.insert(pageViews).values({ path, ip: ip || null, userAgent: userAgent || null, referrer: referrer || null });
  }

  async getPageViewStats(): Promise<{ today: number; week: number; month: number; total: number; topPages: { path: string; views: number }[]; recentDays: { date: string; views: number }[] }> {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(todayStart.getTime() - 6 * 24 * 60 * 60 * 1000);
    const monthStart = new Date(todayStart.getTime() - 29 * 24 * 60 * 60 * 1000);

    const botFilter = sql`(${pageViews.userAgent} IS NULL OR NOT (${pageViews.userAgent} ~* 'bot[/\s;)]|crawl|spider|slurp|archiv|facebookexternalhit|twitterbot|whatsapp|telegrambot|discordbot|linkedinbot|pinterestbot|previewbot|wget|curl[\s/]|monitor[/\s]|checkly|scanbot|indexer|searchbot|feedfetcher|rssbot|scraper|seobot|ahrefs|semrush|majestic|moz\.com|yandex|baidu|bingbot|bingpreview|googlebot|google-inspectiontool|google-read-aloud|duckduckbot|yahoo.?slurp|sogou|exabot|ia_archiver|alexabot|mediapartners|adsbot|lighthouse|pagespeed|gtmetrix|pingdom|uptimerobot|statuscake|headlesschrome|phantomjs|python-requests|python-urllib|java/|perl\s|ruby|go-http-client|node-fetch|axios/|postman|insomnia|dataprovider|netcraft|wappalyzer|builtwith|zgrab|masscan|censys|shodan'))`;

    const [todayResult] = await this.db.select({ count: count() }).from(pageViews).where(and(gte(pageViews.createdAt, todayStart), botFilter));
    const [weekResult] = await this.db.select({ count: count() }).from(pageViews).where(and(gte(pageViews.createdAt, weekStart), botFilter));
    const [monthResult] = await this.db.select({ count: count() }).from(pageViews).where(and(gte(pageViews.createdAt, monthStart), botFilter));
    const [totalResult] = await this.db.select({ count: count() }).from(pageViews).where(botFilter);

    const topPages = await this.db
      .select({ path: pageViews.path, views: count() })
      .from(pageViews)
      .where(and(gte(pageViews.createdAt, monthStart), botFilter))
      .groupBy(pageViews.path)
      .orderBy(desc(count()))
      .limit(10);

    const recentDaysRaw = await this.db
      .select({
        date: sql<string>`TO_CHAR(${pageViews.createdAt}, 'YYYY-MM-DD')`,
        views: count(),
      })
      .from(pageViews)
      .where(and(gte(pageViews.createdAt, monthStart), botFilter))
      .groupBy(sql`TO_CHAR(${pageViews.createdAt}, 'YYYY-MM-DD')`)
      .orderBy(sql`TO_CHAR(${pageViews.createdAt}, 'YYYY-MM-DD')`);

    return {
      today: todayResult.count,
      week: weekResult.count,
      month: monthResult.count,
      total: totalResult.count,
      topPages: topPages.map(p => ({ path: p.path, views: Number(p.views) })),
      recentDays: recentDaysRaw.map(d => ({ date: d.date, views: Number(d.views) })),
    };
  }

  async recordBasketEvent(productId: number, productName: string, productPrice: number, quantity: number, ip?: string, userAgent?: string): Promise<void> {
    await this.db.insert(basketEvents).values({ productId, productName, productPrice, quantity, ip: ip || null, userAgent: userAgent || null });
  }

  async getBasketEvents(limit = 50): Promise<{ id: number; productId: number; productName: string; productPrice: number; quantity: number; ip: string | null; createdAt: Date | null }[]> {
    return await this.db.select().from(basketEvents).orderBy(desc(basketEvents.createdAt)).limit(limit);
  }

  async getBasketStats(): Promise<{ today: number; week: number; total: number; topProducts: { productName: string; count: number }[]; recentEvents: { id: number; productName: string; productPrice: number; quantity: number; createdAt: Date | null; ip: string | null }[] }> {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(todayStart.getTime() - 7 * 86400000);

    const [todayResult] = await this.db.select({ count: count() }).from(basketEvents).where(gte(basketEvents.createdAt, todayStart));
    const [weekResult] = await this.db.select({ count: count() }).from(basketEvents).where(gte(basketEvents.createdAt, weekStart));
    const [totalResult] = await this.db.select({ count: count() }).from(basketEvents);

    const topProducts = await this.db
      .select({ productName: basketEvents.productName, count: count() })
      .from(basketEvents)
      .where(gte(basketEvents.createdAt, weekStart))
      .groupBy(basketEvents.productName)
      .orderBy(desc(count()))
      .limit(10);

    const recentEvents = await this.db.select().from(basketEvents).orderBy(desc(basketEvents.createdAt)).limit(20);

    return {
      today: todayResult.count,
      week: weekResult.count,
      total: totalResult.count,
      topProducts: topProducts.map(p => ({ productName: p.productName, count: Number(p.count) })),
      recentEvents: recentEvents.map(e => ({ id: e.id, productName: e.productName, productPrice: e.productPrice, quantity: e.quantity, createdAt: e.createdAt, ip: e.ip })),
    };
  }
  async getReviews(approvedOnly = false): Promise<CustomerReview[]> {
    if (approvedOnly) {
      return this.db.select().from(customerReviews).where(eq(customerReviews.approved, true)).orderBy(desc(customerReviews.createdAt));
    }
    return this.db.select().from(customerReviews).orderBy(desc(customerReviews.createdAt));
  }

  async createReview(review: InsertCustomerReview): Promise<CustomerReview> {
    const [created] = await this.db.insert(customerReviews).values(review).returning();
    return created;
  }

  async approveReview(id: number): Promise<CustomerReview | undefined> {
    const [updated] = await this.db.update(customerReviews).set({ approved: true }).where(eq(customerReviews.id, id)).returning();
    return updated;
  }

  async deleteReview(id: number): Promise<boolean> {
    const result = await this.db.delete(customerReviews).where(eq(customerReviews.id, id)).returning();
    return result.length > 0;
  }

  async getSuspiciousPrices(): Promise<{ id: number; name: string; price: number; costPrice: number; source: string | null; issue: string }[]> {
    const all = await this.db.select({
      id: products.id,
      name: products.name,
      price: products.price,
      costPrice: products.costPrice,
      source: products.source,
    }).from(products).where(sql`${products.costPrice} > 0 AND ${products.inStock} = true`);

    const suspicious: { id: number; name: string; price: number; costPrice: number; source: string | null; issue: string }[] = [];

    for (const p of all) {
      const nameLower = p.name.toLowerCase();
      const cost = Number(p.costPrice) || 0;
      const price = Number(p.price) || 0;
      const issues: string[] = [];

      // Parse storage capacity — require whole number GB (not 2.5G or 5G networking)
      // Exclude GB that is followed by 'E' (GbE ethernet) or 'ps' (Gbps networking)
      const tbMatch = p.name.match(/\b(\d+)\s*TB\b/i);
      // Must be ≥ 16GB for standalone drives/RAM (avoids 5G WiFi etc.)
      const gbMatch = p.name.match(/\b(\d{2,})\s*GB\b(?!E)(?!ps)/i);
      const capacityGB = tbMatch ? Math.round(parseFloat(tbMatch[1]) * 1024) : gbMatch ? parseFloat(gbMatch[1]) : null;

      // Skip system products (laptops, PCs, etc.) — they bundle multiple components
      const isSystem = nameLower.includes("laptop") || nameLower.includes(" pc") || nameLower.includes("desktop") ||
                       nameLower.includes("windows 11") || nameLower.includes("windows 10") || nameLower.includes("gaming build") ||
                       nameLower.includes("logix ") || nameLower.includes("workstation") || nameLower.includes("tower") ||
                       nameLower.includes("mini pc") || nameLower.includes("small form factor") || nameLower.includes("all-in-one") ||
                       nameLower.includes("tablet") || nameLower.includes("android") || nameLower.includes("chromebook") ||
                       nameLower.includes("server") || nameLower.includes("nas ") || nameLower.includes("motherboard");

      // Standalone storage drives only (not GPUs, laptops, etc.)
      const isStorage = !isSystem && (nameLower.includes("ssd") || nameLower.includes("nvme") ||
                        nameLower.includes("solid state") || nameLower.includes("hard drive") || nameLower.includes("hard disk")) &&
                        !nameLower.includes("gddr") && !nameLower.includes("geforce") && !nameLower.includes("radeon");

      // Standalone RAM sticks only (not GPU VRAM, not laptops with RAM spec)
      const isRam = !isSystem && (nameLower.includes("dimm") || (nameLower.includes("ddr") && !nameLower.includes("gddr") && !nameLower.includes("geforce") && !nameLower.includes("radeon"))) &&
                   !nameLower.includes("laptop") && !nameLower.includes("graphics");

      if (capacityGB !== null && isStorage) {
        const pricePerGB = price / capacityGB;
        if (pricePerGB > 1.20) {
          issues.push(`£${pricePerGB.toFixed(2)}/GB for ${capacityGB}GB storage (max expected ~£1.20/GB)`);
        }
        if (cost / capacityGB > 0.80) {
          issues.push(`cost £${(cost / capacityGB).toFixed(2)}/GB (max expected ~£0.80/GB for storage)`);
        }
      }

      if (capacityGB !== null && isRam) {
        const pricePerGB = price / capacityGB;
        if (pricePerGB > 25) {
          issues.push(`£${pricePerGB.toFixed(2)}/GB for ${capacityGB}GB RAM (max expected ~£25/GB)`);
        }
      }

      // Markup ratio check (should be ~1.22 for all products)
      if (cost > 0 && price / cost > 3) {
        issues.push(`markup ${(price / cost).toFixed(1)}× cost (expected ~1.22×)`);
      }
      if (cost > 0 && price / cost < 1.05) {
        issues.push(`price £${price} below cost £${cost} — possible data error`);
      }

      // Test product that snuck in
      if (nameLower.includes("test product") || nameLower.includes("do not buy")) {
        issues.push("test/placeholder product — should be removed");
      }

      if (issues.length > 0) {
        suspicious.push({ id: p.id, name: p.name, price, costPrice: cost, source: p.source, issue: issues.join("; ") });
      }
    }

    return suspicious.sort((a, b) => b.price - a.price);
  }

  async fixRamCategories(): Promise<{ fixed: number; details: string[] }> {
    const details: string[] = [];
    let fixed = 0;

    const memCat = await this.db.select().from(categories).where(eq(categories.slug, "memory"));
    if (!memCat[0]) return { fixed: 0, details: ["memory category not found"] };
    const memId = memCat[0].id;

    // Evict devices (laptops/tablets/PCs) that landed in memory because their names mention DDR/LPDDR
    const laptopCat = await this.db.select().from(categories).where(eq(categories.slug, "laptops"));
    const tabletCat = await this.db.select().from(categories).where(eq(categories.slug, "tablets"));
    const desktopCat = await this.db.select().from(categories).where(eq(categories.slug, "servers-workstations"));
    if (laptopCat[0]) {
      const laptopRows = await this.db.update(products)
        .set({ categoryId: laptopCat[0].id })
        .where(and(
          eq(products.categoryId, memId),
          or(
            ilike(products.name, '%laptop%'),
            ilike(products.name, '%notebook%'),
            ilike(products.name, '%chromebook%'),
            and(ilike(products.name, '%windows 11 home%'), ilike(products.name, '%ssd%')),
            and(ilike(products.name, '%windows 11 pro%'), ilike(products.name, '%ssd%'))
          ),
          notIlike(products.name, '%DIMM System Memory%'),
          notIlike(products.name, '%System Memory%')
        ))
        .returning({ id: products.id, name: products.name });
      for (const row of laptopRows) { details.push(`Laptop evicted from memory: "${row.name.substring(0, 70)}"`); fixed++; }
    }
    if (tabletCat[0]) {
      const tabletRows = await this.db.update(products)
        .set({ categoryId: tabletCat[0].id })
        .where(and(
          eq(products.categoryId, memId),
          or(ilike(products.name, '%tablet%'), ilike(products.name, '%android%'))
        ))
        .returning({ id: products.id, name: products.name });
      for (const row of tabletRows) { details.push(`Tablet evicted from memory: "${row.name.substring(0, 70)}"`); fixed++; }
    }
    if (desktopCat[0]) {
      const desktopRows = await this.db.update(products)
        .set({ categoryId: desktopCat[0].id })
        .where(and(
          eq(products.categoryId, memId),
          or(
            ilike(products.name, '%tower%'),
            ilike(products.name, '%desktop pc%'),
            ilike(products.name, '%gaming build%'),
            ilike(products.name, '%tiny pc%'),
            ilike(products.name, '%mini pc%')
          )
        ))
        .returning({ id: products.id, name: products.name });
      for (const row of desktopRows) { details.push(`Desktop evicted from memory: "${row.name.substring(0, 70)}"`); fixed++; }
    }

    // Evict motherboards from memory (they mention DDR slots but are not RAM)
    const mbCat = await this.db.select().from(categories).where(eq(categories.slug, "motherboards"));
    if (mbCat[0]) {
      const mbRows = await this.db.update(products)
        .set({ categoryId: mbCat[0].id })
        .where(and(
          eq(products.categoryId, memId),
          or(
            ilike(products.name, '%motherboard%'),
            ilike(products.name, '% ATX%'),
            ilike(products.name, '%M-ATX%'),
            ilike(products.name, '%Micro-ATX%'),
            ilike(products.name, '%Mini-ITX%'),
            and(ilike(products.name, '%Socket%'), ilike(products.name, '%DDR%'))
          )
        ))
        .returning({ id: products.id, name: products.name });
      for (const row of mbRows) { details.push(`Motherboard evicted from memory: "${row.name.substring(0, 70)}"`); fixed++; }
    }

    // Helper: run one UPDATE and collect results
    const rescue = async (condition: any) => {
      const rows = await this.db
        .update(products)
        .set({ categoryId: memId })
        .where(and(condition, ne(products.categoryId, memId)))
        .returning({ id: products.id, name: products.name });
      for (const row of rows) {
        details.push(`RAM rescued: "${row.name.substring(0, 70)}"`);
        fixed++;
      }
    };

    const noSSD = and(notIlike(products.name, '%NVMe%'), notIlike(products.name, '%SSD%'), notIlike(products.name, '%M.2%'));

    // DIMM form factors — completely unambiguous
    await rescue(ilike(products.name, '%DIMM System Memory%'));
    await rescue(and(ilike(products.name, '%U-DIMM%'), noSSD));
    await rescue(and(ilike(products.name, '% DIMM%'), ilike(products.name, '%DDR%'), noSSD));
    await rescue(and(ilike(products.name, '%SODIMM%'), noSSD));
    await rescue(and(ilike(products.name, '%SO-DIMM%'), noSSD));
    await rescue(and(ilike(products.name, '%RDIMM%'), noSSD));
    await rescue(ilike(products.name, '%LRDIMM%'));

    // DDR type + Memory keyword (covers "DDR4 Memory", "DDR5 Memory", "System Memory")
    await rescue(and(or(ilike(products.name, '%DDR4%'), ilike(products.name, '%DDR5%'), ilike(products.name, '%DDR3%')), ilike(products.name, '%Memory%'), noSSD,
      notIlike(products.name, '%Slot%'), notIlike(products.name, '%Motherboard%'), notIlike(products.name, '%Socket%'),
      notIlike(products.name, '%Laptop%'), notIlike(products.name, '%Notebook%'), notIlike(products.name, '%Pre-Built%'),
      notIlike(products.name, '%GeForce%'), notIlike(products.name, '%Radeon%'), notIlike(products.name, '%Graphics%')
    ));

    // Well-known RAM brands
    await rescue(and(ilike(products.name, '%ValueRAM%'), ilike(products.name, '%GB%')));
    await rescue(and(ilike(products.name, '%FURY Beast%'), ilike(products.name, '%GB%'), noSSD));
    await rescue(and(ilike(products.name, '%FURY Renegade%'), ilike(products.name, '%GB%'), noSSD));
    await rescue(and(ilike(products.name, '%Vengeance%'), ilike(products.name, '%DDR%'), notIlike(products.name, '%SSD%')));
    await rescue(and(ilike(products.name, '%Ripjaws%'), ilike(products.name, '%DDR%')));
    await rescue(and(ilike(products.name, '%Trident Z%'), ilike(products.name, '%DDR%')));
    await rescue(and(ilike(products.name, '%XPG Lancer%'), ilike(products.name, '%DDR%')));
    await rescue(and(ilike(products.name, '%XPG Gammix%'), ilike(products.name, '%DDR%')));
    await rescue(and(ilike(products.name, '%XPG Spectrix%'), ilike(products.name, '%DDR%')));
    await rescue(and(ilike(products.name, '%Flare X%'), ilike(products.name, '%DDR%')));
    await rescue(and(ilike(products.name, '%Dominator Platinum%'), ilike(products.name, '%DDR%')));
    await rescue(and(ilike(products.name, '%Patriot%'), ilike(products.name, '%DDR%'), ilike(products.name, '%GB%'), noSSD,
      notIlike(products.name, '%Motherboard%'), notIlike(products.name, '%Laptop%')));
    await rescue(and(ilike(products.name, '%HyperX%'), ilike(products.name, '%DDR%'), notIlike(products.name, '%Headset%'), notIlike(products.name, '%Mouse%'), notIlike(products.name, '%Keyboard%')));
    await rescue(and(ilike(products.name, '%Crucial%'), ilike(products.name, '%DDR%'), ilike(products.name, '%GB%'), noSSD));
    await rescue(and(ilike(products.name, '%Team Group%'), ilike(products.name, '%DDR%'), ilike(products.name, '%GB%')));
    await rescue(and(ilike(products.name, '%Ballistix%'), ilike(products.name, '%DDR%')));
    await rescue(and(ilike(products.name, '%Signature Series%'), ilike(products.name, '%DDR%'), ilike(products.name, '%GB%')));

    return { fixed, details };
  }
}

export const storage = new DatabaseStorage();
