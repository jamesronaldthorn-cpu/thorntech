import { eq, sql, gte, desc, count, and } from "drizzle-orm";
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
    return this.db.select().from(products);
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
    return this.db.select().from(products).where(combined).limit(50);
  }

  async getProductsByCategory(categoryId: number): Promise<Product[]> {
    return this.db.select().from(products).where(eq(products.categoryId, categoryId));
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
}

export const storage = new DatabaseStorage();
