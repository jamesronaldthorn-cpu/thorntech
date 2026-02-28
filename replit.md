# Thorn Tech Solutions Ltd - Online PC Component Store

## Overview
An online store for Thorn Tech Solutions Ltd (Company Reg: 17058756), selling PC components and accessories. Built as a full-stack application with a React frontend and Express backend, plus a Shopify Liquid theme export.

## Architecture
- **Frontend**: React + Vite + Tailwind CSS v4 + shadcn/ui components
- **Backend**: Express.js with RESTful API routes
- **Database**: PostgreSQL with Drizzle ORM
- **Routing**: wouter (frontend), Express (backend)
- **Data fetching**: TanStack Query

## Data Model
- **Categories**: id, name, slug, description, icon (8 categories: GPUs, CPUs, Motherboards, Memory, Storage, Cooling, Cases, Peripherals)
- **Products**: id, name, slug, description, price, compareAtPrice, categoryId, image, badge, inStock, vendor (20 seeded products)

## API Routes
- `GET /api/categories` - All categories
- `GET /api/categories/:slug` - Single category by slug
- `GET /api/categories/:slug/products` - Products in a category
- `GET /api/products` - All products
- `GET /api/products/:slug` - Single product by slug

## XML Feeds
- `GET /feeds/google-shopping.xml` - Google Shopping / Merchant Center feed (RSS 2.0 + g: namespace)
- `GET /feeds/facebook.xml` - Facebook / Meta Commerce catalogue feed
- `GET /feeds/products.xml` - Generic product XML feed for price comparison sites
- `GET /sitemap.xml` - XML sitemap for SEO (all pages, categories, products)
- `GET /feeds` - JSON index listing all available feed URLs

## Key Files
- `shared/schema.ts` - Drizzle schema for categories and products
- `server/routes.ts` - API endpoints
- `server/storage.ts` - Database storage interface
- `server/seed.ts` - Database seeder with initial data
- `client/src/pages/home.tsx` - Main storefront page
- `client/src/index.css` - Theme variables (dark tech aesthetic)

## Shopify Theme Export
A native Shopify Liquid theme is available at `shopify-theme/` and zipped as `thorn_tech_shopify_theme.zip`. It includes layout, sections, snippets, config, locales, and assets matching the React design.

## Design
- Dark tech aesthetic with Orbitron (headings) + Rajdhani (body) fonts
- Purple primary accent (#8b5cf6)
- UK market formatting (£ prices, VAT included, DPD delivery)
