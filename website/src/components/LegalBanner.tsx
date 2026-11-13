import { useTranslations } from "next-intl";

export function LegalBanner() {
  const t = useTranslations("legal");
  return (
    <div className="mb-6 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm">
      <p className="font-semibold text-amber-200">{t("draftBanner")}</p>
      <p className="mt-1 text-text-secondary">{t("draftNote")}</p>
    </div>
  );
}
