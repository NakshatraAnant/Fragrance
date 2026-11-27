"use client";
import { useState } from "react";

/** Side-by-side desktop / mobile preview of a storefront path. */
export function PreviewFrame({ path }: { path: string }) {
  const [mode, setMode] = useState<"desktop" | "mobile">("desktop");
  const [key, setKey] = useState(0);
  return (
    <div className="card p-3">
      <div className="mb-2 flex gap-2">
        <button type="button" className={`btn btn-sm ${mode === "desktop" ? "btn-primary" : "btn-outline"}`} onClick={() => setMode("desktop")}>Desktop</button>
        <button type="button" className={`btn btn-sm ${mode === "mobile" ? "btn-primary" : "btn-outline"}`} onClick={() => setMode("mobile")}>Mobile</button>
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => setKey((k) => k + 1)}>Reload</button>
        <a href={path} target="_blank" className="btn btn-ghost btn-sm">Open</a>
      </div>
      <div className="overflow-auto rounded border border-line bg-surface-2 p-2">
        <iframe key={key} title="Storefront preview" src={path} className="mx-auto block rounded border border-line bg-white" style={{ width: mode === "desktop" ? 1280 : 390, height: 640, zoom: mode === "desktop" ? 0.6 : 1 } as React.CSSProperties} />
      </div>
    </div>
  );
}
