"use client";
import { useFormStatus } from "react-dom";
import type { FormState } from "@/lib/form-state";

type Base = { name: string; label: string; state?: FormState; hint?: string; className?: string; required?: boolean };

export function Field({ name, label, state, hint, className = "", required, ...rest }: Base & React.InputHTMLAttributes<HTMLInputElement>) {
  const err = state?.errors?.[name];
  return (
    <div className={`field ${className}`}>
      <label htmlFor={`f-${name}`} className="label">{label}{required && <span aria-hidden className="text-accent"> *</span>}</label>
      <input id={`f-${name}`} name={name} required={required} className="input" defaultValue={rest.type === "password" ? undefined : (state?.data?.[name] as string | undefined)} aria-invalid={!!err} aria-describedby={err ? `e-${name}` : hint ? `h-${name}` : undefined} {...rest} />
      {hint && !err && <p id={`h-${name}`} className="hint">{hint}</p>}
      {err && <p id={`e-${name}`} className="error-text" role="alert">{err}</p>}
    </div>
  );
}

export function TextArea({ name, label, state, hint, className = "", required, ...rest }: Base & React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const err = state?.errors?.[name];
  return (
    <div className={`field ${className}`}>
      <label htmlFor={`f-${name}`} className="label">{label}{required && <span aria-hidden className="text-accent"> *</span>}</label>
      <textarea id={`f-${name}`} name={name} required={required} className="textarea" defaultValue={state?.data?.[name] as string | undefined} aria-invalid={!!err} aria-describedby={err ? `e-${name}` : undefined} {...rest} />
      {hint && !err && <p className="hint">{hint}</p>}
      {err && <p id={`e-${name}`} className="error-text" role="alert">{err}</p>}
    </div>
  );
}

export function SelectField({ name, label, state, options, className = "", required, ...rest }: Base & { options: [string, string][] } & React.SelectHTMLAttributes<HTMLSelectElement>) {
  const err = state?.errors?.[name];
  return (
    <div className={`field ${className}`}>
      <label htmlFor={`f-${name}`} className="label">{label}{required && <span aria-hidden className="text-accent"> *</span>}</label>
      <select id={`f-${name}`} name={name} required={required} className="select" defaultValue={state?.data?.[name] as string | undefined} aria-invalid={!!err} {...rest}>
        {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
      {err && <p className="error-text" role="alert">{err}</p>}
    </div>
  );
}

export function Submit({ children, className = "btn btn-primary" }: { children: React.ReactNode; className?: string }) {
  const { pending } = useFormStatus();
  return <button className={className} disabled={pending} aria-busy={pending}>{pending ? "Please wait…" : children}</button>;
}

export function FormMessage({ state }: { state: FormState }) {
  if (!state?.message) return null;
  return <p role="status" className={`rounded-[var(--radius)] p-3 text-sm ${state.ok ? "bg-ok/10 text-ok" : "bg-danger/10 text-danger"}`} data-testid="form-message">{state.message}</p>;
}
