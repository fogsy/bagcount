import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getProducts } from "@/lib/shopify";
import { Footer } from "@/components/Footer";

export default async function ShopPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("shop");
  const products = await getProducts();
  const featured = products.find((p) => p.featured) || products[0];

  return (
    <>
      <div className="mx-auto max-w-6xl px-4 py-10 md:px-6">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold tracking-widest text-accent">
              {t("madeFor")} United States
            </p>
            <h1 className="mt-2 display-italic text-4xl md:text-5xl">{t("title")}</h1>
          </div>
          {featured && (
            <Link
              href={`/shop/${featured.handle}`}
              className="rounded-2xl border border-border bg-surface px-4 py-3 hover:border-accent/50 transition"
            >
              <p className="font-bold">{featured.title}</p>
              <p className="text-sm text-text-secondary">
                ${featured.price} {t("shopCta")}
              </p>
            </Link>
          )}
        </div>

        <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((p) => (
            <li key={p.handle}>
              <Link
                href={`/shop/${p.handle}`}
                className="group block overflow-hidden rounded-2xl border border-border bg-surface hover:border-accent/40 transition"
              >
                <div
                  className={`aspect-[4/5] bg-gradient-to-br ${p.imageGradient} flex items-center justify-center`}
                >
                  <span className="text-5xl font-black italic text-white/20 group-hover:text-accent/40 transition">
                    BAI
                  </span>
                </div>
                <div className="p-4">
                  <h2 className="font-bold text-lg">{p.title}</h2>
                  <p className="mt-1 text-sm text-text-secondary">
                    {t("from")} ${p.price}
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>

        <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["madeToOrder", "madeToOrderBody"],
            ["ships", "shipsBody"],
            ["returns", "returnsBody"],
            ["sizeGuide", "sizeGuideBody"],
          ].map(([title, body]) => (
            <div key={title}>
              <h3 className="text-sm font-bold tracking-widest text-accent">
                {t(title as "madeToOrder")}
              </h3>
              <p className="mt-2 text-sm text-text-secondary">
                {t(body as "madeToOrderBody")}
              </p>
            </div>
          ))}
        </div>
      </div>
      <Footer />
    </>
  );
}
