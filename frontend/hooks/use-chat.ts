"use client";
import { useCallback, useRef, useState } from "react";
import { postQuery, streamQuery, type StreamEvent } from "@/lib/api";
import { uid } from "@/lib/format";
import type { ChatMessage, HistoryTurn, QueryError, QuerySuccess } from "@/lib/types";

function describeEvent(e: StreamEvent): string {
  switch (e.type) {
    case "validating": return "Validating question…";
    case "understanding": return "Understanding intent…";
    case "generating_cypher":
      return e.retry ? `Retrying Cypher (attempt ${e.retry + 1})…` : "Generating Cypher…";
    case "executing_query": return "Running query on graph…";
    case "evidence_planned": return `Planning ${e.count} supporting queries…`;
    case "evidence_query": return `Running evidence query ${e.index}: ${e.purpose}`;
    case "deep_cycle":
      return e.phase === "planning"
        ? `Deep cycle ${e.cycle}/${e.max} — planning…`
        : `Deep cycle ${e.cycle}/${e.max} — reflecting…`;
    case "summarizing": return "Synthesizing analysis…";
    case "scoring_confidence": return "Scoring confidence…";
    default: return "Working…";
  }
}

function buildHistory(messages: ChatMessage[]): HistoryTurn[] {
  const turns: HistoryTurn[] = [];
  let pendingQ: string | null = null;
  for (const m of messages) {
    if (m.role === "user") {
      pendingQ = m.text;
    } else if (m.role === "bot" && m.kind === "answer" && pendingQ) {
      turns.push({
        question: pendingQ,
        cypher: m.response.cypher_query,
        intent_summary: m.response.intent_summary ?? "",
        sample_rows: m.response.results.slice(0, 3),
      });
      pendingQ = null;
    }
  }
  return turns.slice(-3);
}

export function useChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sending, setSending] = useState(false);
  const [lastAnswer, setLastAnswer] = useState<QuerySuccess | null>(null);
  const [deepMode, setDeepMode] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const send = useCallback(async (question: string, displayText?: string, forceMode?: "fast" | "deep") => {
    const q = question.trim();
    if (!q || sending) return;

    setSending(true);
    const history = buildHistory(messages);
    const userMsg: ChatMessage = { id: uid(), role: "user", text: (displayText ?? q).trim() };
    const loadingMsg: ChatMessage = { id: uid(), role: "bot", kind: "loading" };
    setMessages((m) => [...m, userMsg, loadingMsg]);

    try {
      const res = await streamQuery(
        q,
        history,
        forceMode ?? (deepMode ? "deep" : "fast"),
        (ev) => {
          const text = describeEvent(ev);
          setMessages((m) =>
            m.map((x) =>
              x.id === loadingMsg.id && x.role === "bot" && x.kind === "loading"
                ? { ...x, progress: text }
                : x,
            ),
          );
        },
      );
      setMessages((m) => {
        const next = m.filter((x) => x.id !== loadingMsg.id);
        if ("needs_clarification" in res && res.needs_clarification) {
          next.push({
            id: uid(),
            role: "bot",
            kind: "clarification",
            response: res,
            originalQuestion: q,
          });
        } else if (res.success) {
          next.push({ id: uid(), role: "bot", kind: "answer", response: res, for_question: q });
          setLastAnswer(res);
        } else {
          next.push({
            id: uid(),
            role: "bot",
            kind: "error",
            response: res as QueryError,
          });
        }
        return next;
      });
    } catch (err) {
      setMessages((m) =>
        m
          .filter((x) => x.id !== loadingMsg.id)
          .concat({
            id: uid(),
            role: "bot",
            kind: "error",
            response: {
              success: false,
              error:
                err instanceof Error ? err.message : "Network error",
            },
          }),
      );
    } finally {
      setSending(false);
    }
  }, [sending, messages, deepMode]);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    setMessages([]);
    setLastAnswer(null);
  }, []);

  return { messages, sending, send, reset, lastAnswer, deepMode, setDeepMode };
}
