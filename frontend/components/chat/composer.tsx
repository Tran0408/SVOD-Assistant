"use client";
import { useState, type KeyboardEvent } from "react";
import { Send, Loader2, Brain } from "lucide-react";
import { cn } from "@/lib/cn";

export function Composer({
  onSend,
  sending,
  deepMode = false,
  onToggleDeep,
}: {
  onSend: (q: string) => void;
  sending: boolean;
  deepMode?: boolean;
  onToggleDeep?: (v: boolean) => void;
}) {
  const [text, setText] = useState("");

  const submit = () => {
    const v = text.trim();
    if (!v || sending) return;
    onSend(v);
    setText("");
  };

  const onKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey || !e.shiftKey)) {
      if (!e.shiftKey) {
        e.preventDefault();
        submit();
      }
    }
  };

  return (
    <div>
      <label htmlFor="composer" className="sr-only">
        Ask a question
      </label>
      <div className="relative">
        <textarea
          id="composer"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={onKey}
          rows={1}
          placeholder="Ask anything about the SVOD knowledge graph…"
          disabled={sending}
          className="block w-full resize-none rounded-2xl border border-black/10 bg-white/70 py-3.5 pl-4 pr-14 text-sm text-black placeholder:text-black/40 backdrop-blur-xl focus:border-[color:var(--accent)]/60 focus:outline-none focus:ring-0 disabled:opacity-60"
          style={{ minHeight: 52, maxHeight: 200, boxShadow: "inset 0px 2px 2px 0px rgba(255,255,255,0.4)" }}
        />
        <button
          type="button"
          onClick={submit}
          disabled={!text.trim() || sending}
          aria-label="Send"
          className={cn(
            "absolute right-2.5 top-1/2 -translate-y-1/2 inline-flex h-8 w-8 items-center justify-center rounded-full",
            "text-white transition-all",
            "disabled:opacity-40 cursor-pointer",
          )}
          style={{
            background: "var(--lg-electric-blue-soft)",
            boxShadow: "inset 0px 4px 4px 0px rgba(255,255,255,0.35)",
          }}
        >
          {sending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </button>
      </div>
      <div className="mt-2 flex items-center justify-between pl-1 pr-1">
        <p className="text-[10px] text-black/45">
          Enter to send · Shift+Enter for new line
        </p>
        {onToggleDeep && (
          <button
            type="button"
            onClick={() => onToggleDeep(!deepMode)}
            className={cn(
              "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[10px] font-medium transition-colors cursor-pointer",
              deepMode
                ? "border-[var(--lg-electric-blue)]/50 bg-[var(--lg-electric-blue)]/12 text-[var(--lg-electric-blue)]"
                : "border-black/10 bg-white/40 text-black/55 hover:text-black",
            )}
            title="Deep mode: iterative multi-query reasoning (slower, deeper)"
          >
            <Brain className="h-3 w-3" />
            Deep mode {deepMode ? "ON" : "OFF"}
          </button>
        )}
      </div>
    </div>
  );
}
