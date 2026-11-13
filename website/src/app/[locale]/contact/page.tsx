import { getTranslations, setRequestLocale } from "next-intl/server";
import { Footer } from "@/components/Footer";
import { ContactForm } from "@/components/ContactForm";
import { getSupportEmail } from "@/lib/storeUrls";

export default async function ContactPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("contact");
  const email = getSupportEmail();

  return (
    <>
      <article className="mx-auto max-w-3xl px-4 py-12 md:px-6">
        <h1 className="display-italic text-4xl">{t("title")}</h1>
        <p className="mt-4 text-text-secondary leading-relaxed">
          {t("intro", { email })}
        </p>
        <ContactForm />
      </article>
      <Footer />
    </>
  );
}
