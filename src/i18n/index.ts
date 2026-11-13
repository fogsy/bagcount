import { getLocales } from 'expo-localization';
import { I18n } from 'i18n-js';

import ar from './locales/ar.json';
import de from './locales/de.json';
import en from './locales/en.json';
import es from './locales/es.json';
import fr from './locales/fr.json';
import ptBR from './locales/pt-BR.json';

const translations = {
  en,
  'en-US': en,
  'en-GB': en,
  es,
  'es-ES': es,
  'es-MX': es,
  fr,
  'fr-FR': fr,
  de,
  'de-DE': de,
  ar,
  'ar-SA': ar,
  'pt-BR': ptBR,
  pt: ptBR,
} as const;

const i18n = new I18n(translations);

i18n.enableFallback = true;
i18n.defaultLocale = 'en';
i18n.locale = resolveSupportedLocale(getLocales()[0]?.languageTag);

export function t(key: string, options?: Record<string, unknown>): string {
  return i18n.t(key, options);
}

export function setLocale(locale: string): void {
  i18n.locale = resolveSupportedLocale(locale);
}

export function isRtl(): boolean {
  return i18n.locale.startsWith('ar');
}

function resolveSupportedLocale(tag: string | undefined): string {
  if (tag == null || tag.length === 0) {
    return 'en';
  }
  if (tag in translations) {
    return tag;
  }
  const normalized = tag.replace('_', '-');
  if (normalized in translations) {
    return normalized;
  }
  const base = normalized.split('-')[0] ?? 'en';
  if (base === 'pt') {
    return 'pt-BR';
  }
  if (base in translations) {
    return base;
  }
  return 'en';
}

export { i18n };
