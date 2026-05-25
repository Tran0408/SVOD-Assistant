"use client";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { CypherBlock } from "./cypher-block";
import { ConfidenceBadge } from "./confidence-badge";
import type { ChatMessage } from "@/lib/types";
import { AlertCircle, HelpCircle, Loader2, Bot } from "lucide-react";

export function MessageList({
  messages,
  onClarify,
  onFollowup,
  onRetryDeep,
}: {
  messages: ChatMessage[];
  onClarify: (combined: string, displayText: string) => void;
  onFollowup: (q: string) => void;
  onRetryDeep: (q: string) => void;
}) {
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length]);

  return (
    <div className="space-y-5">
      {messages.map((m) =>
        m.role === "user" ? (
          <UserBubble key={m.id} text={m.text} />
        ) : m.kind === "loading" ? (
          <LoadingBubble key={m.id} progress={m.progress} />
        ) : m.kind === "clarification" ? (
          <ClarificationBubble key={m.id} message={m} onClarify={onClarify} />
        ) : m.kind === "error" ? (
          <ErrorBubble key={m.id} message={m} />
        ) : (
          <AnswerBubble key={m.id} message={m} onFollowup={onFollowup} onRetryDeep={onRetryDeep} />
        ),
      )}
      <div ref={endRef} />
    </div>
  );
}

function UserBubble({ text }: { text: string }) {
  return (
    <div className="flex justify-end animate-message-in">
      <div
        className="max-w-[85%] rounded-2xl rounded-br-md px-4 py-2.5 text-sm font-medium text-white"
        style={{
          background: "var(--lg-electric-blue-soft)",
          boxShadow: "inset 0px 2px 2px 0px rgba(255,255,255,0.3)",
        }}
      >
        {text}
      </div>
    </div>
  );
}

function BotShell({
  children,
  tone,
  icon,
}: {
  children: React.ReactNode;
  tone?: "warn" | "danger";
  icon?: React.ReactNode;
}) {
  return (
    <div className="flex gap-3 animate-message-in">
      <div
        className={cn(
          "mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border",
          tone === "warn"
            ? "border-amber-500/40 bg-amber-500/10 text-amber-300"
            : tone === "danger"
              ? "border-red-500/40 bg-red-500/10 text-red-300"
              : "border-[color:var(--border-strong)] bg-[color:var(--bg-elevated)] text-[color:var(--accent)]",
        )}
      >
        {icon ?? <Bot className="h-4 w-4" />}
      </div>
      <div
        className={cn(
          "glass max-w-[85%] flex-1 rounded-2xl rounded-bl-md p-4",
          tone === "warn" && "border-amber-500/30",
          tone === "danger" && "border-red-500/30",
        )}
      >
        {children}
      </div>
    </div>
  );
}

function LoadingBubble({ progress }: { progress?: string }) {
  return (
    <BotShell icon={<Loader2 className="h-4 w-4 animate-spin" />}>
      <div className="flex items-center gap-2 text-sm text-[color:var(--foreground-muted)]">
        <span>{progress ?? "Thinking…"}</span>
      </div>
      <div className="mt-3 space-y-2">
        <div className="h-2.5 w-3/4 animate-pulse rounded bg-black/5" />
        <div className="h-2.5 w-1/2 animate-pulse rounded bg-black/5" />
      </div>
    </BotShell>
  );
}

function AnswerBubble({
  message,
  onFollowup,
  onRetryDeep,
}: {
  message: Extract<ChatMessage, { kind: "answer" }>;
  onFollowup: (q: string) => void;
  onRetryDeep: (q: string) => void;
}) {
  const r = message.response;
  const followups = r.report.suggested_followups ?? [];
  const evidence = r.evidence_results ?? [];
  const isReasoning = r.answer_type === "reasoning";
  const [showEvidence, setShowEvidence] = useState(false);
  return (
    <BotShell>
      <div className="flex flex-wrap items-center gap-2">
        <ConfidenceBadge
          confidence={r.confidence}
          reason={r.confidence_reason}
          scores={r.confidence_scores}
        />
        {isReasoning && (
          <span className="inline-flex items-center gap-1 rounded-full border border-violet-400/40 bg-violet-500/10 px-2 py-0.5 text-[10px] font-medium text-violet-700">
            Reasoned · {evidence.length} {evidence.length === 1 ? "query" : "queries"}
          </span>
        )}
        {r.mode_used === "deep" && (
          <span className="inline-flex items-center gap-1 rounded-full border border-fuchsia-400/50 bg-fuchsia-500/10 px-2 py-0.5 text-[10px] font-medium text-fuchsia-700">
            Deep think · {r.evidence_cycles ?? "?"} {r.evidence_cycles === 1 ? "cycle" : "cycles"}
          </span>
        )}
        <span className="text-[11px] text-[color:var(--foreground-muted)] tabular-nums">
          {r.record_count} rows · {r.execution_time}ms
          {r.retry_count ? ` · ${r.retry_count} retry` : ""}
        </span>
      </div>
      <p className="mt-2 text-sm leading-relaxed">
        {r.report.executive_summary ||
          (r.intent_summary
            ? `Result for: ${r.intent_summary}`
            : "Result ready — see Analysis panel.")}
      </p>
      <CypherBlock cypher={r.cypher_query} />
      {r.confidence === "low" && r.mode_used !== "deep" && (
        <button
          onClick={() => onRetryDeep(message.for_question)}
          className="mt-3 inline-flex items-center gap-1 rounded-lg border border-fuchsia-400/50 bg-fuchsia-500/10 px-2.5 py-1 text-[11px] font-medium text-fuchsia-700 hover:bg-fuchsia-500/20 cursor-pointer"
          title="Re-run the same question with deeper iterative reasoning"
        >
          Retry with Deep Think
        </button>
      )}
      {(isReasoning || r.mode_used === "deep") && evidence.length > 0 && (
        <div className="mt-3">
          <button
            onClick={() => setShowEvidence((v) => !v)}
            className="text-[11px] text-[color:var(--foreground-muted)] hover:text-foreground cursor-pointer"
          >
            {showEvidence ? "▾" : "▸"} Evidence ({evidence.length} {evidence.length === 1 ? "query" : "queries"})
          </button>
          {showEvidence && (
            <ul className="mt-2 space-y-1.5">
              {evidence.map((e, i) => (
                <li
                  key={i}
                  className="rounded-md border border-[color:var(--border)] bg-[color:var(--surface)] px-2 py-1.5 text-[11px]"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-foreground">{e.purpose || `Query ${i + 1}`}</span>
                    <span className="text-[10px] text-[color:var(--foreground-muted)] tabular-nums">
                      {e.error ? "error" : `${e.row_count} rows`}
                    </span>
                  </div>
                  <pre className="mt-1 whitespace-pre-wrap text-[10px] text-[color:var(--foreground-muted)] font-mono">
                    {e.cypher}
                  </pre>
                  {e.error && (
                    <p className="text-[10px] text-red-300">{e.error}</p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      {followups.length > 0 && (
        <div className="mt-3 flex flex-col gap-1.5">
          <span className="text-[10px] uppercase tracking-wide text-[color:var(--foreground-muted)]">
            Suggested next
          </span>
          <div className="flex flex-wrap gap-1.5">
            {followups.map((f, i) => (
              <button
                key={i}
                onClick={() => onFollowup(f)}
                className="rounded-full border border-[color:var(--border)] bg-[color:var(--surface)] px-2.5 py-1 text-[11px] text-[color:var(--foreground-muted)] hover:bg-[color:var(--surface-hover)] hover:text-foreground cursor-pointer transition-colors"
              >
                {f}
              </button>
            ))}
          </div>
        </div>
      )}
    </BotShell>
  );
}

function ClarificationBubble({
  message,
  onClarify,
}: {
  message: Extract<ChatMessage, { kind: "clarification" }>;
  onClarify: (combined: string, displayText: string) => void;
}) {
  const c = message.response;
  const [answer, setAnswer] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const submit = () => {
    const a = answer.trim();
    if (!a || submitted) return;
    setSubmitted(true);
    const combined =
      `Original question: ${message.originalQuestion}\n` +
      `Clarifying question asked: ${c.clarification}\n` +
      `User's clarification: ${a}\n\n` +
      `Now answer the original question using the clarification.`;
    onClarify(combined, a);
  };

  return (
    <BotShell tone="warn" icon={<HelpCircle className="h-4 w-4" />}>
      <p className="text-sm font-medium">Need a bit more detail</p>
      <p className="mt-1 text-sm text-[color:var(--foreground-muted)] leading-relaxed">
        {c.clarification}
      </p>
      {!submitted && (
        <div className="mt-3 flex gap-2">
          <input
            type="text"
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") submit();
            }}
            placeholder="Type your answer…"
            className="flex-1 rounded-lg border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-1.5 text-sm focus:outline-none focus:border-[color:var(--border-strong)]"
            autoFocus
          />
          <button
            onClick={submit}
            disabled={!answer.trim()}
            className="rounded-lg border border-[color:var(--border-strong)] bg-[color:var(--surface)] px-3 py-1.5 text-xs hover:bg-[color:var(--surface-hover)] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            Send
          </button>
        </div>
      )}
    </BotShell>
  );
}

function ErrorBubble({
  message,
}: {
  message: Extract<ChatMessage, { kind: "error" }>;
}) {
  const e = message.response;
  return (
    <BotShell tone="danger" icon={<AlertCircle className="h-4 w-4" />}>
      <p className="text-sm font-medium">Something went wrong</p>
      <p className="mt-1 text-sm text-[color:var(--foreground-muted)] leading-relaxed">
        {e.error}
      </p>
      {e.cypher_query && <CypherBlock cypher={e.cypher_query} />}
    </BotShell>
  );
}
