"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { trackPageView } from "@/lib/analytics";

export default function GaPageviewTracker() {
  const pathname = usePathname();
  const search = useSearchParams();

  useEffect(() => {
    const q = search?.toString();
    const fullPath = q ? `${pathname}?${q}` : pathname;
    trackPageView(fullPath || "/");
  }, [pathname, search]);

  return null;
}

