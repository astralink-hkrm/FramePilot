import type { GeneratedUIShape } from "@/redux/slice/shapes";

type GeneratedUiSpec = {
  title?: string;
  prompt?: string;
  sections?: Array<{
    label: string;
    tone: string;
  }>;
  html?: string;
  stylesheet?: string;
  code?: string;
  fallback?: boolean;
  providerError?: string;
  streaming?: boolean;
};

const utilityStyles = `
* { box-sizing: border-box; }
html, body { margin: 0; width: 100%; min-height: 100%; overflow: hidden; background: transparent; }
body { font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
[data-generated-ui] { width: 100%; min-height: 100%; }
.container { width: 100%; margin-left: auto; margin-right: auto; }
.mx-auto { margin-left: auto; margin-right: auto; }
.max-w-7xl { max-width: 80rem; }
.max-w-6xl { max-width: 72rem; }
.max-w-5xl { max-width: 64rem; }
.max-w-4xl { max-width: 56rem; }
.grid { display: grid; }
.flex { display: flex; }
.inline-flex { display: inline-flex; }
.hidden { display: none; }
.items-start { align-items: flex-start; }
.items-center { align-items: center; }
.justify-center { justify-content: center; }
.justify-between { justify-content: space-between; }
.flex-wrap { flex-wrap: wrap; }
.flex-col { flex-direction: column; }
.gap-2 { gap: .5rem; }
.gap-3 { gap: .75rem; }
.gap-4 { gap: 1rem; }
.gap-6 { gap: 1.5rem; }
.gap-8 { gap: 2rem; }
.gap-12 { gap: 3rem; }
.space-y-3 > * + * { margin-top: .75rem; }
.space-y-4 > * + * { margin-top: 1rem; }
.space-y-6 > * + * { margin-top: 1.5rem; }
.space-x-4 > * + * { margin-left: 1rem; }
.w-full { width: 100%; }
.h-full { height: 100%; }
.min-h-full { min-height: 100%; }
.aspect-video { aspect-ratio: 16 / 9; }
.overflow-hidden { overflow: hidden; }
.rounded { border-radius: .25rem; }
.rounded-md { border-radius: .375rem; }
.rounded-lg { border-radius: .5rem; }
.rounded-xl { border-radius: .75rem; }
.rounded-2xl { border-radius: 1rem; }
.border { border: 1px solid rgba(148, 163, 184, .28); }
.p-4 { padding: 1rem; }
.p-6 { padding: 1.5rem; }
.p-8 { padding: 2rem; }
.px-4 { padding-left: 1rem; padding-right: 1rem; }
.px-6 { padding-left: 1.5rem; padding-right: 1.5rem; }
.px-8 { padding-left: 2rem; padding-right: 2rem; }
.py-3 { padding-top: .75rem; padding-bottom: .75rem; }
.py-4 { padding-top: 1rem; padding-bottom: 1rem; }
.py-12 { padding-top: 3rem; padding-bottom: 3rem; }
.py-16 { padding-top: 4rem; padding-bottom: 4rem; }
.py-20 { padding-top: 5rem; padding-bottom: 5rem; }
.mb-8 { margin-bottom: 2rem; }
.mb-12 { margin-bottom: 3rem; }
.mb-16 { margin-bottom: 4rem; }
.mt-4 { margin-top: 1rem; }
.mt-6 { margin-top: 1.5rem; }
.mt-8 { margin-top: 2rem; }
.text-sm { font-size: .875rem; line-height: 1.25rem; }
.text-base { font-size: 1rem; line-height: 1.5rem; }
.text-lg { font-size: 1.125rem; line-height: 1.75rem; }
.text-xl { font-size: 1.25rem; line-height: 1.75rem; }
.text-2xl { font-size: 1.5rem; line-height: 2rem; }
.text-3xl { font-size: 1.875rem; line-height: 2.25rem; }
.text-4xl { font-size: 2.25rem; line-height: 2.5rem; }
.text-5xl { font-size: 3rem; line-height: 1; }
.font-medium { font-weight: 500; }
.font-semibold { font-weight: 600; }
.font-bold { font-weight: 700; }
.leading-tight { line-height: 1.15; }
.leading-snug { line-height: 1.25; }
.leading-relaxed { line-height: 1.625; }
.text-center { text-align: center; }
.uppercase { text-transform: uppercase; }
.tracking-wide { letter-spacing: .025em; }
.shadow-lg { box-shadow: 0 10px 30px rgba(0, 0, 0, .16); }
.shadow-xl { box-shadow: 0 18px 48px rgba(0, 0, 0, .22); }
.animate-pulse { animation: pulse 1.6s ease-in-out infinite; }
@keyframes pulse { 0%, 100% { opacity: .52; } 50% { opacity: .92; } }
@media (min-width: 768px) {
  .md\\:grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .md\\:grid-cols-3 { grid-template-columns: repeat(3, minmax(0, 1fr)); }
  .md\\:text-4xl { font-size: 2.25rem; line-height: 2.5rem; }
  .md\\:text-5xl { font-size: 3rem; line-height: 1; }
}
`;

function parseSpec(value: string | null): GeneratedUiSpec {
  if (!value) return {};

  try {
    return JSON.parse(value) as GeneratedUiSpec;
  } catch {
    return { title: "Generated UI", prompt: value };
  }
}

function buildSrcDoc(spec: GeneratedUiSpec) {
  const html = spec.html || spec.code || "<div data-generated-ui></div>";

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<style>${utilityStyles}\n${spec.stylesheet ?? ""}</style>
</head>
<body>${html}</body>
</html>`;
}

export function GeneratedUI({ shape }: { shape: GeneratedUIShape }) {
  const spec = parseSpec(shape.uiSpecData);
  const hasHtmlPreview = Boolean(spec.html || spec.code);
  const statusLabel = spec.streaming ? "Streaming" : spec.fallback ? "Fallback" : "HTML + CSS";
  const sections = spec.sections?.length
    ? spec.sections
    : [
        { label: "Hero", tone: "Primary interaction" },
        { label: "Content", tone: "Generated layout" },
        { label: "Actions", tone: "Conversion area" },
      ];

  return (
    <div
      className="absolute pointer-events-none overflow-hidden rounded-[10px] border border-primary/30 bg-background shadow-2xl shadow-black/40"
      style={{ left: shape.x, top: shape.y, width: shape.w, height: shape.h }}
    >
      <div className="flex h-9 items-center justify-between border-b border-border bg-card px-4">
        <div className="flex min-w-0 items-center gap-2">
          <span className={spec.streaming ? "size-2 shrink-0 animate-pulse rounded-full bg-primary" : "size-2 shrink-0 rounded-full bg-primary"} />
          <span className="truncate text-xs font-semibold text-foreground">{spec.title ?? "Generated UI"}</span>
        </div>
        <span className="shrink-0 text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{statusLabel}</span>
      </div>

      {hasHtmlPreview ? (
        <iframe
          title={spec.title ?? "Generated UI preview"}
          sandbox=""
          srcDoc={buildSrcDoc(spec)}
          className="h-[calc(100%-36px)] w-full border-0 bg-background"
        />
      ) : (
        <div className="grid h-[calc(100%-36px)] grid-cols-[1fr_0.72fr] gap-5 p-5">
          <section className="min-w-0 space-y-4">
            {spec.providerError ? <p className="rounded-md border border-destructive/30 bg-destructive/10 p-2 text-[11px] leading-4 text-destructive">{spec.providerError}</p> : null}
            <div className="h-2 w-28 rounded-full bg-primary/70" />
            <div className="space-y-2">
              <div className="h-5 w-52 rounded bg-foreground/85" />
              <div className="h-5 w-40 rounded bg-foreground/65" />
            </div>
            <div className="space-y-2">
              <div className="h-2.5 w-full rounded bg-muted-foreground/35" />
              <div className="h-2.5 w-10/12 rounded bg-muted-foreground/25" />
              <div className="h-2.5 w-7/12 rounded bg-muted-foreground/20" />
            </div>
            <div className="flex gap-2 pt-1">
              <div className="h-8 w-28 rounded-md bg-primary" />
              <div className="h-8 w-24 rounded-md border border-border bg-card" />
            </div>
          </section>

          <section className="grid gap-3">
            {sections.slice(0, 3).map((section, index) => (
              <div key={`${section.label}-${index}`} className="rounded-md border border-border bg-card p-3">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-[11px] font-medium text-foreground">{section.label}</span>
                  <span className="size-2 rounded-full bg-primary/70" />
                </div>
                <div className="space-y-2">
                  <div className="h-2 w-full rounded bg-muted" />
                  <div className="h-2 w-8/12 rounded bg-muted" />
                </div>
              </div>
            ))}
          </section>
        </div>
      )}
    </div>
  );
}