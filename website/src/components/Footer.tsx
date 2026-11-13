import { useTranslations, useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { StoreBadges } from "./StoreBadges";

export function Footer({ showCta = false }: { showCta?: boolean }) {
  const t = useTranslations("footer");
  const cta = useTranslations("cta");
  const hero = useTranslations("hero");
  const locale = useLocale();
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-border">
      {showCta && (
        <section className="px-4 py-16 md:px-6 text-center" aria-labelledby="cta-heading">
          <h2 id="cta-heading" className="display-italic text-[clamp(2.5rem,8vw,4rem)]">
            {cta("title")}
          </h2>
          <div className="mt-8 flex justify-center">
            <StoreBadges
              appStoreLabel={hero("appStore")}
              playStoreLabel={hero("playStore")}
            />
          </div>
        </section>
      )}
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8 md:flex-row md:items-center md:justify-between md:px-6">
        <p className="text-sm text-text-muted">
          {t("copyright", { year })}
        </p>
        <ul className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-text-secondary">
          <li>
            <Link href="/privacy" className="hover:text-text">
              {t("privacy")}
            </Link>
          </li>
          <li>
            <Link href="/terms" className="hover:text-text">
              {t("terms")}
            </Link>
          </li>
          <li>
            <Link href="/support" className="hover:text-text">
              {t("support")}
            </Link>
          </li>
          <li>
            <Link href="/contact" className="hover:text-text">
              {t("contact")}
            </Link>
          </li>
        </ul>
        <LanguageSwitcher current={locale} label={t("language")} />
      </div>
    </footer>
  );
}
