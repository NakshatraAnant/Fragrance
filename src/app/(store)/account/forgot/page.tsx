import type { Metadata } from "next";
import { ForgotForm } from "@/components/forms/auth-forms";

export const metadata: Metadata = { title: "Forgot password", robots: { index: false } };

export default function ForgotPage() {
  return (
    <div className="container-x grid min-h-[60vh] place-items-center py-16">
      <div className="w-full max-w-md"><h1 className="display text-5xl">Reset your password</h1><p className="mt-2 text-muted">We'll email you a link to set a new password.</p><div className="mt-8"><ForgotForm /></div></div>
    </div>
  );
}
