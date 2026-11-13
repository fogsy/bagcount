import { defineRouting } from "next-intl/routing";

export const locales = [
  "en",
  "pt-BR",
  "es",
  "ar",
  "fr",
  "de",
  "nl",
  "ja",
  "ko",
  "zh",
] as const;

export type Locale = (typeof locales)[number];

export const routing = defineRouting({
  locales: [...locales],
  defaultLocale: "en",
  localePrefix: "as-needed",
  localeCookie: {
    name: "bai_lang",
    maxAge: 60 * 60 * 24 * 365,
  },
});
