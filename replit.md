# Thorn Tech Solutions Ltd - Online PC Component Store

## Overview
A fully functional e-commerce store for Thorn Tech Solutions Ltd (Company Reg: 17058756), selling PC components and accessories. Full-stack application with React frontend, Express backend, PostgreSQL database, Stripe and PayPal payment integrations, plus a Shopify Liquid theme export.

## Architecture
- **Frontend**: React + Vite + Tailwind CSS v4 + shadcn/ui components
- **Backend**: Express.js with RESTful API routes
- **Database**: PostgreSQL with Drizzle ORM
- **Payments**: Stripe (card payments via Checkout Sessions) + PayPal (via PayPal Web SDK)
- **Routing**: wouter (frontend), Express (backend)
- **State**: zustand (cart), TanStack Query (data fetching)

## Data Model
- **Categories**: id, name, slug, description, icon
- **Products**: id, name, slug, description, price, compareAtPrice, categoryId, image, badge, inStock, vendor, stripeProductId, stripePriceId
- **Orders**: id, email, name, address, city, postcode, phone, total, status, paymentMethod, paymentId, items, createdAt

## Pages
- `/` — Home (hero, categories, product grid, value props)
- `/product/:slug` — Product detail with add to basket, related products
- `/category/:slug` — Category listing with filter tabs
- `/checkout` — Checkout form with Stripe and PayPal payment options
- `/order-confirmation` — Order confirmation with payment verification

## API Routes
- `GET /api/categories` — All categories
- `GET /api/categories/:slug` — Single category
- `GET /api/categories/:slug/products` — Products in category
- `GET /api/products` — All products
- `GET /api/products/:slug` — Single product
- `POST /api/checkout/stripe` — Create Stripe Checkout Session
- `GET /api/checkout/stripe/verify/:sessionId` — Verify Stripe payment
- `POST /api/checkout/paypal/create` — Create PayPal order
- `POST /api/checkout/paypal/confirm` — Confirm PayPal payment
- `GET /api/orders/:id` — Get order details
- `GET /api/stripe/publishable-key` — Stripe publishable key
- `POST /api/stripe/webhook` — Stripe webhook handler

## XML Feeds
- `/feeds/google-shopping.xml` — Google Shopping feed
- `/feeds/facebook.xml` — Facebook/Meta catalogue feed
- `/feeds/products.xml` — Generic product feed
- `/sitemap.xml` — XML sitemap
- `/feeds` — Feed index

## PayPal Routes (from integration blueprint)
- `GET /paypal/setup` — PayPal client token
- `POST /paypal/order` — Create PayPal order
- `POST /paypal/order/:orderID/capture` — Capture PayPal order

## Key Files
- `shared/schema.ts` — Drizzle schema
- `server/routes.ts` — All API routes
- `server/storage.ts` — Database storage interface
- `server/stripeClient.ts` — Stripe SDK client (Replit connector)
- `server/webhookHandlers.ts` — Stripe webhook processing
- `server/paypal.ts` — PayPal SDK integration
- `server/seed.ts` — Database seeder
- `client/src/lib/cart.ts` — Zustand cart store
- `client/src/components/NavBar.tsx` — Navigation with cart drawer
- `client/src/components/Footer.tsx` — Site footer
- `client/src/components/ProductCard.tsx` — Reusable product card

## Integrations
- **Stripe**: Works with Replit connector or standard env vars (STRIPE_SECRET_KEY / STRIPE_PUBLISHABLE_KEY)
- **PayPal**: Requires PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET env vars

## Self-Hosting
- See `DEPLOY.md` for full self-hosting guide
- See `.env.example` for required environment variables
- Build: `npm run build` → output in `dist/`
- Start: `npm start` (runs `dist/index.cjs`)
- Uses `dotenv` to load `.env` file automatically

## Design
- Dark tech aesthetic with Orbitron (headings) + Rajdhani (body) fonts
- Purple primary accent (#8b5cf6)
- UK market formatting (£ prices, VAT included, DPD delivery)

## Shopify Theme
Native Shopify Liquid theme at `shopify-theme/` and `thorn_tech_shopify_theme.zip`
