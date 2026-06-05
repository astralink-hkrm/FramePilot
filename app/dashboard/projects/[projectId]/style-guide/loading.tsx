export default function StyleGuideLoading() {
  return (
    <main className="min-h-svh bg-background text-foreground">
      <header className="flex h-14 items-center justify-between border-b border-border bg-card px-4">
        <div className="h-8 w-44 animate-pulse rounded-md bg-muted" />
        <div className="h-8 w-24 animate-pulse rounded-md bg-muted" />
      </header>
      <section className="mx-auto max-w-6xl px-5 py-8">
        <div className="h-9 w-44 animate-pulse rounded-md bg-muted" />
        <div className="mt-4 h-5 w-96 max-w-full animate-pulse rounded bg-muted" />
        <div className="mt-8 h-10 w-96 max-w-full animate-pulse rounded-lg bg-muted" />
        <div className="mt-6 h-96 animate-pulse rounded-lg border border-border bg-card" />
      </section>
    </main>
  );
}