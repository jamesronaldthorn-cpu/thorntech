import { pgTable, text, integer, doublePrecision, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const categories = pgTable("categories", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description"),
  icon: text("icon"),
});

export const products = pgTable("products", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description"),
  price: doublePrecision("price").notNull(),
  compareAtPrice: doublePrecision("compare_at_price"),
  categoryId: integer("category_id").references(() => categories.id),
  image: text("image"),
  badge: text("badge"),
  inStock: boolean("in_stock").notNull().default(true),
  vendor: text("vendor"),
  stripeProductId: text("stripe_product_id"),
  stripePriceId: text("stripe_price_id"),
});

export const orders = pgTable("orders", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  email: text("email").notNull(),
  name: text("name").notNull(),
  address: text("address").notNull(),
  city: text("city").notNull(),
  postcode: text("postcode").notNull(),
  phone: text("phone"),
  total: doublePrecision("total").notNull(),
  status: text("status").notNull().default("pending"),
  paymentMethod: text("payment_method").notNull(),
  paymentId: text("payment_id"),
  items: text("items").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const customFeeds = pgTable("custom_feeds", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const feedSources = pgTable("feed_sources", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: text("name").notNull(),
  url: text("url").notNull(),
  categoryId: integer("category_id").references(() => categories.id),
  intervalHours: integer("interval_hours").notNull().default(6),
  enabled: boolean("enabled").notNull().default(true),
  lastImportAt: timestamp("last_import_at"),
  lastImportCount: integer("last_import_count"),
  lastError: text("last_error"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertCategorySchema = createInsertSchema(categories).omit({ id: true });
export const insertProductSchema = createInsertSchema(products).omit({ id: true });
export const insertOrderSchema = createInsertSchema(orders).omit({ id: true, createdAt: true });
export const insertCustomFeedSchema = createInsertSchema(customFeeds).omit({ id: true, createdAt: true, updatedAt: true });
export const insertFeedSourceSchema = createInsertSchema(feedSources).omit({ id: true, createdAt: true, lastImportAt: true, lastImportCount: true, lastError: true });

export type Category = typeof categories.$inferSelect;
export type InsertCategory = z.infer<typeof insertCategorySchema>;
export type Product = typeof products.$inferSelect;
export type InsertProduct = z.infer<typeof insertProductSchema>;
export type Order = typeof orders.$inferSelect;
export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type CustomFeed = typeof customFeeds.$inferSelect;
export type InsertCustomFeed = z.infer<typeof insertCustomFeedSchema>;
export type FeedSource = typeof feedSources.$inferSelect;
export type InsertFeedSource = z.infer<typeof insertFeedSourceSchema>;
