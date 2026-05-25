export type ReportTable = {
  title: string;
  columns: string[];
  rows: (string | number | null)[][];
};

export type Report = {
  executive_summary: string;
  key_metrics: Record<string, number | string>;
  tables: ReportTable[];
  insights: string[];
  recommendations: string[];
  suggested_followups?: string[];
};

export type EvidenceEntry = {
  purpose: string;
  cypher: string;
  row_count: number;
  error?: string;
};

export type QuerySuccess = {
  success: true;
  results: Record<string, unknown>[];
  report: Report;
  cypher_query: string;
  execution_time: number;
  record_count: number;
  complexity?: string;
  answer_type?: "data" | "reasoning";
  mode_used?: "fast" | "deep";
  evidence_cycles?: number;
  evidence_queries?: string[];
  evidence_results?: EvidenceEntry[];
  intent_summary?: string;
  confidence?: "high" | "medium" | "low";
  confidence_reason?: string;
  confidence_scores?: {
    relevance?: number;
    completeness?: number;
    grounding?: number;
    sufficiency?: number;
  };
  retry_count?: number;
};

export type QueryClarification = {
  success: false;
  needs_clarification: true;
  clarification: string;
  intent_summary?: string;
};

export type QueryError = {
  success: false;
  error: string;
  cypher_query?: string;
  retry_count?: number;
};

export type QueryResponse = QuerySuccess | QueryClarification | QueryError;

export type HistoryTurn = {
  question: string;
  cypher: string;
  intent_summary: string;
  sample_rows: Record<string, unknown>[];
};

export type HealthResponse = {
  status: "healthy" | "degraded";
  neo4j: string;
};

export type ChatMessage =
  | { id: string; role: "user"; text: string }
  | {
      id: string;
      role: "bot";
      kind: "answer";
      response: QuerySuccess;
      for_question: string;
    }
  | {
      id: string;
      role: "bot";
      kind: "clarification";
      response: QueryClarification;
      originalQuestion: string;
    }
  | {
      id: string;
      role: "bot";
      kind: "error";
      response: QueryError;
    }
  | { id: string; role: "bot"; kind: "loading"; progress?: string };
