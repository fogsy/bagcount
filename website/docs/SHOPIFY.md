# Shopify + Printful setup (BoxingAI)

End-to-end merch flow: **Printful** prints → **Shopify** sells → **boxingai.app** cart redirects to **Shopify Checkout**.

## 1. Create the store

1. Create a Shopify store (trial OK for testing).
2. In **Settings → Checkout**, enable a custom domain later (`shop.boxingai.app` optional).
3. Install the **Printful** sales channel / app and connect your Printful account.

## 2. Products

1. In Printful, create products matching `src/lib/mockCatalog.ts` handles (or replace mock catalog once live).
2. Push products to Shopify with color + size variants.
3. Ensure each product has:
   - Title (e.g. American Heavyweight)
   - Price (USD 26 default)
   - Featured image
   - Options: Color, Size

Art brief: BoxingAI mark (blue inverted-V from `public/icon.png`) + country/fighter nickname wordmark. Dark background preferred; avoid Boxmaxxing red.

## 3. Storefront API token

1. Shopify Admin → **Settings → Apps and sales channels → Develop apps**.
2. Create an app with Storefront API scopes:
   - `unauthenticated_read_product_listings`
   - `unauthenticated_write_checkouts` / cart scopes for Storefront Cart API
3. Install the app and copy the **Storefront access token**.
4. Set in Vercel / `.env.local`:

```bash
SHOPIFY_STORE_DOMAIN=your-store.myshopify.com
SHOPIFY_STOREFRONT_TOKEN=shpat_or_storefront_token_here
SHOPIFY_API_VERSION=2025-01
```

## 4. Site behavior

- Without tokens, `/shop` uses the **demo mock catalog**; checkout shows a connect message.
- With tokens, `getProducts()` loads live products; cart POST `/api/checkout` creates a Storefront cart and redirects to `checkoutUrl`.

## 5. Webhooks (optional)

- `orders/create` → ops Slack/email
- Not required for MVP checkout

## 6. Test checklist

See [E2E_SHOP.md](./E2E_SHOP.md).
