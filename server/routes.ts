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
    `  <url><loc>${siteUrl}/returns</loc><changefreq>monthly</changefreq><priority>0.5</priority><lastmod>${now}</lastmod></url>`,
    `  <url><loc>${siteUrl}/privacy</loc><changefreq>monthly</changefreq><priority>0.5</priority><lastmod>${now}</lastmod></url>`,
    `  <url><loc>${siteUrl}/contact</loc><changefreq>monthly</changefreq><priority>0.7</priority><lastmod>${now}</lastmod></url>`,
    `  <url><loc>${siteUrl}/about</loc><changefreq>monthly</changefreq><priority>0.7</priority><lastmod>${now}</lastmod></url>`,
    `  <url><loc>${siteUrl}/reviews</loc><changefreq>weekly</changefreq><priority>0.7</priority><lastmod>${now}</lastmod></url>`,
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

  app.use((req, res, next) => {
    // Security headers
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
    res.setHeader("Content-Security-Policy", "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.paypal.com https://www.google-analytics.com https://ssl.google-analytics.com https://www.googletagmanager.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob: https: http:; connect-src 'self' https://www.paypal.com https://api.stripe.com https://www.google-analytics.com; frame-src 'self' https://www.paypal.com https://js.stripe.com;");

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

  async function tryCreateAccountOnCheckout(email: string, password: string, name: string, phone: string | null, address: string, city: string, postcode: string): Promise<{ userId: number | null; accountCreated: boolean }> {
    try {
      const existing = await storage.getUserByEmail(email.toLowerCase());
      if (existing) return { userId: existing.id, accountCreated: false };
      const passwordHash = await bcrypt.hash(password, 12);
      const user = await storage.createUser({
        email: email.toLowerCase(),
        passwordHash,
        name,
        phone: phone || null,
        address,
        city,
        postcode,
      });
      console.log(`[Checkout] Account created for ${email} (user ${user.id})`);
      return { userId: user.id, accountCreated: true };
    } catch (e: any) {
      console.error(`[Checkout] Account creation failed for ${email}:`, e.message);
      return { userId: null, accountCreated: false };
    }
  }

  app.post("/api/checkout/stripe", async (req, res) => {
    try {
      const { items, email, name, address, city, postcode, phone, userId, createAccount, password } = req.body;
      if (!items || !items.length || !email || !name || !address || !city || !postcode) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      let finalUserId = userId || null;
      let accountCreated = false;
      if (createAccount && password && !userId) {
        const result = await tryCreateAccountOnCheckout(email, password, name, phone, address, city, postcode);
        finalUserId = result.userId;
        accountCreated = result.accountCreated;
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
        userId: finalUserId,
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
        metadata: { orderId: order.id.toString(), orderNumber: `TTS-${String(order.id).padStart(5, "0")}` },
        payment_intent_data: {
          description: `Thorn Tech Solutions Order TTS-${String(order.id).padStart(5, "0")}`,
          metadata: { orderId: order.id.toString(), orderNumber: `TTS-${String(order.id).padStart(5, "0")}` },
        },
      });

      await storage.updateOrderStatus(order.id, "awaiting_payment", session.id);

      res.json({ url: session.url, sessionId: session.id, accountCreated });
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
      const { items, email, name, address, city, postcode, phone, userId, createAccount, password } = req.body;
      if (!items || !items.length || !email || !name || !address || !city || !postcode) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      let finalUserId = userId || null;
      let accountCreated = false;
      if (createAccount && password && !userId) {
        const result = await tryCreateAccountOnCheckout(email, password, name, phone, address, city, postcode);
        finalUserId = result.userId;
        accountCreated = result.accountCreated;
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
        userId: finalUserId,
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
              description: `Thorn Tech Solutions Order TTS-${String(order.id).padStart(5, "0")}`,
              invoice_id: `TTS-${String(order.id).padStart(5, "0")}`,
              custom_id: String(order.id),
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
        res.json({ approvalUrl: approvalLink.href, orderId: order.id, accountCreated });
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

  app.post("/api/basket-event", async (req, res) => {
    try {
      const { productId, productName, productPrice, quantity } = req.body;
      if (!productId || !productName) return res.status(400).json({ error: "Missing fields" });
      const ip = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || req.socket.remoteAddress || "";
      const userAgent = req.headers["user-agent"] || "";
      await storage.recordBasketEvent(productId, productName, productPrice || 0, quantity || 1, ip, userAgent);
      res.json({ ok: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/admin/stats", adminAuth, async (_req, res) => {
    try {
      const [pageStats, basketStats] = await Promise.all([
        storage.getPageViewStats(),
        storage.getBasketStats(),
      ]);
      res.json({ ...pageStats, basket: basketStats });
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

  app.get("/api/reviews", async (_req, res) => {
    const reviews = await storage.getReviews(true);
    res.json(reviews);
  });

  app.post("/api/reviews", async (req, res) => {
    try {
      const { name, location, email, rating, title, text, product } = req.body;
      if (!name || !rating || !title || !text) {
        return res.status(400).json({ error: "Name, rating, title and review text are required" });
      }
      if (rating < 1 || rating > 5) {
        return res.status(400).json({ error: "Rating must be between 1 and 5" });
      }
      const review = await storage.createReview({ name, location: location || null, email: email || null, rating, title, text, product: product || null });
      res.json({ success: true, message: "Thank you! Your review has been submitted and will appear once approved.", review });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/admin/reviews", adminAuth, async (_req, res) => {
    const reviews = await storage.getReviews(false);
    res.json(reviews);
  });

  app.post("/api/admin/reviews/:id/approve", adminAuth, async (req, res) => {
    const review = await storage.approveReview(parseInt(req.params.id));
    if (!review) return res.status(404).json({ error: "Review not found" });
    res.json(review);
  });

  app.delete("/api/admin/reviews/:id", adminAuth, async (req, res) => {
    const deleted = await storage.deleteReview(parseInt(req.params.id));
    if (!deleted) return res.status(404).json({ error: "Review not found" });
    res.json({ success: true });
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

  app.get("/api/admin/vip/debug-price/:sku", adminAuth, async (req, res) => {
    try {
      const sku = parseInt(req.params.sku);
      const result = await vipApi.debugProductPrice(sku);
      res.json(result);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  let syncStatus: { running: boolean; result: any; error: string | null } = { running: false, result: null, error: null };

  app.post("/api/admin/vip/sync", adminAuth, async (_req, res) => {
    if (syncStatus.running) {
      return res.json({ status: "running", message: "Sync is already in progress. Check status endpoint." });
    }
    syncStatus = { running: true, result: null, error: null };
    res.json({ status: "started", message: "VIP sync started in background. Check status for results." });

    try {
      const result = await vipApi.syncVipProducts();
      const dedupRemoved = await vipApi.deduplicateProducts();
      if (dedupRemoved > 0) {
        console.log(`[VIP] Post-sync dedup: removed ${dedupRemoved} duplicates`);
      }
      syncStatus = { running: false, result: { ...result, dedupRemoved }, error: null };
      console.log(`[VIP] Sync complete: ${result.imported} new, ${result.updated} updated`);

      const allProducts = await storage.getProducts();
      const noImage = allProducts.filter(p => !p.image && p.inStock);
      console.log(`[VIP] Post-sync: ${noImage.length} in-stock products have no image — will attempt pull`);
      if (noImage.length > 0) {
        try {
          const { pullMissingImages } = await import("./productEnricher");
          pullMissingImages().then(r => {
            console.log(`[VIP→PullImages] Auto-pull complete: ${r.updated} images found, ${r.skipped} skipped, ${r.errors} errors`);
          }).catch(e => console.error("[VIP→PullImages] Auto-pull error:", e.message));
        } catch (e: any) {
          console.error("[VIP→PullImages] Failed to start auto-pull:", e.message);
        }
      }
    } catch (e: any) {
      console.error("[VIP] Sync error:", e);
      syncStatus = { running: false, result: null, error: e.message };
    }
  });

  app.get("/api/admin/vip/sync/status", adminAuth, async (_req, res) => {
    res.json(syncStatus);
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
    res.json({ ...priceMatchStatus, matchedSoFar: progress.matched, current: progress.current, total: progress.total, currentProduct: progress.currentProduct });
  });

  app.post("/api/admin/vip/match-prices/reset", adminAuth, async (_req, res) => {
    resetMatchProgress();
    res.json({ success: true, message: "Price match progress reset. Next batch will start from the beginning." });
  });

  app.post("/api/admin/fix-images", adminAuth, async (_req, res) => {
    res.json({ status: "started", message: "Checking and fixing broken images in background..." });

    try {
      const allProducts = await storage.getProducts();
      let fixed = 0;
      let cleared = 0;

      for (const p of allProducts) {
        if (!p.image) continue;

        try {
          const check = await fetch(p.image, {
            method: "HEAD",
            signal: AbortSignal.timeout(5000),
            headers: { "User-Agent": "Mozilla/5.0" },
          });
          if (check.ok) continue;
        } catch {}

        let replacementImage: string | null = null;
        if (p.images) {
          try {
            const extras = JSON.parse(p.images as string);
            if (Array.isArray(extras)) {
              for (const img of extras) {
                try {
                  const c = await fetch(img, { method: "HEAD", signal: AbortSignal.timeout(5000), headers: { "User-Agent": "Mozilla/5.0" } });
                  if (c.ok) { replacementImage = img; break; }
                } catch {}
              }
            }
          } catch {}
        }

        if (replacementImage) {
          await storage.updateProduct(p.id, { image: replacementImage });
          fixed++;
          console.log(`[FixImages] Replaced: "${p.name}" → ${replacementImage}`);
        } else {
          await storage.updateProduct(p.id, { image: null } as any);
          cleared++;
          console.log(`[FixImages] Cleared broken image: "${p.name}"`);
        }
      }

      console.log(`[FixImages] Done: ${fixed} replaced, ${cleared} cleared, ${allProducts.length} total checked`);
    } catch (e: any) {
      console.error("[FixImages] Error:", e.message);
    }
  });

  app.post("/api/admin/pull-images", adminAuth, async (_req, res) => {
    const { getPullImageProgress } = await import("./productEnricher");
    const progress = getPullImageProgress();
    if (progress.running) {
      return res.json({ status: "already_running", message: "Image pulling is already in progress" });
    }

    res.json({ status: "started", message: "Pulling images from Amazon for products missing images..." });

    try {
      const { pullMissingImages } = await import("./productEnricher");
      const result = await pullMissingImages();
      console.log(`[PullImages] Done: ${result.updated} images pulled, ${result.skipped} skipped, ${result.errors} errors`);
    } catch (e: any) {
      console.error("[PullImages] Error:", e.message);
    }
  });

  app.post("/api/admin/tag-sources", adminAuth, async (_req, res) => {
    try {
      const allProducts = await storage.getProducts();
      let tagged = 0;
      for (const p of allProducts) {
        if (!(p as any).source && p.mpn) {
          await storage.updateProduct(p.id, { source: "VIP Computers" } as any);
          tagged++;
        }
      }
      res.json({ tagged, message: `Tagged ${tagged} products with VIP Computers source.` });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/admin/upgrade-images", adminAuth, async (_req, res) => {
    try {
      const allProducts = await storage.getProducts();
      let upgraded = 0;
      for (const p of allProducts) {
        const updates: Record<string, any> = {};
        if (p.image && p.image.includes("_AC_SL500_")) {
          updates.image = p.image.replace(/_AC_SL500_/g, "_AC_SL1500_");
        }
        if (p.images) {
          const parsed = JSON.parse(p.images as string);
          if (Array.isArray(parsed)) {
            const upgraded_imgs = parsed.map((img: string) => img.replace(/_AC_SL500_/g, "_AC_SL1500_"));
            if (JSON.stringify(upgraded_imgs) !== JSON.stringify(parsed)) {
              updates.images = JSON.stringify(upgraded_imgs);
            }
          }
        }
        if (Object.keys(updates).length > 0) {
          await storage.updateProduct(p.id, updates);
          upgraded++;
        }
      }
      res.json({ upgraded, message: `Upgraded ${upgraded} product images to high resolution.` });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/admin/clear-bad-images", adminAuth, async (_req, res) => {
    try {
      const allProducts = await storage.getProducts();
      let cleared = 0;
      for (const p of allProducts) {
        if (p.image && p.image.includes("media-amazon.com")) {
          await storage.updateProduct(p.id, { image: null, images: null, enrichedAt: null });
          cleared++;
        }
      }
      res.json({ cleared, message: `Cleared ${cleared} Amazon images. Run "Pull Missing Images" to re-fetch them.` });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/admin/pull-images/status", adminAuth, async (_req, res) => {
    const { getPullImageProgress } = await import("./productEnricher");
    res.json(getPullImageProgress());
  });

  app.post("/api/admin/fix-prices", adminAuth, async (_req, res) => {
    try {
      const allProducts = await storage.getProducts();
      let fixed = 0;
      for (const p of allProducts) {
        if (p.costPrice && p.costPrice > 0) {
          const correctSell = Math.ceil(p.costPrice * 1.2 * 1.02 * 100) / 100;
          if (Math.abs(p.price - correctSell) > 1) {
            console.log(`[FixPrices] ${p.name}: £${p.price.toFixed(2)} → £${correctSell.toFixed(2)} (cost £${p.costPrice.toFixed(2)})`);
            await storage.updateProduct(p.id, { price: correctSell });
            fixed++;
          }
        }
      }
      res.json({ success: true, fixed, total: allProducts.length });
    } catch (e: any) {
      res.json({ error: e.message });
    }
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
    res.json({ ...enrichStatus, enrichedSoFar: progress.enriched, current: progress.current, total: progress.total, currentProduct: progress.currentProduct });
  });

  app.post("/api/admin/enrich-products/reset-empty", adminAuth, async (_req, res) => {
    try {
      const allProducts = await storage.getProducts();
      let cleared = 0;
      for (const p of allProducts) {
        if (!p.enrichedAt) continue;
        const specs = p.specs ? (typeof p.specs === "string" ? JSON.parse(p.specs) : p.specs) : {};
        const specCount = Object.keys(specs).length;
        if (specCount < 3) {
          await storage.updateProduct(p.id, { enrichedAt: null } as any);
          cleared++;
        }
      }
      res.json({ success: true, message: `Reset ${cleared} products with fewer than 3 specs for re-enrichment.` });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
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

  let purgeStatus: { running: boolean; result: any } = { running: false, result: null };

  app.post("/api/admin/purge-dead-products", adminAuth, async (_req, res) => {
    if (purgeStatus.running) {
      return res.json({ status: "running", message: "Purge is already in progress" });
    }
    purgeStatus = { running: true, result: null };
    res.json({ status: "started", message: "Purging dead products in background..." });

    try {
      const result = await vipApi.purgeDeadProducts();
      purgeStatus = { running: false, result: { ...result, message: `Removed ${result.removed} dead products. ${result.total - result.removed} remaining (VIP has ${result.vipCount}).` } };
    } catch (e: any) {
      console.error("[Purge] Error:", e);
      purgeStatus = { running: false, result: { error: e.message } };
    }
  });

  app.get("/api/admin/purge-dead-products/status", adminAuth, async (_req, res) => {
    res.json(purgeStatus);
  });

  app.post("/api/admin/deduplicate", adminAuth, async (_req, res) => {
    try {
      const removed = await vipApi.deduplicateProducts();
      res.json({ success: true, removed, message: `Removed ${removed} duplicate products.` });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
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

    try {
      const duplicateToMain: Record<string, string> = {
        "adapters-docks": "cables-adapters",
        "cables": "cables-adapters",
        "capture-cards": "accessories",
        "chargers": "accessories",
        "coolers": "cooling",
        "dj-equipment": "accessories",
        "display-accessories": "monitors",
        "exclusive-bundles": "pre-built-pcs",
        "external-storage": "storage",
        "gaming-accessories": "controllers-gaming",
        "gaming-furniture": "accessories",
        "gaming-surfaces-mats": "accessories",
        "graphics-cards-gpu": "graphics-cards",
        "hard-drives": "storage",
        "headsets": "headsets-audio",
        "io-cards": "accessories",
        "networking-wired": "networking",
        "networking-wireless": "networking",
        "notebooks": "laptops",
        "power-supply-units": "power-supplies",
        "projectors": "monitors",
        "server-boards-systems": "pre-built-pcs",
        "solid-state-drives": "storage",
        "speakers": "headsets-audio",
        "streaming": "accessories",
        "systems": "pre-built-pcs",
        "toys": "accessories",
        "webcams": "accessories",
      };

      const allCats = await storage.getCategories();
      const catBySlug = new Map(allCats.map(c => [c.slug, c]));
      const allProds = await storage.getProducts();
      let reassigned = 0;
      let deleted = 0;

      for (const [dupSlug, mainSlug] of Object.entries(duplicateToMain)) {
        const dupCat = catBySlug.get(dupSlug);
        const mainCat = catBySlug.get(mainSlug);
        if (!dupCat) continue;
        if (!mainCat) continue;

        const prodsInDup = allProds.filter(p => p.categoryId === dupCat.id);
        for (const p of prodsInDup) {
          await storage.updateProduct(p.id, { categoryId: mainCat.id });
          reassigned++;
        }

        await storage.deleteCategory(dupCat.id);
        deleted++;
      }

      if (deleted > 0) {
        console.log(`[Cleanup] Consolidated categories: ${reassigned} products reassigned, ${deleted} duplicate categories removed`);
      }
    } catch (e: any) {
      console.log("[Cleanup] Category consolidation:", e.message);
    }
  })();

  app.get("/api/img-proxy", async (req, res) => {
    const url = req.query.url as string;
    if (!url) return res.status(400).send("Missing url parameter");

    try {
      const parsed = new URL(url);
      if (!["http:", "https:"].includes(parsed.protocol)) {
        return res.status(400).send("Invalid URL");
      }

      const response = await fetch(url, {
        signal: AbortSignal.timeout(8000),
        headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" },
      });

      if (!response.ok) {
        return res.status(response.status).send("Image not found");
      }

      const contentType = response.headers.get("content-type");
      if (contentType) res.setHeader("Content-Type", contentType);
      res.setHeader("Cache-Control", "public, max-age=86400");

      const buffer = Buffer.from(await response.arrayBuffer());
      res.send(buffer);
    } catch {
      res.status(502).send("Failed to fetch image");
    }
  });

  return httpServer;
}
