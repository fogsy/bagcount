"use client";

import { CartProvider } from "@/lib/cart";
import { CartDrawer } from "./CartDrawer";
import { ConsentBanner } from "./ConsentBanner";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <CartProvider>
      {children}
      <CartDrawer />
      <ConsentBanner />
    </CartProvider>
  );
}
