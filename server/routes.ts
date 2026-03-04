import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { getUncachableStripeClient, getStripePublishableKey } from "./stripeClient";
import { registerSchema, loginSchema } from "@shared/schema";
import type { Product, Category } from "@shared/schema";
import * as xero from "./xero";
import * as vipApi from "./vipApi";
import { matchInternetPrices, getMatchProgress, resetMatchProgress } from "./priceMatcher";
import { enrichProducts, getEnrichProgress, resetEnrichProgress } from "./productEnricher";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "thorntech-jwt-secret-change-me";

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

function userAuth(req: any, res: any, next: any) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Not authenticated" });
  }
  try {
    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: number; email: string };
    req.userId = decoded.userId;
    req.userEmail = decoded.email;
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  app.use((req, _res, next) => {
    if (req.method === "GET" && !req.path.startsWith("/api/") && !req.path.startsWith("/assets/") && !req.path.includes(".")) {
      const ip = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || req.socket.remoteAddress || "";
      const userAgent = req.headers["user-agent"] || "";
      const referrer = req.headers["referer"] || "";
      storage.recordPageView(req.path, ip, userAgent, referrer).catch(() => {});
    }
    next();
  });

  app.post("/api/auth/register", async (req, res) => {
    try {
      const parsed = registerSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.errors[0].message });
      }
      const { email, password, name, phone } = parsed.data;

      const existing = await storage.getUserByEmail(email.toLowerCase());
      if (existing) {
        return res.status(409).json({ error: "An account with this email already exists" });
      }

      const passwordHash = await bcrypt.hash(password, 12);
      const user = await storage.createUser({
        email: email.toLowerCase(),
        passwordHash,
        name,
        phone: phone || null,
        address: null,
        city: null,
        postcode: null,
      });

      const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: "30d" });
      res.json({
        token,
        user: { id: user.id, email: user.email, name: user.name, phone: user.phone, address: user.address, city: user.city, postcode: user.postcode },
      });
    } catch (e: any) {
      console.error("Register error:", e);
      res.status(500).json({ error: "Registration failed" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const parsed = loginSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.errors[0].message });
      }
      const { email, password } = parsed.data;

      const user = await storage.getUserByEmail(email.toLowerCase());
      if (!user) {
        return res.status(401).json({ error: "Invalid email or password" });
      }

      const valid = await bcrypt.compare(password, user.passwordHash);
      if (!valid) {
        return res.status(401).json({ error: "Invalid email or password" });
      }

      const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: "30d" });
      res.json({
        token,
        user: { id: user.id, email: user.email, name: user.name, phone: user.phone, address: user.address, city: user.city, postcode: user.postcode },
      });
    } catch (e: any) {
      console.error("Login error:", e);
      res.status(500).json({ error: "Login failed" });
    }
  });

  app.get("/api/auth/me", userAuth, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.userId);
      if (!user) return res.status(404).json({ error: "User not found" });
      res.json({ id: user.id, email: user.email, name: user.name, phone: user.phone, address: user.address, city: user.city, postcode: user.postcode });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.put("/api/auth/me", userAuth, async (req: any, res) => {
    try {
      const { name, phone, address, city, postcode } = req.body;
      const updated = await storage.updateUser(req.userId, { name, phone, address, city, postcode });
      if (!updated) return res.status(404).json({ error: "User not found" });
      res.json({ id: updated.id, email: updated.email, name: updated.name, phone: updated.phone, address: updated.address, city: updated.city, postcode: updated.postcode });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.put("/api/auth/password", userAuth, async (req: any, res) => {
    try {
      const { currentPassword, newPassword } = req.body;
      if (!currentPassword || !newPassword || newPassword.length < 8) {
        return res.status(400).json({ error: "New password must be at least 8 characters" });
      }
      const user = await storage.getUser(req.userId);
      if (!user) return res.status(404).json({ error: "User not found" });
      const valid = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!valid) return res.status(401).json({ error: "Current password is incorrect" });
      const passwordHash = await bcrypt.hash(newPassword, 12);
      await storage.updateUser(req.userId, { passwordHash });
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/auth/orders", userAuth, async (req: any, res) => {
    try {
      const userOrders = await storage.getOrdersByUserId(req.userId);
      res.json(userOrders);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

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
    res.json(prods.map((p: any) => { const { costPrice, ...pub } = p; return pub; }));
  });

  function stripCostPrice(product: any) {
    const { costPrice, ...pub } = product;
    return pub;
  }

  app.get("/api/products", async (_req, res) => {
    const prods = await storage.getProducts();
    res.json(prods.map(stripCostPrice));
  });

  app.get("/api/products/search", async (req, res) => {
    const q = (req.query.q as string || "").trim();
    if (!q || q.length < 2) return res.json([]);
    const results = await storage.searchProducts(q);
    res.json(results.map(stripCostPrice));
  });

  app.get("/api/products/:slug", async (req, res) => {
    const product = await storage.getProductBySlug(req.params.slug);
    if (!product) return res.status(404).json({ error: "Product not found" });
    res.json(stripCostPrice(product));
  });

  app.get("/api/stripe/publishable-key", async (_req, res) => {
    try {
      const key = await getStripePublishableKey();
      res.json({ publishableKey: key });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/checkout/stripe", async (req, res) => {
    try {
      const { items, email, name, address, city, postcode, phone, userId } = req.body;
      if (!items || !items.length || !email || !name || !address || !city || !postcode) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      const allProducts = await storage.getProducts();
      const productMap = new Map(allProducts.map(p => [p.id, p]));

      const lineItems = items.map((item: { productId: number; quantity: number }) => {
        const product = productMap.get(item.productId);
        if (!product) throw new Error(`Product ${item.productId} not found`);
        return {
          price_data: {
            currency: "gbp",
            product_data: {
              name: product.name,
              description: product.description || undefined,
            },
            unit_amount: Math.round(product.price * 100),
          },
          quantity: item.quantity,
        };
      });

      const total = items.reduce((sum: number, item: { productId: number; quantity: number }) => {
        const product = productMap.get(item.productId);
        return sum + (product ? product.price * item.quantity : 0);
      }, 0);

      const isTestOrder = items.some((item: { productId: number; quantity: number }) => {
        const product = productMap.get(item.productId);
        return product && product.slug === "test-product-do-not-buy";
      });

      const order = await storage.createOrder({
        userId: userId || null,
        email,
        name,
        address,
        city,
        postcode,
        phone: phone || null,
        total,
        status: "pending",
        paymentMethod: "stripe",
        paymentId: null,
        items: JSON.stringify(items.map((item: { productId: number; quantity: number }) => {
          const product = productMap.get(item.productId);
          return { productId: item.productId, name: product?.name, price: product?.price, quantity: item.quantity };
        })),
      });

      const siteUrl = buildSiteUrl(req);
      const stripe = await getUncachableStripeClient();
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items: lineItems,
        mode: "payment",
        success_url: `${siteUrl}/order-confirmation?session_id={CHECKOUT_SESSION_ID}&order_id=${order.id}`,
        cancel_url: `${siteUrl}/checkout`,
        customer_email: email,
        shipping_options: [
          {
            shipping_rate_data: {
              type: "fixed_amount",
              fixed_amount: { amount: (total >= 200 || isTestOrder) ? 0 : 799, currency: "gbp" },
              display_name: (total >= 200 || isTestOrder) ? "Free Delivery (1-3 Working Days)" : "Standard Delivery (1-3 Working Days)",
              delivery_estimate: {
                minimum: { unit: "business_day", value: 1 },
                maximum: { unit: "business_day", value: 3 },
              },
            },
          },
        ],
        metadata: { orderId: order.id.toString() },
      });

      await storage.updateOrderStatus(order.id, "awaiting_payment", session.id);

      res.json({ url: session.url, sessionId: session.id });
    } catch (e: any) {
      console.error("Stripe checkout error:", e);
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/checkout/stripe/verify/:sessionId", async (req, res) => {
    try {
      const stripe = await getUncachableStripeClient();
      const session = await stripe.checkout.sessions.retrieve(req.params.sessionId);

      if (session.payment_status === "paid") {
        const orderId = session.metadata?.orderId;
        if (orderId) {
          await storage.updateOrderStatus(parseInt(orderId), "paid", session.payment_intent as string);
          const fullOrder = await storage.getOrder(parseInt(orderId));
          if (fullOrder) {
            xero.createInvoice(fullOrder).catch(e => console.error("[Xero] Background invoice error:", e));
          }
        }
        res.json({ status: "paid", orderId });
      } else {
        res.json({ status: session.payment_status });
      }
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/checkout/paypal/create", async (req, res) => {
    try {
      const { items, email, name, address, city, postcode, phone, userId } = req.body;
      if (!items || !items.length || !email || !name || !address || !city || !postcode) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      const allProducts = await storage.getProducts();
      const productMap = new Map(allProducts.map(p => [p.id, p]));

      const total = items.reduce((sum: number, item: { productId: number; quantity: number }) => {
        const product = productMap.get(item.productId);
        return sum + (product ? product.price * item.quantity : 0);
      }, 0);

      const isTestOrder = items.some((item: { productId: number; quantity: number }) => {
        const product = productMap.get(item.productId);
        return product && product.slug === "test-product-do-not-buy";
      });

      const shipping = (total >= 200 || isTestOrder) ? 0 : 7.99;
      const grandTotal = total + shipping;

      const order = await storage.createOrder({
        userId: userId || null,
        email,
        name,
        address,
        city,
        postcode,
        phone: phone || null,
        total: grandTotal,
        status: "pending",
        paymentMethod: "paypal",
        paymentId: null,
        items: JSON.stringify(items.map((item: { productId: number; quantity: number }) => {
          const product = productMap.get(item.productId);
          return { productId: item.productId, name: product?.name, price: product?.price, quantity: item.quantity };
        })),
      });

      const siteUrl = buildSiteUrl(req);

      const { getUncachablePaypalOrdersController } = await import("./paypalDirect");
      const paypalOrder = await getUncachablePaypalOrdersController().createOrder({
        body: {
          intent: "CAPTURE",
          purchaseUnits: [
            {
              amount: {
                currencyCode: "GBP",
                value: grandTotal.toFixed(2),
              },
              description: `Thorn Tech Solutions Order #${order.id}`,
            },
          ],
          paymentSource: {
            paypal: {
              experienceContext: {
                returnUrl: `${siteUrl}/api/checkout/paypal/return?order_id=${order.id}`,
                cancelUrl: `${siteUrl}/checkout`,
                brandName: "Thorn Tech Solutions Ltd",
                landingPage: "LOGIN",
                userAction: "PAY_NOW",
              },
            },
          },
        },
        prefer: "return=representation",
      });

      const paypalBody = JSON.parse(String(paypalOrder.body));
      const approvalLink = paypalBody.links?.find((l: any) => l.rel === "payer-action" || l.rel === "approve");

      if (approvalLink?.href) {
        await storage.updateOrderStatus(order.id, "awaiting_payment", paypalBody.id);
        res.json({ approvalUrl: approvalLink.href, orderId: order.id });
      } else {
        res.status(500).json({ error: "Could not get PayPal approval URL" });
      }
    } catch (e: any) {
      console.error("PayPal create order error:", e);
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/checkout/paypal/return", async (req, res) => {
    try {
      const orderId = req.query.order_id as string;
      const paypalOrderId = req.query.token as string;

      if (!orderId || !paypalOrderId) {
        return res.redirect("/checkout?error=missing_params");
      }

      const { getUncachablePaypalOrdersController } = await import("./paypalDirect");
      const captureResult = await getUncachablePaypalOrdersController().captureOrder({
        id: paypalOrderId,
        prefer: "return=minimal",
      });

      const captureBody = JSON.parse(String(captureResult.body));

      if (captureBody.status === "COMPLETED") {
        await storage.updateOrderStatus(parseInt(orderId), "paid", paypalOrderId);
        const fullOrder = await storage.getOrder(parseInt(orderId));
        if (fullOrder) {
          xero.createInvoice(fullOrder).catch(e => console.error("[Xero] Background invoice error:", e));
        }
        res.redirect(`/order-confirmation?order_id=${orderId}&method=paypal`);
      } else {
        res.redirect(`/checkout?error=payment_not_completed`);
      }
    } catch (e: any) {
      console.error("PayPal return error:", e);
      res.redirect(`/checkout?error=capture_failed`);
    }
  });

  app.post("/api/checkout/paypal/confirm", async (req, res) => {
    try {
      const { orderId, paypalOrderId } = req.body;
      if (!orderId || !paypalOrderId) return res.status(400).json({ error: "Missing fields" });
      await storage.updateOrderStatus(orderId, "paid", paypalOrderId);
      const fullOrder = await storage.getOrder(orderId);
      if (fullOrder) {
        xero.createInvoice(fullOrder).catch(e => console.error("[Xero] Background invoice error:", e));
      }
      res.json({ success: true, orderId });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/orders/:id", async (req, res) => {
    const order = await storage.getOrder(parseInt(req.params.id));
    if (!order) return res.status(404).json({ error: "Order not found" });
    res.json(order);
  });

  app.post("/api/orders/lookup", async (req, res) => {
    const { orderId, email } = req.body;
    if (!orderId || !email) return res.status(400).json({ error: "Order number and email are required" });
    const order = await storage.getOrder(parseInt(orderId));
    if (!order || order.email.toLowerCase() !== email.toLowerCase()) {
      return res.status(404).json({ error: "No order found with that number and email" });
    }
    res.json(order);
  });

  let paypalModule: any = null;

  app.get("/paypal/setup", async (req, res) => {
    try {
      if (!paypalModule) {
        paypalModule = await import("./paypal");
      }
      await paypalModule.loadPaypalDefault(req, res);
    } catch (e: any) {
      res.status(500).json({ error: "PayPal not configured: " + e.message });
    }
  });

  app.post("/paypal/order", async (req, res) => {
    try {
      if (!paypalModule) {
        paypalModule = await import("./paypal");
      }
      await paypalModule.createPaypalOrder(req, res);
    } catch (e: any) {
      res.status(500).json({ error: "PayPal not configured: " + e.message });
    }
  });

  app.post("/paypal/order/:orderID/capture", async (req, res) => {
    try {
      if (!paypalModule) {
        paypalModule = await import("./paypal");
      }
      await paypalModule.capturePaypalOrder(req, res);
    } catch (e: any) {
      res.status(500).json({ error: "PayPal not configured: " + e.message });
    }
  });

  const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "thorntech2024";

  function adminAuth(req: any, res: any, next: any) {
    const authHeader = req.headers.authorization;
    if (!authHeader || authHeader !== `Bearer ${ADMIN_PASSWORD}`) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    next();
  }

  app.get("/api/admin/users", adminAuth, async (_req, res) => {
    const allUsers = await storage.getUsers();
    res.json(allUsers.map(u => ({ id: u.id, email: u.email, name: u.name, phone: u.phone, address: u.address, city: u.city, postcode: u.postcode, createdAt: u.createdAt })));
  });

  app.put("/api/admin/users/:id", adminAuth, async (req, res) => {
    try {
      const { name, email, phone, address, city, postcode } = req.body;
      const updated = await storage.updateUser(parseInt(req.params.id), { name, email, phone, address, city, postcode });
      if (!updated) return res.status(404).json({ error: "User not found" });
      res.json({ id: updated.id, email: updated.email, name: updated.name, phone: updated.phone, address: updated.address, city: updated.city, postcode: updated.postcode, createdAt: updated.createdAt });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.put("/api/admin/users/:id/reset-password", adminAuth, async (req, res) => {
    try {
      const { newPassword } = req.body;
      if (!newPassword || newPassword.length < 8) return res.status(400).json({ error: "Password must be at least 8 characters" });
      const bcrypt = await import("bcryptjs");
      const passwordHash = await bcrypt.hash(newPassword, 12);
      const updated = await storage.updateUser(parseInt(req.params.id), { passwordHash });
      if (!updated) return res.status(404).json({ error: "User not found" });
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.delete("/api/admin/users/:id", adminAuth, async (req, res) => {
    try {
      const deleted = await storage.deleteUser(parseInt(req.params.id));
      if (!deleted) return res.status(404).json({ error: "User not found" });
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/admin/stats", adminAuth, async (_req, res) => {
    try {
      const stats = await storage.getPageViewStats();
      res.json(stats);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/admin/products", adminAuth, async (_req, res) => {
    const prods = await storage.getProducts();
    res.json(prods);
  });

  app.post("/api/admin/products", adminAuth, async (req, res) => {
    try {
      const product = await storage.createProduct(req.body);
      res.json(product);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.put("/api/admin/products/:id", adminAuth, async (req, res) => {
    try {
      const product = await storage.updateProduct(parseInt(req.params.id), req.body);
      if (!product) return res.status(404).json({ error: "Product not found" });
      res.json(product);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.delete("/api/admin/products/:id", adminAuth, async (req, res) => {
    try {
      const deleted = await storage.deleteProduct(parseInt(req.params.id));
      if (!deleted) return res.status(404).json({ error: "Product not found" });
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/admin/categories", adminAuth, async (_req, res) => {
    const cats = await storage.getCategories();
    res.json(cats);
  });

  app.post("/api/admin/categories", adminAuth, async (req, res) => {
    try {
      const cat = await storage.createCategory(req.body);
      res.json(cat);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.put("/api/admin/categories/:id", adminAuth, async (req, res) => {
    try {
      const cat = await storage.updateCategory(parseInt(req.params.id), req.body);
      if (!cat) return res.status(404).json({ error: "Category not found" });
      res.json(cat);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.delete("/api/admin/categories/:id", adminAuth, async (req, res) => {
    try {
      const deleted = await storage.deleteCategory(parseInt(req.params.id));
      if (!deleted) return res.status(404).json({ error: "Category not found" });
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/admin/orders", adminAuth, async (_req, res) => {
    const allOrders = await storage.getOrders();
    res.json(allOrders);
  });

  app.put("/api/admin/orders/:id/status", adminAuth, async (req, res) => {
    try {
      const order = await storage.updateOrderStatus(parseInt(req.params.id), req.body.status);
      if (!order) return res.status(404).json({ error: "Order not found" });
      res.json(order);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/admin/orders/:id/refund", adminAuth, async (req, res) => {
    try {
      const orderId = parseInt(req.params.id);
      const order = await storage.getOrder(orderId);
      if (!order) return res.status(404).json({ error: "Order not found" });

      if (order.status === "refunded") {
        return res.status(400).json({ error: "Order has already been refunded" });
      }

      if (order.status !== "paid" && order.status !== "shipped" && order.status !== "delivered") {
        return res.status(400).json({ error: "Only paid, shipped, or delivered orders can be refunded" });
      }

      const refundAmount = req.body.amount ? parseFloat(req.body.amount) : order.total;
      if (refundAmount <= 0 || refundAmount > order.total) {
        return res.status(400).json({ error: `Refund amount must be between £0.01 and £${order.total.toFixed(2)}` });
      }

      const results: { stripe?: any; paypal?: any; xero?: any; error?: string } = {};

      if (order.paymentMethod === "stripe" && order.paymentId) {
        try {
          const stripe = await getUncachableStripeClient();
          const refund = await stripe.refunds.create({
            payment_intent: order.paymentId,
            amount: Math.round(refundAmount * 100),
          });
          results.stripe = { id: refund.id, status: refund.status };
          console.log(`[Refund] Stripe refund ${refund.id} created for order #${orderId}`);
        } catch (e: any) {
          console.error("[Refund] Stripe refund failed:", e.message);
          return res.status(500).json({ error: `Stripe refund failed: ${e.message}` });
        }
      } else if (order.paymentMethod === "paypal" && order.paymentId) {
        try {
          const { PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET } = process.env;
          if (!PAYPAL_CLIENT_ID || !PAYPAL_CLIENT_SECRET) {
            return res.status(500).json({ error: "PayPal credentials not configured" });
          }

          const isProduction = process.env.NODE_ENV === "production";
          const paypalBase = isProduction
            ? "https://api-m.paypal.com"
            : "https://api-m.sandbox.paypal.com";

          const authRes = await fetch(`${paypalBase}/v1/oauth2/token`, {
            method: "POST",
            headers: {
              Authorization: `Basic ${Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`).toString("base64")}`,
              "Content-Type": "application/x-www-form-urlencoded",
            },
            body: "grant_type=client_credentials",
          });

          if (!authRes.ok) throw new Error("Failed to get PayPal access token");
          const authData = await authRes.json();

          const captureRes = await fetch(`${paypalBase}/v2/checkout/orders/${order.paymentId}`, {
            headers: { Authorization: `Bearer ${authData.access_token}` },
          });
          const captureData = await captureRes.json();

          const captureId = captureData?.purchase_units?.[0]?.payments?.captures?.[0]?.id;
          if (!captureId) throw new Error("Could not find PayPal capture ID");

          const refundRes = await fetch(`${paypalBase}/v2/payments/captures/${captureId}/refund`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${authData.access_token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              amount: {
                value: refundAmount.toFixed(2),
                currency_code: "GBP",
              },
              note_to_payer: `Refund for Order #${orderId} from Thorn Tech Solutions Ltd`,
            }),
          });

          if (!refundRes.ok) {
            const errData = await refundRes.text();
            throw new Error(`PayPal refund failed: ${errData}`);
          }

          const refundData = await refundRes.json();
          results.paypal = { id: refundData.id, status: refundData.status };
          console.log(`[Refund] PayPal refund ${refundData.id} created for order #${orderId}`);
        } catch (e: any) {
          console.error("[Refund] PayPal refund failed:", e.message);
          return res.status(500).json({ error: `PayPal refund failed: ${e.message}` });
        }
      }

      const isFullRefund = refundAmount >= order.total;
      await storage.updateOrderStatus(orderId, isFullRefund ? "refunded" : "partial_refund");

      try {
        const creditNote = await xero.createCreditNote(order, refundAmount);
        if (creditNote) {
          results.xero = creditNote;
        }
      } catch (e: any) {
        console.error("[Refund] Xero credit note failed:", e.message);
        results.xero = { error: e.message };
      }

      res.json({
        success: true,
        orderId,
        refundAmount,
        isFullRefund,
        ...results,
      });
    } catch (e: any) {
      console.error("[Refund] Error:", e);
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/admin/feeds", adminAuth, async (_req, res) => {
    const feeds = await storage.getCustomFeeds();
    res.json(feeds);
  });

  app.post("/api/admin/feeds", adminAuth, async (req, res) => {
    try {
      const feed = await storage.createCustomFeed(req.body);
      res.json(feed);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.put("/api/admin/feeds/:id", adminAuth, async (req, res) => {
    try {
      const feed = await storage.updateCustomFeed(parseInt(req.params.id), req.body);
      if (!feed) return res.status(404).json({ error: "Feed not found" });
      res.json(feed);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.delete("/api/admin/feeds/:id", adminAuth, async (req, res) => {
    try {
      const deleted = await storage.deleteCustomFeed(parseInt(req.params.id));
      if (!deleted) return res.status(404).json({ error: "Feed not found" });
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/admin/import-feed", adminAuth, async (req, res) => {
    try {
      const { url, categoryId } = req.body;
      if (!url) return res.status(400).json({ error: "Feed URL is required" });
      const { importFromUrl } = await import("./feedImporter");
      const result = await importFromUrl(url, categoryId ? parseInt(categoryId) : null);
      res.json({ ...result, totalInFeed: result.imported + result.skipped + result.updated });
    } catch (e: any) {
      console.error("Feed import error:", e);
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/admin/feed-sources", adminAuth, async (_req, res) => {
    const sources = await storage.getFeedSources();
    res.json(sources);
  });

  app.post("/api/admin/feed-sources", adminAuth, async (req, res) => {
    try {
      const source = await storage.createFeedSource(req.body);
      res.json(source);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.put("/api/admin/feed-sources/:id", adminAuth, async (req, res) => {
    try {
      const source = await storage.updateFeedSource(parseInt(req.params.id), req.body);
      if (!source) return res.status(404).json({ error: "Feed source not found" });
      res.json(source);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.delete("/api/admin/feed-sources/:id", adminAuth, async (req, res) => {
    try {
      const deleted = await storage.deleteFeedSource(parseInt(req.params.id));
      if (!deleted) return res.status(404).json({ error: "Feed source not found" });
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/admin/feed-sources/:id/run", adminAuth, async (req, res) => {
    try {
      const sources = await storage.getFeedSources();
      const source = sources.find(s => s.id === parseInt(req.params.id));
      if (!source) return res.status(404).json({ error: "Feed source not found" });
      const { importFromUrl } = await import("./feedImporter");
      const result = await importFromUrl(source.url, source.categoryId);
      await storage.updateFeedSource(source.id, {
        lastImportAt: new Date(),
        lastImportCount: result.imported,
        lastError: null,
      });
      res.json({ ...result, totalInFeed: result.imported + result.skipped + result.updated });
    } catch (e: any) {
      await storage.updateFeedSource(parseInt(req.params.id), {
        lastImportAt: new Date(),
        lastImportCount: 0,
        lastError: e.message,
      });
      res.status(500).json({ error: e.message });
    }
  });

  // Blog admin routes
  app.get("/api/admin/blog", adminAuth, async (_req, res) => {
    const posts = await storage.getBlogPosts();
    res.json(posts);
  });

  app.post("/api/admin/blog", adminAuth, async (req, res) => {
    try {
      const post = await storage.createBlogPost(req.body);
      res.json(post);
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  app.put("/api/admin/blog/:id", adminAuth, async (req, res) => {
    try {
      const post = await storage.updateBlogPost(parseInt(req.params.id), req.body);
      if (!post) return res.status(404).json({ error: "Post not found" });
      res.json(post);
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  app.delete("/api/admin/blog/:id", adminAuth, async (req, res) => {
    const deleted = await storage.deleteBlogPost(parseInt(req.params.id));
    if (!deleted) return res.status(404).json({ error: "Post not found" });
    res.json({ success: true });
  });

  // Public blog routes
  app.get("/api/blog", async (_req, res) => {
    const posts = await storage.getBlogPosts(true);
    res.json(posts);
  });

  app.get("/api/blog/:slug", async (req, res) => {
    const post = await storage.getBlogPostBySlug(req.params.slug);
    if (!post || !post.published) return res.status(404).json({ error: "Post not found" });
    res.json(post);
  });

  // Xero routes
  app.get("/api/xero/connect", adminAuth, async (_req, res) => {
    try {
      const url = xero.getAuthUrl();
      res.json({ url });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/xero/callback", async (req, res) => {
    try {
      const fullUrl = `${req.protocol}://${req.get("host")}${req.originalUrl}`;
      const result = await xero.handleCallback(fullUrl);
      res.redirect("/admin?xero=connected&org=" + encodeURIComponent(result.tenantName));
    } catch (e: any) {
      console.error("[Xero] Callback error:", e);
      res.redirect("/admin?xero=error&message=" + encodeURIComponent(e.message));
    }
  });

  app.get("/api/xero/status", adminAuth, async (_req, res) => {
    try {
      const status = await xero.isConnected();
      res.json(status);
    } catch (e: any) {
      res.json({ connected: false });
    }
  });

  app.post("/api/xero/disconnect", adminAuth, async (_req, res) => {
    try {
      await xero.disconnect();
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/admin/vip/test", adminAuth, async (_req, res) => {
    try {
      const result = await vipApi.testConnection();
      res.json(result);
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  app.post("/api/admin/vip/sync", adminAuth, async (_req, res) => {
    try {
      const result = await vipApi.syncVipProducts();
      res.json(result);
    } catch (e: any) {
      console.error("[VIP] Sync error:", e);
      res.status(500).json({ error: e.message });
    }
  });

  let priceMatchStatus: { running: boolean; result: any } = { running: false, result: null };

  app.post("/api/admin/vip/match-prices", adminAuth, async (req, res) => {
    if (priceMatchStatus.running) {
      return res.json({ status: "running", message: "Price matching is already in progress" });
    }
    const batchSize = req.body.batchSize ? parseInt(req.body.batchSize) : 50;
    priceMatchStatus = { running: true, result: null };
    res.json({ status: "started", message: `Price matching started for ${batchSize} products. Check status below.` });

    try {
      const result = await matchInternetPrices(batchSize);
      priceMatchStatus = { running: false, result };
    } catch (e: any) {
      console.error("[PriceMatcher] Error:", e);
      priceMatchStatus = { running: false, result: { error: e.message } };
    }
  });

  app.get("/api/admin/vip/match-prices/status", adminAuth, async (_req, res) => {
    const progress = getMatchProgress();
    res.json({ ...priceMatchStatus, matchedSoFar: progress.matched });
  });

  app.post("/api/admin/vip/match-prices/reset", adminAuth, async (_req, res) => {
    resetMatchProgress();
    res.json({ success: true, message: "Price match progress reset. Next batch will start from the beginning." });
  });

  let enrichStatus: { running: boolean; result: any } = { running: false, result: null };

  app.post("/api/admin/enrich-products", adminAuth, async (req, res) => {
    if (enrichStatus.running) {
      return res.json({ status: "running", message: "Product enrichment is already in progress" });
    }
    const batchSize = req.body.batchSize ? parseInt(req.body.batchSize) : 50;
    enrichStatus = { running: true, result: null };
    res.json({ status: "started", message: `Enriching ${batchSize} products — pulling specs, features & images from the web...` });

    try {
      const result = await enrichProducts(batchSize);
      enrichStatus = { running: false, result };
    } catch (e: any) {
      console.error("[Enricher] Error:", e);
      enrichStatus = { running: false, result: { error: e.message } };
    }
  });

  app.get("/api/admin/enrich-products/status", adminAuth, async (_req, res) => {
    const progress = getEnrichProgress();
    res.json({ ...enrichStatus, enrichedSoFar: progress.enriched });
  });

  app.post("/api/admin/enrich-products/reset", adminAuth, async (_req, res) => {
    resetEnrichProgress();
    const allProducts = await storage.getProducts();
    let cleared = 0;
    for (const p of allProducts) {
      if (p.enrichedAt) {
        await storage.updateProduct(p.id, { enrichedAt: null } as any);
        cleared++;
      }
    }
    res.json({ success: true, message: `Enrichment progress reset. Cleared ${cleared} products for re-enrichment.` });
  });

  app.post("/api/admin/login", (req, res) => {
    const { password } = req.body;
    if (password === ADMIN_PASSWORD) {
      res.json({ success: true });
    } else {
      res.status(401).json({ error: "Invalid password" });
    }
  });

  app.get("/robots.txt", (req, res) => {
    const siteUrl = buildSiteUrl(req);
    res.set("Content-Type", "text/plain");
    res.send(`User-agent: *
Allow: /
Disallow: /admin
Disallow: /api/
Disallow: /checkout
Allow: /feeds/google-merchant.xml

Sitemap: ${siteUrl}/sitemap.xml
`);
  });

  app.get("/sitemap.xml", async (req, res) => {
    const [prods, cats, posts] = await Promise.all([storage.getProducts(), storage.getCategories(), storage.getBlogPosts(true)]);
    const siteUrl = buildSiteUrl(req);
    const now = new Date().toISOString().split("T")[0];
    const blogUrls = posts.map(p => `  <url><loc>${siteUrl}/blog/${p.slug}</loc><changefreq>weekly</changefreq><priority>0.7</priority><lastmod>${p.updatedAt ? new Date(p.updatedAt).toISOString().split("T")[0] : now}</lastmod></url>`);
    let sitemap = generateSitemapXml(prods, cats, siteUrl);
    if (blogUrls.length > 0) {
      sitemap = sitemap.replace("</urlset>", `  <url><loc>${siteUrl}/blog</loc><changefreq>daily</changefreq><priority>0.8</priority><lastmod>${now}</lastmod></url>\n${blogUrls.join("\n")}\n</urlset>`);
    }
    res.set("Content-Type", "application/xml; charset=utf-8");
    res.send(sitemap);
  });

  app.get("/feeds/google-merchant.xml", async (req, res) => {
    const [products, categories] = await Promise.all([storage.getProducts(), storage.getCategories()]);
    const siteUrl = buildSiteUrl(req);
    const catMap = new Map(categories.map(c => [c.id, c]));

    const escXml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");

    const activeProducts = products.filter(p => p.inStock && p.slug !== "test-product-do-not-buy" && p.price > 0);

    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
<channel>
<title>Thorn Tech Solutions Ltd</title>
<link>${siteUrl}</link>
<description>PC Components &amp; Hardware - UK Online Store</description>
`;

    for (const p of activeProducts) {
      const cat = p.categoryId ? catMap.get(p.categoryId) : null;
      const productUrl = `${siteUrl}/product/${p.slug}`;
      const imageUrl = p.image ? (p.image.startsWith("http") ? p.image : `${siteUrl}${p.image}`) : "";
      const priceGbp = p.price.toFixed(2);
      const availability = p.inStock ? "in_stock" : "out_of_stock";
      const condition = "new";
      const shipping = p.price >= 200 ? "0.00" : "7.99";

      xml += `<item>
<g:id>${p.id}</g:id>
<g:title>${escXml(p.name)}</g:title>
<g:description>${escXml(p.description || p.name)}</g:description>
<g:link>${escXml(productUrl)}</g:link>
${imageUrl ? `<g:image_link>${escXml(imageUrl)}</g:image_link>` : ""}
<g:price>${priceGbp} GBP</g:price>
${p.compareAtPrice && p.compareAtPrice > p.price ? `<g:sale_price>${priceGbp} GBP</g:sale_price>\n<g:sale_price_effective_date>${new Date().toISOString()}/${new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()}</g:sale_price_effective_date>` : ""}
<g:availability>${availability}</g:availability>
<g:condition>${condition}</g:condition>
${p.vendor ? `<g:brand>${escXml(p.vendor)}</g:brand>` : ""}
${p.mpn ? `<g:mpn>${escXml(p.mpn)}</g:mpn>` : ""}
${p.ean ? `<g:gtin>${escXml(p.ean)}</g:gtin>` : ""}
${cat ? `<g:product_type>${escXml(cat.name)}</g:product_type>` : ""}
<g:shipping>
<g:country>GB</g:country>
<g:service>Standard</g:service>
<g:price>${shipping} GBP</g:price>
</g:shipping>
<g:identifier_exists>${p.mpn || p.ean ? "true" : "false"}</g:identifier_exists>
</item>
`;
    }

    xml += `</channel>
</rss>`;

    res.set("Content-Type", "application/xml; charset=utf-8");
    res.set("Cache-Control", "public, max-age=3600");
    res.send(xml);
  });

  app.get("/feeds/google-merchant.json", async (req, res) => {
    const [products, categories] = await Promise.all([storage.getProducts(), storage.getCategories()]);
    const siteUrl = buildSiteUrl(req);
    const catMap = new Map(categories.map(c => [c.id, c]));

    const activeProducts = products.filter(p => p.inStock && p.slug !== "test-product-do-not-buy" && p.price > 0);

    const items = activeProducts.map(p => {
      const cat = p.categoryId ? catMap.get(p.categoryId) : null;
      const imageUrl = p.image ? (p.image.startsWith("http") ? p.image : `${siteUrl}${p.image}`) : undefined;
      return {
        id: String(p.id),
        title: p.name,
        description: p.description || p.name,
        link: `${siteUrl}/product/${p.slug}`,
        image_link: imageUrl,
        price: `${p.price.toFixed(2)} GBP`,
        availability: p.inStock ? "in_stock" : "out_of_stock",
        condition: "new",
        brand: p.vendor || undefined,
        mpn: p.mpn || undefined,
        gtin: p.ean || undefined,
        product_type: cat?.name || undefined,
        shipping: { country: "GB", service: "Standard", price: p.price >= 200 ? "0.00 GBP" : "7.99 GBP" },
        identifier_exists: !!(p.mpn || p.ean),
      };
    });

    res.set("Cache-Control", "public, max-age=3600");
    res.json({ products: items, count: items.length });
  });

  app.get("/feeds/custom/:slug", async (req, res) => {
    const feed = await storage.getCustomFeedBySlug(req.params.slug);
    if (!feed) return res.status(404).send("Feed not found");
    res.set("Content-Type", "application/xml; charset=utf-8");
    res.send(feed.content);
  });

  app.get("/feeds", async (_req, res) => {
    const custom = await storage.getCustomFeeds();
    const customFeeds: Record<string, string> = {};
    custom.forEach(f => { customFeeds[f.slug] = `/feeds/custom/${f.slug}`; });
    res.json({
      feeds: {
        sitemap: "/sitemap.xml",
        googleMerchantXml: "/feeds/google-merchant.xml",
        googleMerchantJson: "/feeds/google-merchant.json",
        ...customFeeds,
      },
    });
  });

  (async () => {
    try {
      const existing = await storage.getProductBySlug("test-product-do-not-buy");
      if (!existing) {
        const cats = await storage.getCategories();
        const catId = cats.length > 0 ? cats[0].id : null;
        await storage.createProduct({
          name: "TEST PRODUCT - DO NOT BUY",
          slug: "test-product-do-not-buy",
          description: "This is a test product for payment system testing only. Price: £0.01. Free delivery. Do not purchase.",
          price: 0.01,
          costPrice: 0,
          compareAtPrice: null,
          categoryId: catId,
          image: null,
          badge: "TEST",
          inStock: true,
          vendor: "Thorn Tech Solutions",
          mpn: null,
          ean: null,
          stripeProductId: null,
          stripePriceId: null,
        });
        console.log("[Seed] Test product created: test-product-do-not-buy (£0.01, free delivery)");
      }
    } catch (e: any) {
      console.log("[Seed] Test product check:", e.message);
    }
  })();

  return httpServer;
}
