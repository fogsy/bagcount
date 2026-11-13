# Shop E2E checklist (test mode)

## Without Shopify tokens

- [ ] `/shop` lists mock tees
- [ ] PDP color/size selection works
- [ ] Add to cart opens drawer
- [ ] Checkout shows “Shopify not configured” message

## With Shopify test store

- [ ] Products load from Storefront API
- [ ] Add variant to cart
- [ ] Checkout redirects to Shopify hosted checkout
- [ ] Complete order with Shopify Bogus Gateway / test card
- [ ] Printful receives order (or syncs as pending)

## Regression

- [ ] Cart persists in `localStorage` (`bai_cart`)
- [ ] Locale switch keeps shop routes
- [ ] Mobile cart drawer usable
