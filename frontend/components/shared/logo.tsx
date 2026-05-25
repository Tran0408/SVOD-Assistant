import Link from "next/link";
import { cn } from "@/lib/cn";

export function Logo({ className }: { className?: string }) {
  return (
    <Link
      href="/"
      className={cn(
        "group inline-flex items-center gap-2 text-foreground font-semibold tracking-tight",
        className,
      )}
    >
      <span className="relative inline-flex h-7 w-7 items-center justify-center rounded-lg border border-[color:var(--border-strong)] bg-[color:var(--bg-elevated)]">
        <span className="absolute inset-0 rounded-lg bg-[color:var(--accent-glow)] opacity-50 blur-md transition-opacity group-hover:opacity-80" />
        <svg
          viewBox="0 0 24 24"
          className="relative h-4 w-4 text-[color:var(--accent)]"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="6" cy="6" r="2" />
          <circle cx="18" cy="6" r="2" />
          <circle cx="6" cy="18" r="2" />
          <circle cx="18" cy="18" r="2" />
          <circle cx="12" cy="12" r="2.5" />
          <path d="M8 6h8M8 18h8M6 8v8M18 8v8M9 9l6 6M15 9l-6 6" opacity="0.5" />
        </svg>
      </span>
      <span className="font-display text-[16px] font-bold tracking-tight">
        SVOD<span className="text-[color:var(--foreground-muted)]"> · </span>
        Assistant
      </span>
    </Link>
  );
}
