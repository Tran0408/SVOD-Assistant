"""LangGraph shared state."""
from typing import TypedDict, Any


class AgentState(TypedDict, total=False):
    question: str
    history: list[dict]   # prior turns: [{question, cypher, intent_summary, sample_rows}]
    emit: Any             # callable (event_name: str, payload: dict) -> None, optional
    is_valid: bool
    validation_error: str

    # Understanding stage
    complexity: str            # "simple" | "complex"
    answer_type: str           # "data" | "reasoning"
    mode: str                  # "fast" | "deep"
    needs_clarification: bool
    clarification: str         # follow-up question for the user
    intent_summary: str        # short paraphrase of what we will answer

    # Reasoning / evidence stage
    evidence_queries: list[str]
    evidence_results: list[dict]    # [{cypher, rows, error?}]
    evidence_cycles: int            # planning rounds used (deep mode)

    # Cypher + execution
    cypher: str
    results: list[dict]
    record_count: int
    execution_time_ms: int
    retry_count: int
    last_error: str

    # Report
    report: dict[str, Any]

    # Confidence
    confidence: str            # "high" | "medium" | "low"
    confidence_reason: str
    confidence_scores: dict    # {relevance, completeness, grounding, sufficiency} 1-5 each

    success: bool
