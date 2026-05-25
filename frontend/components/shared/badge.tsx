import { cn } from "@/lib/cn";
import type { HTMLAttributes } from "react";

type Tone = "default" | "accent" | "success" | "warn" | "danger" | "muted";

const tones: Record<Tone, string> = {
  default: "bg-[color:var(--surface)] text-foreground border-[color:var(--border)]",
  accent:
    "bg-[color:var(--accent-glow)] text-[color:var(--accent)] border-[color:var(--accent)]/40",
  success: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  warn: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  danger: "bg-red-500/15 text-red-300 border-red-500/30",
  muted: "bg-white/5 text-[color:var(--foreground-muted)] border-white/10",
};

export function Badge({
  tone = "default",
  className,
  ...rest
}: HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium",
        tones[tone],
        className,
      )}
      {...rest}
    />
  );
}
