import { getTranslations, setRequestLocale } from "next-intl/server";
import { Footer } from "@/components/Footer";
import { getSupportEmail } from "@/lib/storeUrls";

export default async function SupportPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("support");
  const legal = await getTranslations("legal");
  const email = getSupportEmail();

  return (
    <>
      <article className="mx-auto max-w-3xl px-4 py-12 md:px-6">
        <h1 className="display-italic text-4xl">{t("title")}</h1>
        <p className="mt-2 text-sm text-text-muted">
          {legal("lastUpdated", { date: "28 October 2026" })}
        </p>
        <div className="mt-8 space-y-8 text-text-secondary leading-relaxed">
          <p>{t("intro", { email })}</p>
          {(
            [
              ["subsTitle", "subsBody"],
              ["padTitle", "padBody"],
              ["crewTitle", "crewBody"],
              ["deleteTitle", "deleteBody"],
            ] as const
          ).map(([title, body]) => (
            <section key={title}>
              <h2 className="text-xl font-bold text-text">{t(title)}</h2>
              <p className="mt-2">{t(body, { email })}</p>
            </section>
          ))}
        </div>
      </article>
      <Footer />
    </>
  );
}
