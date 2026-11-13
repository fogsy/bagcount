import { useTranslations } from "next-intl";

export function PhoneMockup() {
  const t = useTranslations("mockup");

  return (
    <section className="relative px-4 py-10 md:px-6 overflow-hidden" aria-label={t("movesLabel")}>
      <div className="mx-auto max-w-6xl flex flex-col items-center">
        <div className="relative">
          <div
            className="absolute -inset-16 rounded-full opacity-60 blur-3xl pointer-events-none"
            style={{ background: "radial-gradient(circle, var(--accent-glow), transparent 70%)" }}
          />
          <div className="relative phone-glow rounded-[2rem] border border-white/10 bg-surface w-[260px] sm:w-[300px] overflow-hidden">
            <div className="bg-background px-4 pt-3 pb-2 flex items-center justify-between text-[10px] text-text-muted">
              <span>9:41</span>
              <span className="mx-auto h-4 w-20 rounded-full bg-black" />
              <span>●●</span>
            </div>
            <div className="px-4 pb-5 space-y-3">
              <p className="text-xs text-text-secondary">
                Good Afternoon, <span className="text-text font-semibold">Fighter</span>
              </p>
              <div className="rounded-2xl border border-border bg-surface-elevated p-3">
                <p className="text-[10px] font-bold tracking-widest text-accent">
                  TODAY&apos;S MISSION
                </p>
                <p className="mt-1 text-sm font-bold">Fundamentals</p>
                <div className="mt-3 flex h-24 items-end justify-center rounded-xl bg-gradient-to-t from-accent/30 to-transparent">
                  <CoachSilhouette />
                </div>
                <button
                  type="button"
                  className="mt-3 w-full rounded-xl bg-accent py-2.5 text-xs font-bold text-on-accent"
                >
                  ▶ START MISSION
                </button>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center text-[10px]">
                <Stat label="STREAK" value="17 days" />
                <Stat label="LEVEL" value="7" />
                <Stat label="XP" value="12.6k" />
              </div>
              <div className="rounded-xl border border-border p-2">
                <div className="flex justify-between text-[10px] text-text-secondary">
                  <span>FIGHT CAMP</span>
                  <span>DAY 18 of 30</span>
                </div>
                <div className="mt-2 h-1.5 rounded-full bg-border overflow-hidden">
                  <div className="h-full w-3/5 bg-accent" />
                </div>
              </div>
            </div>
          </div>

          <div className="animate-toast absolute -left-2 bottom-16 sm:-left-10 rounded-full border border-white/10 bg-black/90 px-3 py-1.5 text-xs font-semibold shadow-lg">
            <span className="mr-1.5 inline-block h-2 w-2 rounded-full bg-emerald-400" />
            {t("toast")}
          </div>
        </div>

        <p className="sr-only">{t("movesLabel")}</p>
        <div className="mt-12 w-full overflow-hidden">
          <p className="ticker-track justify-center flex-wrap px-2 text-center">
            {t("ticker")
              .split(" / ")
              .map((move, i, arr) => (
                <span key={move}>
                  {move}
                  {i < arr.length - 1 && <span className="ticker-slash"> / </span>}
                </span>
              ))}
          </p>
        </div>
      </div>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-surface-elevated px-1 py-2">
      <p className="text-text-muted">{label}</p>
      <p className="mt-0.5 font-bold text-text">{value}</p>
    </div>
  );
}

function CoachSilhouette() {
  return (
    <svg width="72" height="90" viewBox="0 0 72 90" aria-hidden>
      <circle cx="36" cy="14" r="10" fill="#e5e7eb" />
      <rect x="22" y="26" width="28" height="34" rx="10" fill="#e5e7eb" />
      <rect x="8" y="30" width="16" height="10" rx="5" fill="#3B82F6" />
      <rect x="48" y="30" width="16" height="10" rx="5" fill="#3B82F6" />
      <rect x="24" y="58" width="10" height="24" rx="4" fill="#e5e7eb" />
      <rect x="38" y="58" width="10" height="24" rx="4" fill="#e5e7eb" />
    </svg>
  );
}
