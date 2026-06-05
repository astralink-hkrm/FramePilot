"use client";

import { useQuery } from "convex/react";

import { api } from "@/convex/_generated/api";

function isRemoteUrl(value: string) {
  return value.startsWith("http://") || value.startsWith("https://") || value.startsWith("data:") || value.startsWith("blob:");
}

export function MoodBoardImage({ value }: { value: string }) {
  const resolvedUrl = useQuery(api.projects.resolveMoodboardImage, isRemoteUrl(value) ? "skip" : { storageId: value });
  const src = isRemoteUrl(value) ? value : resolvedUrl;

  if (!src) {
    return <div className="grid h-full w-full place-items-center text-xs text-muted-foreground">Loading image</div>;
  }

  // The tutorial keeps this as a direct image preview; it can become next/image later if needed.
  return <img src={src} alt="Moodboard reference" className="h-full w-full object-cover" />;
}