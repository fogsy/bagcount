import { redirect } from "next/navigation";
import { getAppStoreUrl, getPlayStoreUrl } from "@/lib/storeUrls";

export default async function GoPage() {
  const play = getPlayStoreUrl();
  const app = getAppStoreUrl();
  redirect(play || app || "/");
}
