export default function ProjectLoading() {
  return (
    <main className="flex h-svh flex-col bg-background text-foreground">
      <header className="flex h-14 items-center justify-between border-b border-border bg-card px-4">
        <div className="h-8 w-48 animate-pulse rounded-md bg-muted" />
        <div className="h-8 w-28 animate-pulse rounded-md bg-muted" />
      </header>
      <div className="grid min-h-0 flex-1 grid-cols-[56px_1fr_280px]">
        <aside className="border-r border-border bg-card p-2">
          {Array.from({ length: 7 }).map((_, index) => (
            <div key={index} className="mb-2 size-10 animate-pulse rounded-md bg-muted" />
          ))}
        </aside>
        <section className="grid place-items-center bg-background">
          <div className="h-[52vh] w-[68vw] animate-pulse rounded-lg border border-border bg-card" />
        </section>
        <aside className="border-l border-border bg-card p-4">
          <div className="h-5 w-28 animate-pulse rounded bg-muted" />
          <div className="mt-5 space-y-3">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="h-9 animate-pulse rounded-md bg-muted" />
            ))}
          </div>
        </aside>
      </div>
    </main>
  );
}