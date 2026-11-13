"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

const COOKIE = "bai_consent";

function getCookie(name: string) {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

function setCookie(name: string, value: string, days: number) {
  const maxAge = days * 24 * 60 * 60;
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAge}; samesite=lax`;
}

export function ConsentBanner() {
  const t = useTranslations("consent");
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!getCookie(COOKIE)) setVisible(true);
  }, []);

  if (!visible) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-[70] border-t border-border bg-surface/95 p-4 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="font-semibold">{t("title")}</p>
          <p className="text-sm text-text-secondary">{t("body")}</p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            className="rounded-full border border-border px-4 py-2 text-sm"
            onClick={() => {
              setCookie(COOKIE, "essential", 180);
              setVisible(false);
            }}
          >
            {t("essential")}
          </button>
          <button
            type="button"
            className="btn-accent px-4 py-2 text-sm"
            onClick={() => {
              setCookie(COOKIE, "optional", 180);
              setVisible(false);
            }}
          >
            {t("allow")}
          </button>
        </div>
      </div>
    </div>
  );
}
