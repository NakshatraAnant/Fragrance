import Link from "next/link";

export default async function Forbidden({ searchParams }: { searchParams: Promise<{ need?: string }> }) {
  const { need } = await searchParams;
  return (
    <div className="card mx-auto mt-16 max-w-lg p-8 text-center" data-testid="forbidden">
      <h1 className="text-2xl font-bold">You don't have access</h1>
      <p className="mt-2 text-muted">Your role doesn't include the <code>{need ?? "required"}</code> permission. Ask a super admin if you need it.</p>
      <Link href="/admin" className="btn btn-outline btn-sm mt-6">Back to dashboard</Link>
    </div>
  );
}
