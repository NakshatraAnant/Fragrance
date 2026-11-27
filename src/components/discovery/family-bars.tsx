/** Animated horizontal bars for a fragrance-family profile (relative affinity, 0–100). */
export function FamilyBars({ data, dark }: { data: { slug: string; name: string; colour: string; value: number }[]; dark?: boolean }) {
  return (
    <ul className="grid content-center gap-3" aria-label="Fragrance family profile">
      {data.map((f, i) => (
        <li key={f.slug}>
          <div className="flex justify-between text-sm"><span>{f.name}</span><span className={dark ? "text-bg/60" : "text-muted"}>{f.value}</span></div>
          <div className={`mt-1 h-2 overflow-hidden rounded-full ${dark ? "bg-bg/15" : "bg-surface-2"}`}>
            <div className="h-full origin-left rounded-full" style={{ width: `${f.value}%`, background: f.colour, animation: `grow-x 1s ${i * 0.12}s both cubic-bezier(.2,.7,.1,1)` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}
