"use client";

import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { useCart } from "@/lib/cart";
import type { ShopProduct } from "@/lib/shopify";
import { resolveMockVariantId } from "@/lib/shopify";

export function ProductBuyBox({ product }: { product: ShopProduct }) {
  const t = useTranslations("shop");
  const { addLine } = useCart();
  const [color, setColor] = useState(product.colors[0]?.name || "Black");
  const [size, setSize] = useState(product.sizes[1] || product.sizes[0] || "M");

  const selectedColor = useMemo(
    () => product.colors.find((c) => c.name === color) || product.colors[0],
    [color, product.colors],
  );

  return (
    <div className="mt-8 space-y-6">
      <div>
        <p className="text-sm font-semibold mb-2">{t("color")}</p>
        <div className="flex flex-wrap gap-2">
          {product.colors.map((c) => (
            <button
              key={c.name}
              type="button"
              onClick={() => setColor(c.name)}
              className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm ${
                color === c.name ? "border-accent text-text" : "border-border text-text-secondary"
              }`}
            >
              <span
                className="h-3 w-3 rounded-full border border-white/20"
                style={{ background: c.hex }}
              />
              {c.name}
            </button>
          ))}
        </div>
      </div>
      <div>
        <p className="text-sm font-semibold mb-2">{t("size")}</p>
        <div className="flex flex-wrap gap-2">
          {product.sizes.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSize(s)}
              className={`min-w-11 rounded-lg border px-3 py-2 text-sm font-semibold ${
                size === s ? "border-accent bg-accent/10 text-text" : "border-border text-text-secondary"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>
      <button
        type="button"
        className="btn-accent w-full py-3.5 text-sm"
        onClick={() =>
          addLine({
            productHandle: product.handle,
            title: product.title,
            color,
            size,
            price: product.price,
            currency: product.currency,
            merchandiseId:
              product.shopifyVariantId ||
              resolveMockVariantId(product.handle, color, size),
          })
        }
      >
        {t("addToCart")}
        {selectedColor ? ` · ${selectedColor.name}` : ""} · {size}
      </button>
    </div>
  );
}
