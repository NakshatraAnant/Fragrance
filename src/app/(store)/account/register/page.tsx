import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { RegisterForm } from "@/components/forms/auth-forms";

export const metadata: Metadata = { title: "Create an account", robots: { index: false } };

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  if (await getCurrentUser()) redirect("/account");
  return (
    <div className="container-x grid gap-12 py-16 md:grid-cols-2 md:items-start">
      <div>
        <p className="eyebrow">Join the house</p>
        <h1 className="display mt-2 text-5xl">Create your Fragrance Wardrobe</h1>
        <ul className="mt-6 grid gap-3 text-muted">
          <li>· Save your Scent Finder profile and layering pairs</li>
          <li>· Use discovery credits on your first full size</li>
          <li>· Get replenishment reminders when you're running low (if you opt in)</li>
          <li>· Order history, saved addresses and verified reviews</li>
        </ul>
      </div>
      <div className="card p-6 md:p-8"><RegisterForm next={next} /></div>
    </div>
  );
}
