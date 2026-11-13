import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { getMessages, getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import { getSiteUrl } from "@/lib/storeUrls";
import { Header } from "@/components/Header";
import { Providers } from "@/components/Providers";
import "../globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "meta" });
  const site = getSiteUrl();

  return {
    title: t("title"),
    description: t("description"),
    metadataBase: new URL(site),
    alternates: {
      canonical: locale === "en" ? site : `${site}/${locale}`,
      languages: Object.fromEntries(
        routing.locales.map((l) => [l, l === "en" ? site : `${site}/${l}`]),
      ),
    },
    openGraph: {
      title: t("title"),
      description: t("description"),
      url: site,
      siteName: "BoxingAI",
      images: [{ url: "/opengraph-image", width: 1200, height: 630 }],
      locale,
      type: "website",
    },
    icons: {
      icon: "/favicon.png",
      apple: "/icon.png",
    },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();

  setRequestLocale(locale);
  const messages = await getMessages();
  const t = await getTranslations("nav");
  const dir = locale === "ar" ? "rtl" : "ltr";

  return (
    <html lang={locale} dir={dir} className={`${geistSans.variable} ${geistMono.variable}`}>
      <body className="min-h-screen antialiased bg-background text-text">
        <NextIntlClientProvider messages={messages}>
          <Providers>
            <a
              href="#main"
              className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-accent focus:px-3 focus:py-2 focus:text-on-accent"
            >
              {t("skip")}
            </a>
            <Header />
            <main id="main">{children}</main>
          </Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
