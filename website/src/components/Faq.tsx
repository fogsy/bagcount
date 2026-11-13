"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";

const ITEMS = [
  { q: "q1", a: "a1" },
  { q: "q2", a: "a2" },
  { q: "q3", a: "a3" },
  { q: "q4", a: "a4" },
] as const;

export function Faq() {
  const t = useTranslations("faq");
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section id="faq" className="px-4 py-16 md:px-6 md:py-24" aria-labelledby="faq-heading">
      <div className="mx-auto max-w-3xl">
        <h2 id="faq-heading" className="display-italic text-[clamp(2rem,6vw,3rem)]">
          {t("title")}
        </h2>
        <div className="mt-8 divide-y divide-border border-y border-border">
          {ITEMS.map((item, i) => {
            const isOpen = open === i;
            return (
              <div key={item.q}>
                <h3>
                  <button
                    type="button"
                    className="flex w-full items-center justify-between gap-4 py-5 text-left text-lg font-semibold"
                    aria-expanded={isOpen}
                    onClick={() => setOpen(isOpen ? null : i)}
                  >
                    {t(item.q)}
                    <span className="text-accent text-2xl leading-none" aria-hidden>
                      {isOpen ? "−" : "+"}
                    </span>
                  </button>
                </h3>
                <div
                  className={`overflow-hidden transition-[max-height,opacity] duration-300 ${
                    isOpen ? "max-h-40 opacity-100 pb-5" : "max-h-0 opacity-0"
                  }`}
                >
                  <p className="text-text-secondary leading-relaxed">{t(item.a)}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
