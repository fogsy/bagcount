import { getTranslations, setRequestLocale } from "next-intl/server";
import { Footer } from "@/components/Footer";
import { LegalBanner } from "@/components/LegalBanner";
import { getLegalEntity, getSupportEmail } from "@/lib/storeUrls";

export default async function TermsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("terms");
  const legal = await getTranslations("legal");
  const entity = getLegalEntity();
  const email = getSupportEmail();

  return (
    <>
      <article className="mx-auto max-w-3xl px-4 py-12 md:px-6">
        <h1 className="display-italic text-4xl">{t("title")}</h1>
        <p className="mt-2 text-sm text-text-muted">
          {legal("lastUpdated", { date: "28 October 2026" })}
        </p>
        <div className="mt-6">
          <LegalBanner />
        </div>
        <div className="space-y-6 text-text-secondary leading-relaxed">
          <h2 className="text-xl font-bold text-text">{t("whichTitle")}</h2>
          <p>{t("whichBody")}</p>
          <h2 className="text-xl font-bold text-text">{t("agreeTitle")}</h2>
          <p>{t("agreeBody", { entity: entity.name })}</p>
          <h2 className="text-xl font-bold text-text">{t("useTitle")}</h2>
          <p>{t("useBody")}</p>
          <h2 className="text-xl font-bold text-text">{t("contactTitle")}</h2>
          <p>{t("contactBody", { email })}</p>
        </div>
      </article>
      <Footer />
    </>
  );
}
