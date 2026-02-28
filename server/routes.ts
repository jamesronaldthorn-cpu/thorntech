import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { getUncachableStripeClient, getStripePublishableKey } from "./stripeClient";
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
      const { items, email, name, address, city, postcode, phone } = req.body;
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

      const order = await storage.createOrder({
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
              fixed_amount: { amount: total >= 150 ? 0 : 599, currency: "gbp" },
              display_name: total >= 150 ? "Free Next Day DPD Delivery" : "Next Day DPD Delivery",
              delivery_estimate: {
                minimum: { unit: "business_day", value: 1 },
                maximum: { unit: "business_day", value: 2 },
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
      const { items, email, name, address, city, postcode, phone } = req.body;
      if (!items || !items.length || !email || !name || !address || !city || !postcode) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      const allProducts = await storage.getProducts();
      const productMap = new Map(allProducts.map(p => [p.id, p]));

      const total = items.reduce((sum: number, item: { productId: number; quantity: number }) => {
        const product = productMap.get(item.productId);
        return sum + (product ? product.price * item.quantity : 0);
      }, 0);

      const shipping = total >= 150 ? 0 : 5.99;
      const grandTotal = total + shipping;

      const order = await storage.createOrder({
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

  let paypalLoaded = false;
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

  app.post("/api/admin/login", (req, res) => {
    const { password } = req.body;
    if (password === ADMIN_PASSWORD) {
      res.json({ success: true });
    } else {
      res.status(401).json({ error: "Invalid password" });
    }
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
    });
  });

  return httpServer;
}
