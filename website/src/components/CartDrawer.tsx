"use client";

import { useTranslations } from "next-intl";
import { useCart } from "@/lib/cart";

export function CartDrawer() {
  const t = useTranslations("shop");
  const {
    open,
    setOpen,
    lines,
    removeLine,
    updateQty,
    subtotal,
    checkout,
    checkoutLoading,
  } = useCart();

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60]" role="dialog" aria-modal aria-label={t("cart")}>
      <button
        type="button"
        className="absolute inset-0 bg-black/60"
        aria-label={t("closeCart")}
        onClick={() => setOpen(false)}
      />
      <aside className="absolute right-0 top-0 flex h-full w-full max-w-md flex-col border-l border-border bg-surface shadow-2xl">
        <div className="flex items-center justify-between border-b border-border px-4 py-4">
          <h2 className="text-lg font-bold">{t("cart")}</h2>
          <button type="button" onClick={() => setOpen(false)} className="text-text-secondary">
            ✕
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          {lines.length === 0 ? (
            <p className="text-text-secondary">{t("emptyCart")}</p>
          ) : (
            lines.map((line) => (
              <div key={line.key} className="flex gap-3 border-b border-border pb-4">
                <div className="h-16 w-16 rounded-lg bg-accent/20" />
                <div className="flex-1">
                  <p className="font-semibold">{line.title}</p>
                  <p className="text-xs text-text-muted">
                    {line.color} · {line.size}
                  </p>
                  <div className="mt-2 flex items-center gap-2">
                    <label className="text-xs text-text-muted">
                      {t("qty")}
                      <input
                        type="number"
                        min={1}
                        value={line.quantity}
                        className="ml-2 w-14 rounded border border-border bg-background px-1 py-0.5"
                        onChange={(e) => updateQty(line.key, Number(e.target.value))}
                      />
                    </label>
                    <button
                      type="button"
                      className="text-xs text-danger"
                      onClick={() => removeLine(line.key)}
                    >
                      {t("remove")}
                    </button>
                  </div>
                </div>
                <p className="font-semibold">${(line.price * line.quantity).toFixed(0)}</p>
              </div>
            ))
          )}
        </div>
        <div className="border-t border-border px-4 py-4 space-y-3">
          <div className="flex justify-between font-semibold">
            <span>{t("subtotal")}</span>
            <span>${subtotal.toFixed(0)}</span>
          </div>
          <button
            type="button"
            className="btn-accent w-full py-3 text-sm disabled:opacity-50"
            disabled={lines.length === 0 || checkoutLoading}
            onClick={() => void checkout()}
          >
            {checkoutLoading ? "…" : t("checkout")}
          </button>
          <p className="text-[11px] text-text-muted">{t("demoNote")}</p>
        </div>
      </aside>
    </div>
  );
}
