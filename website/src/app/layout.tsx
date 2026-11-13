import type { ReactNode } from "react";

/** Root layout required by Next.js; locale layout sets html/body. */
export default function RootLayout({ children }: { children: ReactNode }) {
  return children;
}
