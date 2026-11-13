import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getProduct, getProducts } from "@/lib/shopify";
import { Footer } from "@/components/Footer";
import { ProductBuyBox } from "@/components/ProductBuyBox";

export async function generateStaticParams() {
  const products = await getProducts();
  return products.map((p) => ({ handle: p.handle }));
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ locale: string; handle: string }>;
}) {
  const { locale, handle } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("shop");
  const product = await getProduct(handle);
  if (!product) notFound();

  return (
    <>
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-10 md:grid-cols-2 md:px-6">
        <div
          className={`aspect-[4/5] rounded-3xl bg-gradient-to-br ${product.imageGradient} flex items-center justify-center phone-glow`}
        >
          <span className="text-7xl font-black italic text-white/25">BAI</span>
        </div>
        <div>
          <h1 className="display-italic text-4xl md:text-5xl">{product.title}</h1>
          <p className="mt-3 text-2xl font-semibold">
            {t("from")} ${product.price}
          </p>
          <p className="mt-4 text-text-secondary">{product.description}</p>
          <ProductBuyBox product={product} />
          <div className="mt-10 space-y-6 border-t border-border pt-8">
            {[
              ["madeToOrder", "madeToOrderBody"],
              ["ships", "shipsBody"],
              ["returns", "returnsBody"],
              ["sizeGuide", "sizeGuideBody"],
            ].map(([title, body]) => (
              <div key={title}>
                <h2 className="text-xs font-bold tracking-widest text-accent">
                  {t(title as "madeToOrder")}
                </h2>
                <p className="mt-1 text-sm text-text-secondary">
                  {t(body as "madeToOrderBody")}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
}
