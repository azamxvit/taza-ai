import type { ReactNode } from "react";
import { Footer } from "./Footer";

/** Scrollable full-width page under the floating top bar (spacing comes from base.css `main`). */
export function PageLayout({ children }: { children: ReactNode }) {
  return (
    <main>
      {children}
      <Footer />
    </main>
  );
}
