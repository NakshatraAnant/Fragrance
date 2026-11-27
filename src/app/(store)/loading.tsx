export default function Loading() {
  return (
    <div className="container-x py-12" aria-busy="true" aria-label="Loading">
      <div className="skeleton h-4 w-32" />
      <div className="skeleton mt-4 h-14 w-2/3 max-w-xl" />
      <div className="mt-10 grid grid-cols-2 gap-6 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i}><div className="skeleton aspect-[4/5]" /><div className="skeleton mt-3 h-4 w-3/4" /><div className="skeleton mt-2 h-3 w-1/2" /></div>
        ))}
      </div>
    </div>
  );
}
