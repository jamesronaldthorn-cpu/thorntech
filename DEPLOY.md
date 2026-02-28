# Self-Hosting Guide — Thorn Tech Solutions

This guide covers deploying the Thorn Tech Solutions store to your own server.

---

## Server Requirements

- **Node.js** 20 or higher
- **PostgreSQL** 14 or higher
- **A domain name** with SSL certificate (required for Stripe/PayPal)
- **Reverse proxy** (Nginx or Caddy recommended)

---

## 1. Get the Code

Download the project files from Replit, or push to GitHub and clone:

```bash
git clone https://github.com/your-repo/thorn-tech-store.git
cd thorn-tech-store
```

---

## 2. Install Dependencies

```bash
npm install
```

---

## 3. Set Up PostgreSQL

Create a database:

```bash
sudo -u postgres createdb thorntech
```

---

## 4. Configure Environment Variables

Create a `.env` file in the project root:

```env
# Required
DATABASE_URL=postgresql://username:password@localhost:5432/thorntech
PORT=5000
NODE_ENV=production

# Stripe (get from https://dashboard.stripe.com/apikeys)
STRIPE_SECRET_KEY=sk_live_your_secret_key
STRIPE_PUBLISHABLE_KEY=pk_live_your_publishable_key

# PayPal (get from https://developer.paypal.com)
PAYPAL_CLIENT_ID=your_paypal_client_id
PAYPAL_CLIENT_SECRET=your_paypal_client_secret

# Your domain (used for Stripe webhook auto-registration)
SITE_DOMAIN=www.yourdomain.com
```

**For testing**, use Stripe test keys (`sk_test_...` / `pk_test_...`) and PayPal sandbox credentials.

---

## 5. Push Database Schema

```bash
npm run db:push
```

This creates the `categories`, `products`, and `orders` tables. The Stripe schema is created automatically on first startup.

---

## 6. Build for Production

```bash
npm run build
```

This compiles the frontend (React/Vite) and backend (Express/TypeScript) into the `dist/` folder.

---

## 7. Start the Server

```bash
npm start
```

The server runs on the port specified in your `.env` (default 5000).

For production, use PM2 to keep it running:

```bash
npm install -g pm2
pm2 start dist/index.cjs --name thorntech
pm2 save
pm2 startup
```

---

## 8. Set Up Reverse Proxy

### Nginx

```nginx
server {
    listen 80;
    server_name www.yourdomain.com yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name www.yourdomain.com yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### Caddy (simpler — automatic SSL)

```
yourdomain.com {
    reverse_proxy localhost:5000
}
```

---

## 9. Set Up Stripe Webhooks

In your Stripe Dashboard:

1. Go to **Developers → Webhooks**
2. Click **Add endpoint**
3. URL: `https://yourdomain.com/api/stripe/webhook`
4. Select events: `checkout.session.completed`, `payment_intent.succeeded`, `payment_intent.payment_failed`
5. Copy the webhook signing secret and add it to your `.env` if needed

Alternatively, if you set `SITE_DOMAIN` in your `.env`, the app attempts to register webhooks automatically on startup.

---

## 10. SSL Certificate (if using Nginx)

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

---

## Updating the Site

When you make changes:

```bash
git pull
npm install
npm run build
pm2 restart thorntech
```

---

## File Structure

```
├── client/           # React frontend source
├── server/           # Express backend source
├── shared/           # Shared schema/types
├── dist/             # Production build output
├── shopify-theme/    # Shopify Liquid theme export
├── package.json
├── drizzle.config.ts
├── vite.config.ts
└── DEPLOY.md         # This file
```

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| `STRIPE_SECRET_KEY not configured` | Add Stripe keys to `.env` |
| `Missing PAYPAL_CLIENT_ID` | Add PayPal credentials to `.env` |
| Database connection errors | Check `DATABASE_URL` is correct |
| Stripe webhooks not working | Verify webhook URL in Stripe Dashboard matches your domain |
| 502 Bad Gateway | Make sure `npm start` is running (check `pm2 status`) |
| CSS/assets not loading | Make sure you ran `npm run build` |
