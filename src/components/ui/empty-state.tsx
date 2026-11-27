export function EmptyState({ title, body, children }: { title: string; body?: string; children?: React.ReactNode }) {
  return (
    <div className="grid place-items-center gap-4 rounded-[var(--radius)] border border-dashed border-line px-6 py-16 text-center" role="status">
      <svg width="48" height="48" viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.2" className="text-muted" aria-hidden><path d="M18 10h12v6l4 4v20a2 2 0 0 1-2 2H16a2 2 0 0 1-2-2V20l4-4z" /><path d="M18 16h12" /></svg>
      <p className="display text-2xl">{title}</p>
      {body && <p className="max-w-md text-muted">{body}</p>}
      {children && <div className="flex flex-wrap justify-center gap-3">{children}</div>}
    </div>
  );
}

export function ErrorState({ title = "Something went wrong", body = "Please try again. If it keeps happening, contact support.", children }: { title?: string; body?: string; children?: React.ReactNode }) {
  return (
    <div role="alert" className="grid place-items-center gap-3 rounded-[var(--radius)] border border-danger/30 bg-danger/5 px-6 py-12 text-center">
      <p className="display text-2xl">{title}</p><p className="max-w-md text-muted">{body}</p>{children}
    </div>
  );
}
