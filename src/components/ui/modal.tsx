"use client";
import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";

/** Accessible modal / drawer: focus trap, Escape to close, scroll lock, restores focus. */
export function Modal({ open, onClose, title, children, wide, variant = "center" }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode; wide?: boolean; variant?: "center" | "right" | "bottom" }) {
  const ref = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const el = ref.current;
    const focusables = () => Array.from(el?.querySelectorAll<HTMLElement>('a[href],button:not([disabled]),input,select,textarea,[tabindex]:not([tabindex="-1"])') ?? []);
    setTimeout(() => (focusables()[0] ?? el)?.focus(), 30);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeRef.current();
      if (e.key === "Tab") {
        const f = focusables();
        if (!f.length) return;
        if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
        else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = overflow; prev?.focus?.(); };
  }, [open]);
  if (!open || typeof document === "undefined") return null;
  const panel =
    variant === "right" ? "ml-auto h-full w-full max-w-md animate-[slide-in-right_320ms_cubic-bezier(.2,.7,.1,1)]"
      : variant === "bottom" ? "mt-auto max-h-[85vh] w-full overflow-y-auto rounded-t-2xl animate-[slide-up_280ms_ease]"
        : "m-auto max-h-[90vh] overflow-y-auto animate-[rise_300ms_ease]";
  return createPortal(
    <div className="fixed inset-0 z-[80] flex bg-black/45 backdrop-blur-[2px]" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div ref={ref} role="dialog" aria-modal="true" aria-label={title} tabIndex={-1} style={variant === "center" ? { width: `min(94vw, ${wide ? "56rem" : "32rem"})` } : undefined} className={`relative flex flex-col bg-surface text-ink shadow-2xl ${variant === "center" ? "rounded-[var(--radius)] p-6" : ""} ${panel}`}>
        {variant === "center" && (
          <div className="mb-4 flex items-start justify-between gap-4">
            <h2 className="display text-2xl">{title}</h2>
            <button onClick={onClose} className="btn btn-ghost btn-sm" aria-label="Close">✕</button>
          </div>
        )}
        {children}
      </div>
    </div>,
    document.body,
  );
}
