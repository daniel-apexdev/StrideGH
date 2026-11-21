export default function Loading() {
  return (
    <main aria-busy="true" className="flex flex-col gap-3 px-5 pt-5">
      <div className="h-9 w-2/3 animate-pulse rounded bg-tile" />
      <div className="h-12 animate-pulse rounded-xl bg-tile" />
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="h-[142px] animate-pulse rounded-[14px] bg-tile" />
      ))}
    </main>
  );
}
