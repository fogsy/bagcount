import { setRequestLocale } from "next-intl/server";
import { Faq } from "@/components/Faq";
import { FeatureGrid } from "@/components/FeatureGrid";
import { Footer } from "@/components/Footer";
import { Hero } from "@/components/Hero";
import { PhoneMockup } from "@/components/PhoneMockup";

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <>
      <Hero />
      <PhoneMockup />
      <FeatureGrid />
      <Faq />
      <Footer showCta />
    </>
  );
}
