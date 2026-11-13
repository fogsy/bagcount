"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { StoreBadges } from "./StoreBadges";
import Image from "next/image";

export function LinkHub({ path }: { path: string }) {
  const t = useTranslations("links");
  const hero = useTranslations("hero");

  useEffect(() => {
    void fetch("/api/links/visit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        path,
        utm: Object.fromEntries(new URLSearchParams(window.location.search)),
      }),
    });
  }, [path]);

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col items-center justify-center px-4 py-16 text-center">
      <Image src="/icon.png" alt="" width={72} height={72} className="rounded-2xl" />
      <h1 className="mt-6 display-italic text-3xl">{t("title")}</h1>
      <div className="mt-8 w-full space-y-3">
        <StoreBadges
          stacked
          appStoreLabel={hero("appStore")}
          playStoreLabel={hero("playStore")}
        />
        <Link
          href="/shop"
          className="block w-full rounded-xl border border-border bg-surface py-3 font-semibold hover:border-accent/40"
        >
          {t("shop")}
        </Link>
        <Link
          href="/support"
          className="block w-full rounded-xl border border-border bg-surface py-3 font-semibold hover:border-accent/40"
        >
          {t("support")}
        </Link>
      </div>
    </div>
  );
}
