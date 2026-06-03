import * as React from "react"

import { cn } from "@/lib/utils"

interface LiquidGlassButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  size?: "sm" | "default"
  variant?: "subtle" | "default"
}

export function LiquidGlassButton({
  className,
  size = "default",
  variant = "default",
  ...props
}: LiquidGlassButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-md border border-white/15 bg-white/10 text-white shadow-sm backdrop-blur-md transition hover:bg-white/15 disabled:pointer-events-none disabled:opacity-50",
        size === "sm" ? "h-8 px-3 text-xs" : "h-10 px-4 text-sm",
        variant === "subtle" && "bg-white/8",
        className
      )}
      {...props}
    />
  )
}
