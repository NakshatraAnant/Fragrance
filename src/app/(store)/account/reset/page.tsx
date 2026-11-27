import type { Metadata } from "next";
import { ResetForm } from "@/components/forms/auth-forms";

export const metadata: Metadata = { title: "Set a new password", robots: { index: false } };

export default async function ResetPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  return (
    <div className="container-x grid min-h-[60vh] place-items-center py-16">
      <div className="w-full max-w-md"><h1 className="display text-5xl">Set a new password</h1>
        <div className="mt-8">{token ? <ResetForm token={token} /> : <p className="text-danger">This link is missing its token. Request a new one from “Forgot password”.</p>}</div>
      </div>
    </div>
  );
}
