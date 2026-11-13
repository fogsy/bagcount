"use client";

import Image from "next/image";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useCart } from "@/lib/cart";

export function Header() {
  const t = useTranslations("nav");
  const [menuOpen, setMenuOpen] = useState(false);
  const { lines, setOpen } = useCart();
  const count = lines.reduce((n, l) => n + l.quantity, 0);

  return (
    <header className="sticky top-0 z-50 border-b border-white/5 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 md:px-6">
        <Link href="/" className="flex items-center gap-2" aria-label={t("home")}>
          <Image src="/icon.png" alt="" width={36} height={36} className="rounded-lg" />
          <span className="text-sm font-extrabold tracking-[0.18em] uppercase">
            BoxingAI
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-8 text-sm text-text-secondary" aria-label="Site">
          <Link href="/#features" className="hover:text-text transition">
            {t("features")}
          </Link>
          <Link href="/shop" className="hover:text-text transition">
            {t("shop")}
          </Link>
          <Link href="/#faq" className="hover:text-text transition">
            {t("faq")}
          </Link>
        </nav>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="relative rounded-full border border-border px-3 py-2 text-xs font-semibold text-text-secondary hover:text-text"
            aria-label="Open cart"
          >
            Cart
            {count > 0 && (
              <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] text-on-accent">
                {count}
              </span>
            )}
          </button>
          <Link href="/#get-app" className="btn-accent hidden sm:inline-flex px-4 py-2 text-xs">
            {t("getTheApp")}
          </Link>
          <button
            type="button"
            className="md:hidden rounded-full border border-border p-2"
            aria-label={menuOpen ? t("closeMenu") : t("openMenu")}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((v) => !v)}
          >
            <span className="block h-0.5 w-5 bg-text mb-1" />
            <span className="block h-0.5 w-5 bg-text mb-1" />
            <span className="block h-0.5 w-5 bg-text" />
          </button>
        </div>
      </div>

      {menuOpen && (
        <div className="md:hidden border-t border-border bg-surface px-4 py-4 space-y-3">
          <Link href="/#features" className="block" onClick={() => setMenuOpen(false)}>
            {t("features")}
          </Link>
          <Link href="/shop" className="block" onClick={() => setMenuOpen(false)}>
            {t("shop")}
          </Link>
          <Link href="/#faq" className="block" onClick={() => setMenuOpen(false)}>
            {t("faq")}
          </Link>
          <Link
            href="/#get-app"
            className="btn-accent inline-flex px-4 py-2 text-xs"
            onClick={() => setMenuOpen(false)}
          >
            {t("getTheApp")}
          </Link>
        </div>
      )}
    </header>
  );
}
