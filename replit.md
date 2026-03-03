# Thorn Tech Solutions Ltd - Online PC Component Store

## Overview
A fully functional e-commerce store for Thorn Tech Solutions Ltd (Company Reg: 17058756), selling PC components and accessories. Full-stack application with React frontend, Express backend, PostgreSQL database, Stripe and PayPal payment integrations, user accounts, and XML feed import system.

## Architecture
- **Frontend**: React + Vite + Tailwind CSS v4 + shadcn/ui components
- **Backend**: Express.js with RESTful API routes
- **Database**: PostgreSQL with Drizzle ORM
- **Payments**: Stripe (card payments via Checkout Sessions) + PayPal (via PayPal Web SDK)
- **Auth**: JWT-based user accounts (bcryptjs + jsonwebtoken)
- **Routing**: wouter (frontend), Express (backend)
- **State**: zustand (cart), TanStack Query (data fetching)

## Data Model
- **Users**: id, email, passwordHash, name, phone, address, city, postcode, createdAt
- **Categories**: id, name, slug, description, icon
- **Products**: id, name, slug, description, price, costPrice, compareAtPrice, categoryId, image, images (JSON array), specs (JSON obj), features (JSON array), badge, inStock, vendor, mpn, ean, enrichedAt, stripeProductId, stripePriceId
- **Orders**: id, userId (nullable), email, name, address, city, postcode, phone, total, status, paymentMethod, paymentId, items, createdAt
- **CustomFeeds**: id, name, slug, content, createdAt, updatedAt
- **FeedSources**: id, name, url, categoryId, intervalHours, enabled, lastImportAt, lastImportCount, lastError, createdAt
- **BlogPosts**: id, title, slug, excerpt, content, image, published, createdAt, updatedAt
- **XeroTokens**: id, accessToken, refreshToken, tenantId, tenantName, expiresAt, createdAt

## Pages
- `/` — Home (hero, categories, product grid, value props)
- `/product/:slug` — Product detail with image gallery, specs, features, related products
- `/category/:slug` — Category listing with brand/price/model filters
- `/search?q=` — Search results with brand/price/model filters
- `/checkout` — Checkout form with Stripe and PayPal payment options
- `/order-confirmation` — Order confirmation with payment verification
- `/login` — User login
- `/register` — User registration
- `/account` — User account dashboard (orders, details, password)
- `/returns` — Returns & Warranty policy (UK Consumer Rights Act 2015 compliant)
- `/contact` — Contact page with form (mailto:thorntech@hotmail.com) and phone (07868 552028)
- `/order-status` — Public order lookup by order number + email, with visual status tracker
- `/blog` — Blog listing (published posts)
- `/blog/:slug` — Individual blog post
- `/admin` — Admin panel (products, categories, orders, feeds, blog, VIP sync, price matching, enrichment)

## VIP Computers Integration
- SOAP API at xml3.vip-computers.com (Account THO23865)
- Syncs products, prices, stock every 6 hours
- Stores MPN and EAN for enrichment lookups
- costPrice stored but NEVER exposed in public API responses
- Pricing: internet-matched price if above cost+VAT+5%; otherwise cost×1.2×1.05 minimum

## Product Enrichment
- `server/productEnricher.ts` — Scrapes UK retailer sites (Scan, Overclockers, eBuyer, etc.) for specs, features, images
- Stores enriched data in: specs (JSON), features (JSON array), images (JSON array of URLs)
- Admin panel has "Enrich Products" button with batch size control
- Tracks progress across batches (continues from where it left off)
- Product page displays: image gallery, key features, full specs table

## Price Matching
- `server/priceMatcher.ts` — Searches DuckDuckGo, Bing, PriceSpy for internet prices
- Runs as background job (500 per batch by default)
- Auto-runs after each VIP sync
- Tracks progress across batches

## Product Filters
- `client/src/components/ProductFilters.tsx` — Reusable filter sidebar
- Filters by: brand (checkbox), price range (min/max + presets), model/keyword search
- Sort by: price, name
- Used on category and search pages

## SEO
- Dynamic page titles, Open Graph + Twitter Card meta tags
- JSON-LD structured data (Store, Product, Breadcrumb)
- Dynamic sitemap.xml with all products, categories, blog posts
- robots.txt blocking /admin and /api/
- Google site verification tag

## Key Files
- `shared/schema.ts` — Drizzle schema
- `server/routes.ts` — All API routes
- `server/storage.ts` — Database storage interface
- `server/vipApi.ts` — VIP Computers SOAP API sync
- `server/priceMatcher.ts` — Internet price matching
- `server/productEnricher.ts` — Web enrichment (specs, features, images)
- `server/feedImporter.ts` — XML feed parser, importer, scheduler
- `server/stripeClient.ts` — Stripe SDK client
- `server/paypalDirect.ts` — PayPal direct checkout
- `client/src/components/ProductCard.tsx` — Product card with placeholder fallback
- `client/src/components/ProductFilters.tsx` — Brand/price/model filters
- `client/src/pages/product.tsx` — Product detail with gallery, specs, features

## Environment Variables
- `DATABASE_URL` — PostgreSQL connection string
- `ADMIN_PASSWORD` — Admin panel password (default: thorntech2024)
- `JWT_SECRET` — JWT signing secret
- `STRIPE_SECRET_KEY` / `STRIPE_PUBLISHABLE_KEY` — Stripe API keys
- `PAYPAL_CLIENT_ID` / `PAYPAL_CLIENT_SECRET` — PayPal API keys
- `VIP_ACCOUNT_ID` / `VIP_USERNAME` / `VIP_PASSWORD` — VIP Computers API
- `XERO_CLIENT_ID` / `XERO_CLIENT_SECRET` — Xero accounting

## VPS Deployment
- Domain: thorntechsolutionsltd.com
- GitHub: github.com/jamesronaldthorn-cpu/thorntech.git
- Deploy: `git pull && npm install && npx drizzle-kit push && npm run build && pm2 restart thorntech`
- Schema changes require `npx drizzle-kit push`

## Design
- Dark tech aesthetic with Orbitron (headings) + Rajdhani (body) fonts
- Purple primary accent (#8b5cf6)
- UK market formatting (£ prices, VAT included, DPD delivery)
- White background for product images, dark gradient placeholder when no image
