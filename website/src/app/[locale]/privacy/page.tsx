import { getTranslations, setRequestLocale } from "next-intl/server";
import { Footer } from "@/components/Footer";
import { LegalBanner } from "@/components/LegalBanner";
import { getLegalEntity, getSupportEmail } from "@/lib/storeUrls";

export default async function PrivacyPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("privacy");
  const legal = await getTranslations("legal");
  const entity = getLegalEntity();
  const email = getSupportEmail();

  return (
    <>
      <article className="mx-auto max-w-3xl px-4 py-12 md:px-6 prose-invert">
        <h1 className="display-italic text-4xl">{t("title")}</h1>
        <p className="mt-2 text-sm text-text-muted">
          {legal("lastUpdated", { date: "28 October 2026" })}
        </p>
        <div className="mt-6">
          <LegalBanner />
        </div>
        <div className="space-y-6 text-text-secondary leading-relaxed">
          <p>{t("intro")}</p>
          <p>{t("appNote")}</p>
          <h2 className="text-xl font-bold text-text">{t("whoTitle")}</h2>
          <p>{t("whoBody", { entity: entity.name, address: entity.address })}</p>
          <p>{t("noSell")}</p>
          <h2 className="text-xl font-bold text-text">{t("visitTitle")}</h2>
          <p>{t("visitBody")}</p>
          <h2 className="text-xl font-bold text-text">{t("cookiesTitle")}</h2>
          <p>{t("cookiesBody")}</p>
          <h2 className="text-xl font-bold text-text">{t("rightsTitle")}</h2>
          <p>{t("rightsBody", { email })}</p>
          <h2 className="text-xl font-bold text-text">{t("contactTitle")}</h2>
          <p>{t("contactBody", { email })}</p>
        </div>
      </article>
      <Footer />
    </>
  );
}
