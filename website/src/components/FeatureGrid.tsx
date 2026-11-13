import { useTranslations } from "next-intl";

const FEATURES = [
  { titleKey: "missionTitle", bodyKey: "missionBody", screen: "mission" },
  { titleKey: "drillsTitle", bodyKey: "drillsBody", screen: "drills" },
  { titleKey: "leagueTitle", bodyKey: "leagueBody", screen: "league" },
  { titleKey: "cardTitle", bodyKey: "cardBody", screen: "card" },
] as const;

export function FeatureGrid() {
  const t = useTranslations("features");

  return (
    <section id="features" className="px-4 py-16 md:px-6 md:py-24" aria-labelledby="features-heading">
      <div className="mx-auto max-w-6xl">
        <h2 id="features-heading" className="display-italic text-[clamp(2rem,6vw,3.5rem)]">
          {t("title")}
        </h2>
        <p className="mt-4 max-w-2xl text-text-secondary text-lg">{t("sub")}</p>

        <ul className="mt-12 grid gap-8 sm:grid-cols-2">
          {FEATURES.map((f) => (
            <li key={f.titleKey} className="group">
              <MiniPhone screen={f.screen} />
              <h3 className="mt-4 text-xl font-bold">{t(f.titleKey)}</h3>
              <p className="mt-2 text-text-secondary">{t(f.bodyKey)}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function MiniPhone({ screen }: { screen: string }) {
  return (
    <div className="phone-glow relative aspect-[9/16] max-w-[220px] overflow-hidden rounded-[1.6rem] border border-white/10 bg-surface">
      <div className="absolute inset-0 bg-gradient-to-b from-accent/20 to-transparent opacity-80" />
      <div className="relative p-3 pt-5 space-y-2 text-[9px]">
        {screen === "mission" && (
          <>
            <p className="font-bold text-accent tracking-wider">TODAY&apos;S MISSION</p>
            <p className="text-sm font-bold">Flow & Finish</p>
            <div className="h-20 rounded-xl bg-accent/20" />
            <div className="rounded-lg bg-accent py-2 text-center font-bold text-on-accent">
              START MISSION
            </div>
          </>
        )}
        {screen === "drills" && (
          <>
            <p className="font-bold tracking-wider">PRACTICE DRILLS</p>
            {["Jab Builder", "Cross Control", "1-2 Combo"].map((d) => (
              <div key={d} className="rounded-lg border border-border bg-surface-elevated px-2 py-2">
                {d}
              </div>
            ))}
          </>
        )}
        {screen === "league" && (
          <>
            <p className="font-bold tracking-wider">CITY LEAGUE</p>
            {["1 · You", "2 · Rival", "3 · Contender"].map((r) => (
              <div key={r} className="flex justify-between rounded-lg border border-border px-2 py-2">
                <span>{r}</span>
                <span className="text-accent">XP</span>
              </div>
            ))}
          </>
        )}
        {screen === "card" && (
          <>
            <p className="font-bold tracking-wider">FIGHTER CARD</p>
            <div className="rounded-xl border border-border p-3 space-y-2">
              <p>
                Stance <span className="text-accent font-bold">Orthodox</span>
              </p>
              <p>Strengths: Jab · Guard</p>
              <p className="text-text-muted">Work on: Rear hook</p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
