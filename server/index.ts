import "dotenv/config";
import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";
import { runMigrations } from "stripe-replit-sync";
import { getStripeSync } from "./stripeClient";
import { WebhookHandlers } from "./webhookHandlers";

const app = express();
const httpServer = createServer(app);

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

async function initStripe() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.warn("DATABASE_URL not set, skipping Stripe init");
    return;
  }

  try {
    console.log("Initializing Stripe schema...");
    await runMigrations({ databaseUrl, schema: "stripe" });
    console.log("Stripe schema ready");

    const stripeSync = await getStripeSync();

    const domain = process.env.REPLIT_DOMAINS?.split(",")[0] || process.env.SITE_DOMAIN;
    if (domain) {
      try {
        const webhookBaseUrl = `https://${domain}`;
        const result = await stripeSync.findOrCreateManagedWebhook(
          `${webhookBaseUrl}/api/stripe/webhook`
        );
        if (result?.webhook?.url) {
          console.log(`Stripe webhook configured: ${result.webhook.url}`);
        } else {
          console.log("Stripe webhook setup completed");
        }
      } catch (webhookErr: any) {
        console.warn("Stripe webhook setup skipped:", webhookErr.message);
      }
    } else {
      console.log("No domain configured — set up Stripe webhooks manually in your Stripe Dashboard");
      console.log("Webhook URL: https://yourdomain.com/api/stripe/webhook");
    }

    stripeSync
      .syncBackfill()
      .then(() => console.log("Stripe data synced"))
      .catch((err: any) => console.error("Stripe sync error:", err));
  } catch (error) {
    console.error("Failed to initialize Stripe:", error);
  }
}

app.post(
  "/api/stripe/webhook",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    const signature = req.headers["stripe-signature"];
    if (!signature) return res.status(400).json({ error: "Missing signature" });

    try {
      const sig = Array.isArray(signature) ? signature[0] : signature;
      if (!Buffer.isBuffer(req.body)) {
        console.error("STRIPE WEBHOOK ERROR: req.body is not a Buffer");
        return res.status(500).json({ error: "Webhook processing error" });
      }
      await WebhookHandlers.processWebhook(req.body as Buffer, sig);
      res.status(200).json({ received: true });
    } catch (error: any) {
      console.error("Webhook error:", error.message);
      res.status(400).json({ error: "Webhook processing error" });
    }
  }
);

app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false }));

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse).substring(0, 200)}`;
      }
      log(logLine);
    }
  });

  next();
});

async function ensureCategories() {
  const { storage } = await import("./storage");
  const required = [
    { name: "Processors (CPUs)", slug: "processors" },
    { name: "Graphics Cards (GPUs)", slug: "graphics-cards" },
    { name: "Motherboards", slug: "motherboards" },
    { name: "Memory (RAM)", slug: "memory" },
    { name: "Storage", slug: "storage" },
    { name: "Power Supplies (PSUs)", slug: "power-supplies" },
    { name: "Cases", slug: "cases" },
    { name: "Cooling", slug: "cooling" },
    { name: "Monitors", slug: "monitors" },
    { name: "Keyboards", slug: "keyboards" },
    { name: "Mice", slug: "mice" },
    { name: "Headsets & Audio", slug: "headsets-audio" },
    { name: "Networking", slug: "networking" },
    { name: "Controllers & Gaming", slug: "controllers-gaming" },
    { name: "Cables & Adapters", slug: "cables-adapters" },
    { name: "Optical Drives", slug: "optical-drives" },
    { name: "Pre-Built PCs", slug: "pre-built-pcs" },
    { name: "Laptops", slug: "laptops" },
    { name: "Software", slug: "software" },
    { name: "Accessories", slug: "accessories" },
    { name: "Printers", slug: "printers" },
    { name: "Ink & Toner", slug: "ink-toner" },
    { name: "Scanners & Multifunction", slug: "scanners-multifunction" },
    { name: "Servers & Workstations", slug: "servers-workstations" },
    { name: "Security & CCTV", slug: "security-cctv" },
    { name: "Smart Home", slug: "smart-home" },
    { name: "Webcams & Cameras", slug: "webcams-cameras" },
    { name: "UPS & Power Protection", slug: "ups-power-protection" },
    { name: "Paper & Office Supplies", slug: "paper-supplies" },
  ];

  try {
    const existing = await storage.getCategories();
    const existingSlugs = new Set(existing.map(c => c.slug));
    let created = 0;
    for (const cat of required) {
      if (!existingSlugs.has(cat.slug)) {
        await storage.createCategory(cat);
        created++;
      }
    }
    if (created > 0) {
      console.log(`[Categories] Created ${created} missing categories`);
    }
  } catch (e: any) {
    console.error("[Categories] Error seeding:", e.message);
  }
}

const PHONE_IMAGE_DOMAINS = [
  "gsmarena.com", "phonearena.com", "91mobiles.com", "smartprix.com",
  "kimovil.com", "carphonewarehouse.com", "mobiles.co.uk", "fonehouse.co.uk",
];
const PHONE_IMAGE_KEYWORDS = [
  "smartphone", "mobile-phone", "iphone", "galaxy-s", "galaxy-a", "galaxy-m",
  "pixel-phone", "android-phone", "/phones/", "phone-case", "screen-protector",
  "handset", "cellphone", "gsmarena", "phonearena",
];

function isPhoneImageUrl(url: string): boolean {
  const lower = url.toLowerCase();
  return PHONE_IMAGE_DOMAINS.some(d => lower.includes(d)) ||
    PHONE_IMAGE_KEYWORDS.some(k => lower.includes(k));
}

async function autoFixCategories() {
  try {
    const { storage } = await import("./storage");
    const { nameBasedCategoryOverride } = await import("./targetApi");
    const categories = await storage.getCategories();
    const catBySlug = new Map(categories.map((c: any) => [c.slug, c.id]));
    const catById = new Map(categories.map((c: any) => [c.id, c.slug]));
    let fixed = 0;
    let phonesCleared = 0;

    // Pass 1: SQL-based RAM rescue (catches all misplaced RAM regardless of category)
    const sqlResult = await storage.fixRamCategories();
    fixed += sqlResult.fixed;
    for (const detail of sqlResult.details) {
      console.log(`[AutoFix-SQL] ${detail}`);
    }

    // Pass 2: nameBasedCategoryOverride for remaining products
    const allProducts = await storage.getProducts();
    const { isImageMismatch } = await import("./productEnricher");
    const isBadImage = (name: string, url: string) => isPhoneImageUrl(url) || !!isImageMismatch(name, url);

    for (const p of allProducts) {
      // Fix wrong categories
      const override = nameBasedCategoryOverride(p.name, catBySlug);
      if (override && override !== p.categoryId) {
        await storage.updateProduct(p.id, { categoryId: override });
        fixed++;
        console.log(`[AutoFix] Moved "${p.name.substring(0, 60)}" → ${catById.get(override)}`);
      }

      // Clear phone images AND cross-category mismatch images

      const hasPhoneImage = (p.image && isBadImage(p.name, p.image));
      let cleanedImages: string[] | null = null;
      if (p.images) {
        try {
          const arr: string[] = JSON.parse(p.images as string);
          const filtered = arr.filter(img => !isBadImage(p.name, img));
          if (filtered.length !== arr.length) cleanedImages = filtered;
        } catch {}
      }
      if (hasPhoneImage || cleanedImages) {
        const updates: any = {};
        if (hasPhoneImage) { updates.image = null; updates.enrichedAt = null; }
        if (cleanedImages !== null) updates.images = JSON.stringify(cleanedImages);
        await storage.updateProduct(p.id, updates);
        phonesCleared++;
        if (hasPhoneImage) console.log(`[AutoFix] Cleared bad/mismatched image from "${p.name.substring(0, 60)}"`);
      }
    }

    if (fixed > 0) console.log(`[AutoFix] Re-categorised ${fixed} misplaced products`);
    if (phonesCleared > 0) console.log(`[AutoFix] Cleared phone images from ${phonesCleared} products`);
    if (fixed === 0 && phonesCleared === 0) console.log(`[AutoFix] All ${allProducts.length} products OK`);
  } catch (e: any) {
    console.error("[AutoFix] Error:", e.message);
  }
}

(async () => {
  await initStripe();
  await ensureCategories();
  await autoFixCategories();
  await registerRoutes(httpServer, app);

  const { startFeedScheduler } = await import("./feedImporter");
  startFeedScheduler();

  const { startVipScheduler } = await import("./vipApi");
  startVipScheduler(6);

  const { startMidnightEnricher } = await import("./productEnricher");
  startMidnightEnricher();

  const { startTargetScheduler } = await import("./targetApi");
  startTargetScheduler(6);

  app.use((err: any, _req: Request, res: Response, next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    console.error("Internal Server Error:", err);
    if (res.headersSent) return next(err);
    return res.status(status).json({ message });
  });

  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  const port = parseInt(process.env.PORT || "5000", 10);
  httpServer.listen({ port, host: "0.0.0.0", reusePort: true }, () => {
    log(`serving on port ${port}`);
  });
})();
