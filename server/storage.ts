import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { categories, products, type Category, type InsertCategory, type Product, type InsertProduct } from "@shared/schema";

export interface IStorage {
  getCategories(): Promise<Category[]>;
  getCategoryBySlug(slug: string): Promise<Category | undefined>;
  createCategory(cat: InsertCategory): Promise<Category>;

  getProducts(): Promise<Product[]>;
  getProductsByCategory(categoryId: number): Promise<Product[]>;
  getProductBySlug(slug: string): Promise<Product | undefined>;
  getProduct(id: number): Promise<Product | undefined>;
  createProduct(product: InsertProduct): Promise<Product>;
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
}

export const storage = new DatabaseStorage();
