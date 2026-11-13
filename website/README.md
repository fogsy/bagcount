# BoxingAI marketing site

Next.js site for **boxingai.app** — structure parity with [boxmaxxing.com](https://boxmaxxing.com/), blue BoxingAI branding, Shopify merch checkout.

## Quick start

```bash
cd website
cp .env.example .env.local
npm install
npm run dev   # http://localhost:3847
```

Do **not** use port 3000 (reserved elsewhere). Scripts default to **3847**.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Dev server on 3847 |
| `npm run build` | Production build |
| `npm start` | Serve production on 3847 |
| `npm run lint` | ESLint |

## Environment

See [`.env.example`](./.env.example). Shopify tokens unlock live checkout; without them the shop uses a demo catalog.

## Shopify / Printful

- [docs/SHOPIFY.md](./docs/SHOPIFY.md)
- [docs/PRINTFUL_SKUS.md](./docs/PRINTFUL_SKUS.md)
- [docs/E2E_SHOP.md](./docs/E2E_SHOP.md)

## Deploy

1. Import `website/` as a Vercel project (root directory = `website`).
2. Set env vars from `.env.example`.
3. Point `boxingai.app` DNS to Vercel.
4. Confirm `NEXT_PUBLIC_SITE_URL=https://boxingai.app`.

## Routes

`/`, `/shop`, `/shop/[handle]`, `/privacy`, `/terms`, `/support`, `/contact`, `/ig`, `/tt`, `/links`, `/go/...` (+ locale prefixes).
