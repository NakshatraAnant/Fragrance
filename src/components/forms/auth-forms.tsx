"use client";
import Link from "next/link";
import { useActionState } from "react";
import { login, register, requestReset, resetPassword } from "@/app/actions/auth";
import { Field, FormMessage, Submit } from "./fields";

export function LoginForm({ next }: { next?: string }) {
  const [state, action] = useActionState(login, null);
  return (
    <form action={action} className="grid gap-4" data-testid="login-form">
      <input type="hidden" name="next" value={next ?? "/account"} />
      <Field name="email" label="Email" type="email" required autoComplete="email" state={state} />
      <Field name="password" label="Password" type="password" required autoComplete="current-password" state={state} />
      <FormMessage state={state} />
      <Submit className="btn btn-primary btn-block">Sign in</Submit>
      <div className="flex justify-between text-sm"><Link href="/account/forgot" className="underline">Forgot password?</Link><Link href={`/account/register${next ? `?next=${encodeURIComponent(next)}` : ""}`} className="underline">Create an account</Link></div>
    </form>
  );
}

export function RegisterForm({ next }: { next?: string }) {
  const [state, action] = useActionState(register, null);
  return (
    <form action={action} className="grid gap-4" data-testid="register-form">
      <input type="hidden" name="next" value={next ?? "/account"} />
      <Field name="name" label="Name" required autoComplete="name" state={state} />
      <Field name="email" label="Email" type="email" required autoComplete="email" state={state} />
      <Field name="phone" label="Mobile (optional)" type="tel" autoComplete="tel" state={state} />
      <Field name="password" label="Password" type="password" required autoComplete="new-password" state={state} hint="At least 10 characters, with letters and numbers." />
      <Field name="referral" label="Referral code (optional)" state={state} />
      <label className="flex items-start gap-2 text-sm"><input type="checkbox" name="marketing" className="mt-0.5 accent-[var(--accent)]" /> Email me news and offers (optional).</label>
      <label className="flex items-start gap-2 text-sm"><input type="checkbox" name="whatsapp" className="mt-0.5 accent-[var(--accent)]" /> Send me WhatsApp updates and replenishment reminders (optional).</label>
      <FormMessage state={state} />
      <Submit className="btn btn-primary btn-block">Create account</Submit>
      <p className="text-xs text-muted">By creating an account you agree to our <Link href="/terms" className="underline">terms</Link> and <Link href="/privacy" className="underline">privacy policy</Link>.</p>
    </form>
  );
}

export function ForgotForm() {
  const [state, action] = useActionState(requestReset, null);
  return (
    <form action={action} className="grid gap-4">
      <Field name="email" label="Email" type="email" required autoComplete="email" state={state} />
      <FormMessage state={state} />
      <Submit className="btn btn-primary btn-block">Send reset link</Submit>
    </form>
  );
}

export function ResetForm({ token }: { token: string }) {
  const [state, action] = useActionState(resetPassword, null);
  if (state?.ok) return <div className="grid gap-4"><FormMessage state={state} /><Link href="/account/login" className="btn btn-primary">Sign in</Link></div>;
  return (
    <form action={action} className="grid gap-4">
      <input type="hidden" name="token" value={token} />
      <Field name="password" label="New password" type="password" required autoComplete="new-password" state={state} hint="At least 10 characters, with letters and numbers." />
      <FormMessage state={state} />
      <Submit className="btn btn-primary btn-block">Set new password</Submit>
    </form>
  );
}
