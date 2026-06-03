import type { ReactNode } from "react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="min-h-svh bg-background text-foreground">
      <section className="flex min-h-svh items-center justify-center px-5 py-10">
        {children}
      </section>
    </main>
  );
}