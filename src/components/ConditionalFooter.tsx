"use client";

import { usePathname } from "next/navigation";
import Footer from "./Footer";

export default function ConditionalFooter() {
  const pathname = usePathname();

  // Hide footer on chat pages
  const hidFooter = pathname?.startsWith("/servers/") && pathname !== "/servers";

  if (hidFooter) {
    return null;
  }

  return <Footer />;
}
