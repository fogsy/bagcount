"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { CartLine } from "./shopify";

type CartContextValue = {
  lines: CartLine[];
  open: boolean;
  setOpen: (open: boolean) => void;
  addLine: (line: Omit<CartLine, "key" | "quantity"> & { quantity?: number }) => void;
  removeLine: (key: string) => void;
  updateQty: (key: string, quantity: number) => void;
  subtotal: number;
  checkout: () => Promise<void>;
  checkoutLoading: boolean;
};

const CartContext = createContext<CartContextValue | null>(null);
const STORAGE_KEY = "bai_cart";

export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [open, setOpen] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setLines(JSON.parse(raw));
    } catch {
      /* ignore */
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
  }, [lines, hydrated]);

  const addLine = useCallback(
    (line: Omit<CartLine, "key" | "quantity"> & { quantity?: number }) => {
      const key = `${line.productHandle}-${line.color}-${line.size}`;
      setLines((prev) => {
        const existing = prev.find((l) => l.key === key);
        if (existing) {
          return prev.map((l) =>
            l.key === key
              ? { ...l, quantity: l.quantity + (line.quantity || 1) }
              : l,
          );
        }
        return [...prev, { ...line, key, quantity: line.quantity || 1 }];
      });
      setOpen(true);
    },
    [],
  );

  const removeLine = useCallback((key: string) => {
    setLines((prev) => prev.filter((l) => l.key !== key));
  }, []);

  const updateQty = useCallback((key: string, quantity: number) => {
    setLines((prev) =>
      prev
        .map((l) => (l.key === key ? { ...l, quantity } : l))
        .filter((l) => l.quantity > 0),
    );
  }, []);

  const subtotal = useMemo(
    () => lines.reduce((sum, l) => sum + l.price * l.quantity, 0),
    [lines],
  );

  const checkout = useCallback(async () => {
    setCheckoutLoading(true);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lines }),
      });
      const data = await res.json();
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
        return;
      }
      alert(
        data.message ||
          "Shopify checkout is not connected yet. Add SHOPIFY_STORE_DOMAIN and SHOPIFY_STOREFRONT_TOKEN to enable live checkout.",
      );
    } finally {
      setCheckoutLoading(false);
    }
  }, [lines]);

  const value = useMemo(
    () => ({
      lines,
      open,
      setOpen,
      addLine,
      removeLine,
      updateQty,
      subtotal,
      checkout,
      checkoutLoading,
    }),
    [
      lines,
      open,
      addLine,
      removeLine,
      updateQty,
      subtotal,
      checkout,
      checkoutLoading,
    ],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
