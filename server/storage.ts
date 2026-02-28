import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { categories, products, orders, type Category, type InsertCategory, type Product, type InsertProduct, type Order, type InsertOrder } from "@shared/schema";

export interface IStorage {
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
  getOrderByPaymentId(paymentId: string): Promise<Order | undefined>;
  updateOrderStatus(id: number, status: string, paymentId?: string): Promise<Order | undefined>;
}

export class DatabaseStorage implements IStorage {
  private db = drizzle(process.env.DATABASE_URL!);

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
}

export const storage = new DatabaseStorage();
