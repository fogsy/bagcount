import { useTranslations } from "next-intl";
import { StoreBadges } from "./StoreBadges";

export function Hero() {
  const t = useTranslations("hero");

  return (
    <section className="hero-gradient px-4 pb-8 pt-10 md:px-6 md:pt-16" aria-labelledby="hero-heading">
      <div className="mx-auto max-w-6xl">
        <div className="max-w-2xl animate-rise">
          <p className="accent-pill inline-block mb-6">{t("eyebrow")}</p>
          <h1 id="hero-heading" className="display-italic text-[clamp(2.6rem,10vw,5.5rem)] text-text">
            <span className="block">{t("line1")}</span>
            <span className="block">{t("line2")}</span>
            <span className="block text-accent">{t("line3")}</span>
          </h1>
          <p className="mt-6 max-w-xl text-base md:text-lg text-text-secondary leading-relaxed">
            {t("sub")}
          </p>
          <div className="mt-8" id="get-app">
            <StoreBadges
              stacked
              appStoreLabel={t("appStore")}
              playStoreLabel={t("playStore")}
            />
          </div>
          <ul className="mt-10 flex flex-wrap gap-8 text-xs font-semibold tracking-widest text-text-secondary">
            <li className="flex items-center gap-2">
              <Laurel />
              {t("badge1")}
            </li>
            <li className="flex items-center gap-2">
              <Laurel />
              {t("badge2")}
            </li>
          </ul>
        </div>
      </div>
    </section>
  );
}

function Laurel() {
  return (
    <svg width="28" height="28" viewBox="0 0 40 40" fill="none" aria-hidden className="text-amber-400">
      <path
        d="M8 28c2-6 6-10 12-12-4 4-6 9-6 14 0 0-4-1-6-2zm24 0c-2-6-6-10-12-12 4 4 6 9 6 14 0 0 4-1 6-2z"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path d="M20 8v20" stroke="currentColor" strokeWidth="1.2" opacity="0.5" />
    </svg>
  );
}
