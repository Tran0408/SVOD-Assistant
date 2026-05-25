import type { HealthResponse, HistoryTurn, QueryResponse } from "./types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5001/api";

export async function postQuery(
  question: string,
  history: HistoryTurn[] = [],
  mode: "fast" | "deep" = "fast",
): Promise<QueryResponse> {
  const res = await fetch(`${API_URL}/query`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question, history, mode }),
  });
  return (await res.json()) as QueryResponse;
}

export type StreamEvent =
  | { type: "validating" }
  | { type: "understanding" }
  | { type: "generating_cypher"; retry?: number }
  | { type: "executing_query" }
  | { type: "evidence_planned"; count: number }
  | { type: "evidence_query"; purpose: string; index: number }
  | { type: "deep_cycle"; cycle: number; max: number; phase: string }
  | { type: "summarizing" }
  | { type: "scoring_confidence" };

export async function streamQuery(
  question: string,
  history: HistoryTurn[],
  mode: "fast" | "deep",
  onEvent: (e: StreamEvent) => void,
): Promise<QueryResponse> {
  const res = await fetch(`${API_URL}/query/stream`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
    body: JSON.stringify({ question, history, mode }),
  });
  if (!res.body) {
    return (await res.json()) as QueryResponse;
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let finalPayload: QueryResponse | null = null;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const blocks = buffer.split("\n\n");
    buffer = blocks.pop() ?? "";
    for (const block of blocks) {
      if (!block.trim()) continue;
      let eventName = "message";
      let dataLine = "";
      for (const line of block.split("\n")) {
        if (line.startsWith("event:")) eventName = line.slice(6).trim();
        else if (line.startsWith("data:")) dataLine += line.slice(5).trim();
      }
      if (!dataLine) continue;
      let parsed: Record<string, unknown> = {};
      try { parsed = JSON.parse(dataLine); } catch { /* ignore */ }
      if (eventName === "final") {
        finalPayload = parsed as unknown as QueryResponse;
      } else if (eventName === "error") {
        finalPayload = { success: false, error: String(parsed.error ?? "Stream error") } as QueryResponse;
      } else {
        onEvent({ type: eventName, ...parsed } as StreamEvent);
      }
    }
  }
  if (!finalPayload) {
    return { success: false, error: "Stream closed without final" } as QueryResponse;
  }
  return finalPayload;
}

export async function getHealth(): Promise<HealthResponse> {
  const res = await fetch(`${API_URL}/health`, { cache: "no-store" });
  if (!res.ok) {
    return { status: "degraded", neo4j: `HTTP ${res.status}` };
  }
  return (await res.json()) as HealthResponse;
}
