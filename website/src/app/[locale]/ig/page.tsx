import { setRequestLocale } from "next-intl/server";
import { LinkHub } from "@/components/LinkHub";

export default async function IgPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <LinkHub path="/ig" />;
}
