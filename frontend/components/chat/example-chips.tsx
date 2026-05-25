"use client";
import { Sparkles } from "lucide-react";

const EXAMPLES = [
  "Top 5 most watched content by total hours",
  "How many accounts churned in 2024 by product tier?",
  "What are the top genres by total watch hours?",
  "Accounts acquired in Jan 2023 that are still active",
];

export function ExampleChips({
  onPick,
  disabled,
}: {
  onPick: (q: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-xs text-[color:var(--foreground-muted)]">
        <Sparkles className="h-3.5 w-3.5 text-[color:var(--accent)]" />
        Try an example
      </div>
      <div className="flex flex-wrap gap-2">
        {EXAMPLES.map((q) => (
          <button
            key={q}
            disabled={disabled}
            onClick={() => onPick(q)}
            className="rounded-full border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-1.5 text-xs text-foreground transition-all hover:border-[color:var(--accent)]/50 hover:bg-[color:var(--surface-hover)] disabled:opacity-50 cursor-pointer"
          >
            {q}
          </button>
        ))}
      </div>
    </div>
  );
}
