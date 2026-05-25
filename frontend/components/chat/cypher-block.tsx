"use client";
import { useState } from "react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/shared/collapsible";
import { ChevronRight, Copy, Check } from "lucide-react";
import { cn } from "@/lib/cn";

export function CypherBlock({ cypher }: { cypher: string }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(cypher);
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch {}
  };

  if (!cypher) return null;

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="mt-3">
      <div className="flex items-center justify-between">
        <CollapsibleTrigger className="group inline-flex items-center gap-1 text-[11px] text-[color:var(--foreground-muted)] hover:text-foreground transition-colors cursor-pointer">
          <ChevronRight
            className={cn(
              "h-3 w-3 transition-transform duration-200",
              open && "rotate-90",
            )}
          />
          {open ? "Hide" : "View"} generated Cypher
        </CollapsibleTrigger>
        {open && (
          <button
            onClick={copy}
            className="inline-flex items-center gap-1 text-[11px] text-[color:var(--foreground-muted)] hover:text-foreground transition-colors cursor-pointer"
          >
            {copied ? (
              <>
                <Check className="h-3 w-3" /> Copied
              </>
            ) : (
              <>
                <Copy className="h-3 w-3" /> Copy
              </>
            )}
          </button>
        )}
      </div>
      <CollapsibleContent className="mt-2">
        <pre className="overflow-x-auto rounded-lg border border-[color:var(--border)] bg-[color:var(--bg-deep)] p-3 font-mono text-[11.5px] leading-relaxed text-[color:var(--foreground)]">
          {cypher}
        </pre>
      </CollapsibleContent>
    </Collapsible>
  );
}
