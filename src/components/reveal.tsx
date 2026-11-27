"use client";
import { useEffect } from "react";
import { usePathname } from "next/navigation";

/** Adds .is-visible to .reveal / .reveal-img elements as they enter the viewport. */
export function RevealObserver() {
  const pathname = usePathname();
  useEffect(() => {
    const els = document.querySelectorAll<HTMLElement>(".reveal:not(.is-visible), .reveal-img:not(.is-visible)");
    if (!("IntersectionObserver" in window)) { els.forEach((e) => e.classList.add("is-visible")); return; }
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) if (e.isIntersecting) { e.target.classList.add("is-visible"); io.unobserve(e.target); }
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.05 });
    els.forEach((e) => io.observe(e));
    const mo = new MutationObserver(() => document.querySelectorAll<HTMLElement>(".reveal:not(.is-visible), .reveal-img:not(.is-visible)").forEach((e) => io.observe(e)));
    mo.observe(document.body, { childList: true, subtree: true });
    return () => { io.disconnect(); mo.disconnect(); };
  }, [pathname]);
  return null;
}
