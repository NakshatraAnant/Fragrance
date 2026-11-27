/** Animated fragrance pyramid (CSS only; respects reduced motion). Notes come from the creative brief. */
export function NotesPyramid({ top, heart, base, opening, development, drydown, colour }: { top: string[]; heart: string[]; base: string[]; opening?: string | null; development?: string | null; drydown?: string | null; colour?: string | null }) {
  const tiers = [
    { k: "Top", notes: top, text: opening, w: "56%" },
    { k: "Heart", notes: heart, text: development, w: "78%" },
    { k: "Base", notes: base, text: drydown, w: "100%" },
  ];
  return (
    <div className="grid gap-3" aria-label="Fragrance pyramid">
      {tiers.map((t, i) => (
        <div key={t.k} className="reveal mx-auto w-full" style={{ maxWidth: t.w, transitionDelay: `${i * 160}ms` }}>
          <div className="relative overflow-hidden rounded-[var(--radius)] border border-line bg-surface p-4 text-center">
            <div aria-hidden className="absolute inset-0 origin-left opacity-20" style={{ background: colour ?? "var(--accent)", animation: `grow-x 1.2s ${i * 0.25}s both cubic-bezier(.2,.7,.1,1)` }} />
            <p className="eyebrow relative">{t.k} notes</p>
            <p className="display relative mt-1 text-xl">{t.notes.join(" · ") || "—"}</p>
            {t.text && <p className="relative mt-1 text-sm text-muted">{t.text}</p>}
          </div>
        </div>
      ))}
      <p className="text-center text-xs text-muted">Notes describe the creative brief's olfactive direction. They are not a formula.</p>
    </div>
  );
}
