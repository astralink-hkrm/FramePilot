"use client";

import { useEffect, useMemo, useState } from "react";
import { Sparkles } from "lucide-react";

import { getAiUsage } from "@/lib/ai-usage";

export function AiUsagePill() {
  const [usage, setUsage] = useState<ReturnType<typeof getAiUsage> | null>(null);

  useEffect(() => {
    const sync = () => setUsage(getAiUsage());

    sync();
    window.addEventListener("storage", sync);
    window.addEventListener("s2c-ai-usage", sync);

    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("s2c-ai-usage", sync);
    };
  }, []);

  const resetLabel = useMemo(
    () => {
      if (!usage) return "--";

      return new Intl.DateTimeFormat(undefined, {
        hour: "numeric",
        minute: "2-digit",
      }).format(usage.resetAt);
    },
    [usage]
  );

  return (
    <div
      className="hidden items-center gap-2 rounded-md border border-border bg-background px-3 py-1.5 text-xs text-muted-foreground shadow-sm md:flex"
      title="Local estimate only. Google does not expose exact free-tier remaining quota to this app."
    >
      <Sparkles className="size-3.5 text-foreground" />
      <span className="font-medium text-foreground">
        {usage ? `${usage.remaining}/${usage.limit}` : "--/--"}
      </span>
      <span>AI left</span>
      <span className="text-border">|</span>
      <span>resets {resetLabel}</span>
    </div>
  );
}
