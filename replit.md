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
- **Products**: id, name, slug, description, price, compareAtPrice, categoryId, image, badge, inStock, vendor, stripeProductId, stripePriceId
- **Orders**: id, userId (nullable), email, name, address, city, postcode, phone, total, status, paymentMethod, paymentId, items, createdAt
- **CustomFeeds**: id, name, slug, content, createdAt, updatedAt
- **FeedSources**: id, name, url, categoryId, intervalHours, enabled, lastImportAt, lastImportCount, lastError, createdAt

## Pages
- `/` — Home (hero, categories, product grid, value props)
- `/product/:slug` — Product detail with add to basket, related products
- `/category/:slug` — Category listing with filter tabs
- `/checkout` — Checkout form with Stripe and PayPal payment options
- `/order-confirmation` — Order confirmation with payment verification
- `/login` — User login
- `/register` — User registration
- `/account` — User account dashboard (orders, details, password)
- `/returns` — Returns & Warranty policy (UK Consumer Rights Act 2015 compliant)
- `/contact` — Contact page with form (mailto:thorntech@hotmail.com) and phone (07868 552028)
- `/admin` — Admin panel (products, categories, orders, feeds)

## API Routes
### Auth
- `POST /api/auth/register` — Create user account
- `POST /api/auth/login` — Login, returns JWT
- `GET /api/auth/me` — Get current user profile (JWT required)
- `PUT /api/auth/me` — Update user profile (JWT required)
- `PUT /api/auth/password` — Change password (JWT required)
- `GET /api/auth/orders` — Get user's order history (JWT required)

### Public
- `GET /api/categories` — All categories
- `GET /api/categories/:slug` — Single category
- `GET /api/categories/:slug/products` — Products in category
- `GET /api/products` — All products
- `GET /api/products/:slug` — Single product
- `GET /api/orders/:id` — Get order details

### Checkout
- `POST /api/checkout/stripe` — Create Stripe Checkout Session
- `GET /api/checkout/stripe/verify/:sessionId` — Verify Stripe payment
- `POST /api/checkout/paypal/create` — Create PayPal order
- `GET /api/checkout/paypal/return` — PayPal return/capture
- `POST /api/checkout/paypal/confirm` — Confirm PayPal payment
- `GET /api/stripe/publishable-key` — Stripe publishable key
- `POST /api/stripe/webhook` — Stripe webhook handler

### Admin (requires ADMIN_PASSWORD)
- Full CRUD for products, categories, orders, custom feeds, feed sources
- `POST /api/admin/import-feed` — Import products from XML feed URL
- `POST /api/admin/feed-sources/:id/run` — Manually trigger feed import

## XML Feeds
- `/sitemap.xml` — XML sitemap
- `/feeds/custom/:slug` — Custom uploaded feeds
- `/feeds` — Feed index

## Key Files
- `shared/schema.ts` — Drizzle schema (users, categories, products, orders, customFeeds, feedSources)
- `server/routes.ts` — All API routes including auth
- `server/storage.ts` — Database storage interface
- `server/feedImporter.ts` — XML feed parser, importer, and auto-scheduler
- `server/stripeClient.ts` — Stripe SDK client (Replit connector)
- `server/webhookHandlers.ts` — Stripe webhook processing
- `server/paypalDirect.ts` — PayPal direct checkout (redirects to PayPal)
- `server/paypal.ts` — PayPal SDK integration
- `client/src/lib/auth.tsx` — Auth context provider (JWT, login, register, logout)
- `client/src/lib/cart.ts` — Zustand cart store
- `client/src/pages/account.tsx` — Login, Register, and Account dashboard pages
- `client/src/components/NavBar.tsx` — Navigation with cart drawer and user account link
- `client/src/components/Footer.tsx` — Site footer
- `client/src/components/ProductCard.tsx` — Reusable product card
- `client/src/pages/returns.tsx` — Returns & Warranty policy page
- `client/src/pages/contact.tsx` — Contact Us page with form

## Integrations
- **Stripe**: Works with Replit connector or standard env vars (STRIPE_SECRET_KEY / STRIPE_PUBLISHABLE_KEY)
- **PayPal**: Requires PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET env vars

## Environment Variables
- `DATABASE_URL` — PostgreSQL connection string
- `ADMIN_PASSWORD` — Admin panel password (default: thorntech2024)
- `JWT_SECRET` — JWT signing secret (set a strong random value for production)
- `STRIPE_SECRET_KEY` / `STRIPE_PUBLISHABLE_KEY` — Stripe API keys
- `PAYPAL_CLIENT_ID` / `PAYPAL_CLIENT_SECRET` — PayPal API keys

## Self-Hosting
- See `DEPLOY.md` for full self-hosting guide
- See `.env.example` for required environment variables
- Build: `npm run build` → output in `dist/`
- Start: `npm start` (runs `dist/index.cjs`)
- Uses `dotenv` to load `.env` file automatically
- VPS deploy: `git pull && npm install && npm run db:push && npm run build && pm2 restart thorntech`

## Design
- Dark tech aesthetic with Orbitron (headings) + Rajdhani (body) fonts
- Purple primary accent (#8b5cf6)
- UK market formatting (£ prices, VAT included, DPD delivery)
