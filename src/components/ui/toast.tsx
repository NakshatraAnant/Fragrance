"use client";
import { createContext, useCallback, useContext, useState } from "react";

type Toast = { id: number; message: string; tone: "info" | "success" | "error"; action?: { label: string; href: string } };
const Ctx = createContext<{ toast: (message: string, tone?: Toast["tone"], action?: Toast["action"]) => void }>({ toast: () => {} });

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toast = useCallback((message: string, tone: Toast["tone"] = "info", action?: Toast["action"]) => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t.slice(-2), { id, message, tone, action }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4500);
  }, []);
  return (
    <Ctx.Provider value={{ toast }}>
      {children}
      <div aria-live="polite" role="status" className="pointer-events-none fixed inset-x-0 bottom-20 z-[90] flex flex-col items-center gap-2 px-4 md:bottom-6 md:items-end md:pr-6">
        {toasts.map((t) => (
          <div key={t.id} className="pointer-events-auto flex max-w-sm items-center gap-3 rounded-[var(--radius)] px-4 py-3 text-sm shadow-xl animate-[rise_300ms_ease_both]"
            style={{ background: t.tone === "error" ? "#8c1d16" : "#1c1917", color: "#fff" }}>
            <span>{t.message}</span>
            {t.action && <a href={t.action.href} className="ml-auto font-semibold underline underline-offset-2">{t.action.label}</a>}
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}

export const useToast = () => useContext(Ctx);
