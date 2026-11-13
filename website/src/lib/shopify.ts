import { getMockProduct, MOCK_PRODUCTS, type MockProduct } from "./mockCatalog";

export type ShopProduct = MockProduct & {
  id: string;
  shopifyVariantId?: string;
  imageUrl?: string;
};

export type CartLine = {
  key: string;
  productHandle: string;
  title: string;
  color: string;
  size: string;
  price: number;
  currency: string;
  quantity: number;
  merchandiseId?: string;
};

const domain = process.env.SHOPIFY_STORE_DOMAIN;
const token = process.env.SHOPIFY_STOREFRONT_TOKEN;
const apiVersion = process.env.SHOPIFY_API_VERSION || "2025-01";

export function isShopifyConfigured(): boolean {
  return Boolean(domain && token);
}

async function storefrontFetch<T>(
  query: string,
  variables?: Record<string, unknown>,
): Promise<T> {
  if (!domain || !token) {
    throw new Error("Shopify Storefront is not configured");
  }

  const res = await fetch(`https://${domain}/api/${apiVersion}/graphql.json`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Storefront-Access-Token": token,
    },
    body: JSON.stringify({ query, variables }),
    next: { revalidate: 60 },
  });

  if (!res.ok) {
    throw new Error(`Shopify error ${res.status}`);
  }

  const json = await res.json();
  if (json.errors?.length) {
    throw new Error(json.errors[0].message);
  }
  return json.data as T;
}

function mapMock(p: MockProduct): ShopProduct {
  return { ...p, id: `mock-${p.handle}` };
}

export async function getProducts(): Promise<ShopProduct[]> {
  if (!isShopifyConfigured()) {
    return MOCK_PRODUCTS.map(mapMock);
  }

  try {
    const data = await storefrontFetch<{
      products: {
        edges: Array<{
          node: {
            id: string;
            handle: string;
            title: string;
            description: string;
            priceRange: { minVariantPrice: { amount: string; currencyCode: string } };
            featuredImage?: { url: string };
            options: Array<{ name: string; values: string[] }>;
            variants: {
              edges: Array<{ node: { id: string; availableForSale: boolean } }>;
            };
          };
        }>;
      };
    }>(`{
      products(first: 50) {
        edges {
          node {
            id
            handle
            title
            description
            priceRange { minVariantPrice { amount currencyCode } }
            featuredImage { url }
            options { name values }
            variants(first: 50) { edges { node { id availableForSale } } }
          }
        }
      }
    }`);

    return data.products.edges.map(({ node }) => {
      const colorOpt = node.options.find((o) =>
        /color|colour/i.test(o.name),
      );
      const sizeOpt = node.options.find((o) => /size/i.test(o.name));
      return {
        id: node.id,
        handle: node.handle,
        title: node.title,
        description: node.description,
        price: Number(node.priceRange.minVariantPrice.amount),
        currency: node.priceRange.minVariantPrice.currencyCode,
        colors: (colorOpt?.values || ["Black"]).map((name) => ({
          name,
          hex: "#111111",
        })),
        sizes: sizeOpt?.values || ["S", "M", "L", "XL"],
        imageUrl: node.featuredImage?.url,
        imageGradient: "from-blue-600/40 to-slate-900",
        shopifyVariantId: node.variants.edges[0]?.node.id,
      };
    });
  } catch {
    return MOCK_PRODUCTS.map(mapMock);
  }
}

export async function getProduct(handle: string): Promise<ShopProduct | null> {
  const products = await getProducts();
  return products.find((p) => p.handle === handle) || null;
}

export async function createCheckoutUrl(lines: CartLine[]): Promise<string | null> {
  if (!isShopifyConfigured() || lines.length === 0) {
    return null;
  }

  const merchandise = lines
    .filter((l) => l.merchandiseId)
    .map((l) => ({
      merchandiseId: l.merchandiseId!,
      quantity: l.quantity,
    }));

  if (merchandise.length === 0) return null;

  try {
    const data = await storefrontFetch<{
      cartCreate: {
        cart: { checkoutUrl: string } | null;
        userErrors: Array<{ message: string }>;
      };
    }>(
      `mutation cartCreate($input: CartInput!) {
        cartCreate(input: $input) {
          cart { checkoutUrl }
          userErrors { message }
        }
      }`,
      { input: { lines: merchandise } },
    );

    return data.cartCreate.cart?.checkoutUrl ?? null;
  } catch {
    return null;
  }
}

export function resolveMockVariantId(
  handle: string,
  color: string,
  size: string,
): string {
  return `mock:${handle}:${color}:${size}`;
}

export { getMockProduct };
