"use client";
import { useHealth } from "@/hooks/use-health";
import { cn } from "@/lib/cn";

export function HealthPill() {
  const { health, loading } = useHealth();
  const status = health?.status ?? "loading";
  const dot =
    status === "healthy"
      ? "bg-emerald-400"
      : status === "degraded"
        ? "bg-red-400"
        : "bg-amber-400";
  const label =
    status === "healthy"
      ? "Systems healthy"
      : status === "degraded"
        ? "Backend degraded"
        : loading
          ? "Checking…"
          : "Unknown";
  return (
    <div
      className="inline-flex items-center gap-2 rounded-full border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-1 text-xs backdrop-blur"
      title={health?.neo4j ?? ""}
    >
      <span
        className={cn(
          "h-2 w-2 rounded-full animate-pulse-glow",
          dot,
        )}
      />
      <span className="text-[color:var(--foreground-muted)]">{label}</span>
    </div>
  );
}
