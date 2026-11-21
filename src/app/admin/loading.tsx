export default function AdminLoading() {
  return (
    <div className="flex min-h-dvh flex-col">
      <div className="h-[60px] bg-forest" />
      <div className="mx-auto w-full max-w-6xl animate-pulse px-5 py-8">
        <div className="mb-6 h-10 w-64 rounded-lg bg-tile" />
        <div className="flex flex-col gap-3">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-20 rounded-[14px] bg-tile" />
          ))}
        </div>
      </div>
    </div>
  );
}
