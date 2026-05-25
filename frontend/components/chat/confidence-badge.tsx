import { Badge } from "@/components/shared/badge";

type Conf = "high" | "medium" | "low";

const tone = (c: Conf): "success" | "warn" | "danger" =>
  c === "high" ? "success" : c === "medium" ? "warn" : "danger";

export function ConfidenceBadge({
  confidence,
  reason,
  scores,
}: {
  confidence?: Conf;
  reason?: string;
  scores?: {
    relevance?: number;
    completeness?: number;
    grounding?: number;
    sufficiency?: number;
  };
}) {
  if (!confidence) return null;
  const parts: string[] = [];
  if (scores) {
    for (const k of ["relevance", "completeness", "grounding", "sufficiency"] as const) {
      const v = scores[k];
      if (typeof v === "number") parts.push(`${k}=${v}`);
    }
  }
  const tip = [reason, parts.join("  ")].filter(Boolean).join("\n");
  return (
    <Badge tone={tone(confidence)} title={tip}>
      <span className="capitalize">{confidence}</span> confidence
    </Badge>
  );
}
