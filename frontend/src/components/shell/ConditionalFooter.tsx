"use client";

import { useFooterHidden } from "@/lib/footer-store";
import { Footer } from "@/components/shell/Footer";

export function ConditionalFooter() {
  const isHidden = useFooterHidden();

  if (isHidden) {
    return null;
  }

  return <Footer />;
}
