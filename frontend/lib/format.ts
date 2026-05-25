export function formatNumber(v: unknown): string {
  if (typeof v === "number" && Number.isFinite(v)) {
    if (Math.abs(v) >= 1000) return v.toLocaleString();
    if (!Number.isInteger(v)) return v.toFixed(2);
    return v.toString();
  }
  if (v == null) return "—";
  return String(v);
}

export function metricKeyToLabel(k: string): string {
  return k
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function uid(): string {
  return Math.random().toString(36).slice(2, 10);
}
