"use client";

type EventParams = Record<string, string | number | boolean | null | undefined>;

declare global {
  interface Window {
    gtag?: (...args: any[]) => void;
    dataLayer?: any[];
  }
}

export function gaEnabled() {
  return typeof window !== "undefined" && typeof window.gtag === "function";
}

export function trackEvent(name: string, params: EventParams = {}) {
  if (!gaEnabled()) return;
  window.gtag!("event", name, params);
}

export function trackPageView(path: string) {
  if (!gaEnabled()) return;
  window.gtag!("event", "page_view", {
    page_path: path,
  });
}
