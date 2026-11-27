"use client";
import { useEffect } from "react";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error(error); }, [error]);
  return (
    <div data-theme="house" className="grid min-h-[70vh] place-items-center px-4 text-center" role="alert">
      <div>
        <p className="eyebrow">Something went wrong</p>
        <h1 className="display mt-3 text-5xl">We couldn't load this page.</h1>
        <p className="lede mx-auto mt-4">Please try again. If it keeps happening, contact support{error.digest ? ` and quote reference ${error.digest}` : ""}.</p>
        <div className="mt-8 flex justify-center gap-3"><button className="btn btn-primary" onClick={reset}>Try again</button><a href="/" className="btn btn-outline">Home</a></div>
      </div>
    </div>
  );
}
