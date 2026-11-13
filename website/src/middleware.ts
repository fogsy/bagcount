import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

export default createMiddleware(routing);

export const config = {
  matcher: ["/", "/(pt-BR|es|ar|fr|de|nl|ja|ko|zh)/:path*", "/((?!api|_next|_vercel|.*\\..*).*)"],
};
