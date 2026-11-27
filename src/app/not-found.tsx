import Link from "next/link";

export default function NotFound() {
  return (
    <div data-theme="house" className="grid min-h-[80vh] place-items-center px-4 text-center">
      <div>
        <p className="eyebrow">404</p>
        <h1 className="display mt-3 text-6xl">This page has evaporated.</h1>
        <p className="lede mx-auto mt-4">The page you're looking for doesn't exist, or it has moved.</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3"><Link href="/" className="btn btn-primary">Home</Link><Link href="/shop" className="btn btn-outline">Shop</Link><Link href="/scent-finder" className="btn btn-ghost">Scent Finder</Link></div>
      </div>
    </div>
  );
}
