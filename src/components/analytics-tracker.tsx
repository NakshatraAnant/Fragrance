"use client";
import { useEffect } from "react";
import { usePathname } from "next/navigation";

/** Client analytics: batches events to /api/analytics with sendBeacon. No third-party scripts. */
type Ev = { name: string; brand?: string | null; productId?: string | null; sku?: string | null; props?: Record<string, unknown>; valuePaise?: number };
let queue: (Ev & { path: string; referrer: string; ts: number })[] = [];
let timer: ReturnType<typeof setTimeout> | null = null;

function sessionId() {
  try {
    let id = sessionStorage.getItem("fh_sid");
    if (!id) { id = crypto.randomUUID(); sessionStorage.setItem("fh_sid", id); }
    return id;
  } catch { return "anon"; }
}

function flush() {
  if (!queue.length) return;
  const body = JSON.stringify({ sessionId: sessionId(), events: queue.splice(0, 25) });
  const blob = new Blob([body], { type: "application/json" });
  if (!navigator.sendBeacon?.("/api/analytics", blob)) fetch("/api/analytics", { method: "POST", body, headers: { "Content-Type": "application/json" }, keepalive: true }).catch(() => {});
}

export function track(name: string, data: Omit<Ev, "name"> = {}) {
  if (typeof window === "undefined") return;
  queue.push({ name, ...data, path: location.pathname + location.search, referrer: document.referrer, ts: Date.now() });
  if (timer) clearTimeout(timer);
  timer = setTimeout(flush, 800);
}

export function AnalyticsTracker() {
  const pathname = usePathname();
  useEffect(() => {
    if (pathname.startsWith("/admin")) return;
    track("page_view");
    const brand = pathname.split("/")[1];
    if (["dhun", "vasana", "anvaya"].includes(brand)) track("brand_visit", { brand });
  }, [pathname]);
  useEffect(() => {
    const onHide = () => document.visibilityState === "hidden" && flush();
    document.addEventListener("visibilitychange", onHide);
    return () => document.removeEventListener("visibilitychange", onHide);
  }, []);
  return null;
}
