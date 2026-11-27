"use client";
import { useRef, useState } from "react";
import Image from "next/image";
import { ProductVisual } from "./product-visual";

type Slide = { url: string; alt: string; kind: "IMAGE" | "VIDEO" } | { illustration: true; caption: string };

export function Gallery({ name, format, brand, colour, media }: { name: string; format: string; brand: string; colour: string | null; media: { url: string; alt: string; slot: string; mimeType: string | null }[] }) {
  const slides: Slide[] = media.length
    ? media.map((m) => ({ url: m.url, alt: m.alt, kind: m.slot === "VIDEO" || m.mimeType?.startsWith("video") ? "VIDEO" : "IMAGE" }))
    : [{ illustration: true, caption: "Illustration" }, { illustration: true, caption: "Scent colour study" }];
  const [i, setI] = useState(0);
  const track = useRef<HTMLDivElement>(null);
  const go = (n: number) => { setI(n); track.current?.children[n]?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "start" }); };
  return (
    <div className="grid gap-3">
      <div ref={track} className="no-scrollbar flex snap-x snap-mandatory overflow-x-auto rounded-[var(--radius)]" onScroll={(e) => { const el = e.currentTarget; setI(Math.round(el.scrollLeft / el.clientWidth)); }} aria-roledescription="carousel" aria-label={`${name} images`}>
        {slides.map((s, idx) => (
          <div key={idx} className="relative aspect-[4/5] w-full shrink-0 snap-start sm:aspect-[4/3] lg:aspect-[4/5]" aria-roledescription="slide" aria-label={`${idx + 1} of ${slides.length}`}>
            {"illustration" in s ? (
              idx === 0 ? <ProductVisual name={name} format={format} brand={brand} colour={colour} className="h-full w-full" priority /> : (
                <div className="grid h-full place-items-center p-10" style={{ background: `radial-gradient(circle at 40% 35%, ${colour ?? "#b5725a"} 0%, transparent 55%), var(--surface-2)` }}>
                  <p className="display max-w-xs text-center text-3xl opacity-80">{name}</p>
                  <span className="absolute bottom-2 left-2 rounded-full bg-black/40 px-2 py-0.5 text-[10px] uppercase tracking-wider text-white">Colour study · photography pending</span>
                </div>
              )
            ) : s.kind === "VIDEO" ? <video src={s.url} controls playsInline className="h-full w-full object-cover" /> : <Image src={s.url} alt={s.alt} fill sizes="(min-width: 1024px) 50vw, 100vw" className="object-cover" priority={idx === 0} />}
          </div>
        ))}
      </div>
      {slides.length > 1 && (
        <div className="flex gap-2" role="tablist" aria-label="Choose image">
          {slides.map((_, idx) => <button key={idx} role="tab" aria-selected={i === idx} aria-label={`Show image ${idx + 1}`} onClick={() => go(idx)} className={`h-1.5 flex-1 rounded-full transition ${i === idx ? "bg-ink" : "bg-line"}`} />)}
        </div>
      )}
    </div>
  );
}

export function StickyBuyBar({ name, price, targetId }: { name: string; price: string; targetId: string }) {
  return (
    <div className="fixed inset-x-0 bottom-14 z-30 flex items-center justify-between gap-3 border-t border-line bg-bg/95 px-4 py-3 backdrop-blur md:hidden">
      <div className="min-w-0"><p className="truncate text-sm font-semibold">{name}</p><p className="text-sm">{price}</p></div>
      <a href={`#${targetId}`} className="btn btn-primary btn-sm">Choose & add</a>
    </div>
  );
}
