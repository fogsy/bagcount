import { NextResponse } from "next/server";
import { createCheckoutUrl, type CartLine } from "@/lib/shopify";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { lines?: CartLine[] };
    const lines = body.lines || [];
    if (!lines.length) {
      return NextResponse.json({ error: "Empty cart" }, { status: 400 });
    }
    const url = await createCheckoutUrl(lines);
    if (!url) {
      return NextResponse.json(
        {
          error: "Shopify not configured",
          message:
            "Add SHOPIFY_STORE_DOMAIN and SHOPIFY_STOREFRONT_TOKEN to enable checkout.",
        },
        { status: 503 },
      );
    }
    return NextResponse.json({ checkoutUrl: url });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Checkout failed" },
      { status: 500 },
    );
  }
}
