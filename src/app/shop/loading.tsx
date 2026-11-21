export default function Loading() {
  return (
    <main aria-busy="true" className="flex flex-col gap-3 px-5 pt-5">
      <div className="h-9 w-2/3 animate-pulse rounded bg-tile" />
      <div className="h-[120px] animate-pulse rounded-[14px] bg-tile" />
      <div className="grid grid-cols-2 gap-3">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-[210px] animate-pulse rounded-xl bg-tile" />
        ))}
      </div>
    </main>
  );
}
