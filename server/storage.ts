import { eq, sql, gte, desc, count } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { users, categories, products, orders, customFeeds, feedSources, pageViews, blogPosts, type User, type InsertUser, type Category, type InsertCategory, type Product, type InsertProduct, type Order, type InsertOrder, type CustomFeed, type InsertCustomFeed, type FeedSource, type InsertFeedSource, type BlogPost, type InsertBlogPost } from "@shared/schema";

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

    const [todayResult] = await this.db.select({ count: count() }).from(pageViews).where(gte(pageViews.createdAt, todayStart));
    const [weekResult] = await this.db.select({ count: count() }).from(pageViews).where(gte(pageViews.createdAt, weekStart));
    const [monthResult] = await this.db.select({ count: count() }).from(pageViews).where(gte(pageViews.createdAt, monthStart));
    const [totalResult] = await this.db.select({ count: count() }).from(pageViews);

    const topPages = await this.db
      .select({ path: pageViews.path, views: count() })
      .from(pageViews)
      .where(gte(pageViews.createdAt, monthStart))
      .groupBy(pageViews.path)
      .orderBy(desc(count()))
      .limit(10);

    const recentDaysRaw = await this.db
      .select({
        date: sql<string>`TO_CHAR(${pageViews.createdAt}, 'YYYY-MM-DD')`,
        views: count(),
      })
      .from(pageViews)
      .where(gte(pageViews.createdAt, monthStart))
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
}

export const storage = new DatabaseStorage();
