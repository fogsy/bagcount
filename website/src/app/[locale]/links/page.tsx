import { setRequestLocale } from "next-intl/server";
import { LinkHub } from "@/components/LinkHub";

export default async function LinksPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <LinkHub path="/links" />;
}
