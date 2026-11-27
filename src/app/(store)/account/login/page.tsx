import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { LoginForm } from "@/components/forms/auth-forms";

export const metadata: Metadata = { title: "Sign in", robots: { index: false } };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  if (await getCurrentUser()) redirect(next?.startsWith("/") ? next : "/account");
  return (
    <div className="container-x grid min-h-[70vh] place-items-center py-16">
      <div className="w-full max-w-md">
        <p className="eyebrow">Welcome back</p>
        <h1 className="display mt-2 text-5xl">Sign in</h1>
        <p className="mt-2 text-muted">Your Fragrance Wardrobe, orders and discovery credits are all in one place.</p>
        <div className="mt-8"><LoginForm next={next} /></div>
      </div>
    </div>
  );
}
