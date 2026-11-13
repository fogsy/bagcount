"use client";

import { usePathname, useRouter } from "@/i18n/navigation";
import { locales, type Locale } from "@/i18n/routing";
import { useTransition } from "react";

const LABELS: Record<Locale, string> = {
  en: "English",
  "pt-BR": "Português (Brasil)",
  es: "Español",
  ar: "العربية",
  fr: "Français",
  de: "Deutsch",
  nl: "Nederlands",
  ja: "日本語",
  ko: "한국어",
  zh: "简体中文",
};

export function LanguageSwitcher({
  current,
  label,
}: {
  current: string;
  label: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();

  return (
    <label className="flex items-center gap-2 text-sm text-text-secondary">
      <span className="sr-only">{label}</span>
      <select
        className="rounded-lg border border-border bg-surface px-2 py-1.5 text-text"
        value={current}
        disabled={pending}
        aria-label={label}
        onChange={(e) => {
          const next = e.target.value as Locale;
          startTransition(() => {
            router.replace(pathname, { locale: next });
          });
        }}
      >
        {locales.map((l) => (
          <option key={l} value={l}>
            {LABELS[l]}
          </option>
        ))}
      </select>
    </label>
  );
}
