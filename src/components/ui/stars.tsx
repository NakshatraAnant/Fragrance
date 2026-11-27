export function Stars({ value, count, size = 14 }: { value: number; count?: number; size?: number }) {
  return (
    <span className="inline-flex items-center gap-1 text-sm" aria-label={`Rated ${value} out of 5${count !== undefined ? ` from ${count} verified review${count === 1 ? "" : "s"}` : ""}`}>
      <span className="inline-flex" aria-hidden>
        {[1, 2, 3, 4, 5].map((i) => (
          <svg key={i} width={size} height={size} viewBox="0 0 20 20" className={i <= Math.round(value) ? "text-gold" : "text-line"} fill="currentColor"><path d="M10 1.5l2.6 5.4 5.9.8-4.3 4.1 1 5.8L10 14.8l-5.2 2.8 1-5.8L1.5 7.7l5.9-.8z" /></svg>
        ))}
      </span>
      {count !== undefined && <span className="text-xs text-muted">({count})</span>}
    </span>
  );
}
