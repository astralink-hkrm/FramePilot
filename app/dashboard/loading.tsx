export default function DashboardLoading() {
  return (
    <main className="min-h-svh bg-background text-foreground">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-5">
          <div className="h-8 w-28 animate-pulse rounded-md bg-muted" />
          <div className="h-8 w-24 animate-pulse rounded-md bg-muted" />
        </div>
      </header>
      <section className="mx-auto max-w-6xl px-5 py-8">
        <div className="h-8 w-40 animate-pulse rounded-md bg-muted" />
        <div className="mt-3 h-4 w-80 max-w-full animate-pulse rounded bg-muted" />
        <div className="mt-8 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="h-44 animate-pulse rounded-lg border border-border bg-card" />
          ))}
        </div>
      </section>
    </main>
  );
}