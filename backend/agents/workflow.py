"""LangGraph wiring — node names suffixed _node to avoid state-key collisions."""
from langgraph.graph import StateGraph, END
from .state import AgentState
from .nodes import (
    query_validation,
    understanding_decision,
    cypher_generation,
    query_execution,
    evidence_gathering,
    deep_reasoning,
    report_summarizer,
    confidence_assessment,
    MAX_RETRIES,
)


def _route_after_validation(state: AgentState):
    return "understanding_node" if state.get("is_valid") else "end_invalid"


def _route_after_understanding(state: AgentState):
    if state.get("needs_clarification") and state.get("clarification"):
        return "end_clarify"
    # Deep mode forces the iterative reasoning loop regardless of answer_type.
    if state.get("mode") == "deep":
        return "deep_node"
    if state.get("answer_type") == "reasoning":
        return "evidence_node"
    return "cypher_node"


def _route_after_exec(state: AgentState):
    if state.get("last_error"):
        if state.get("retry_count", 0) < MAX_RETRIES:
            return "cypher_retry"
        return "end_failed"
    return "summarize_node"


def _route_after_evidence(state: AgentState):
    if state.get("last_error") and not (state.get("evidence_results") or []):
        return "end_failed"
    return "summarize_node"


def build_workflow():
    g = StateGraph(AgentState)
    g.add_node("validate_node", query_validation)
    g.add_node("understanding_node", understanding_decision)
    g.add_node("cypher_node", cypher_generation)
    g.add_node("execute_node", query_execution)
    g.add_node("evidence_node", evidence_gathering)
    g.add_node("deep_node", deep_reasoning)
    g.add_node("summarize_node", report_summarizer)
    g.add_node("confidence_node", confidence_assessment)

    g.set_entry_point("validate_node")
    g.add_conditional_edges("validate_node", _route_after_validation, {
        "understanding_node": "understanding_node",
        "end_invalid": END,
    })
    g.add_conditional_edges("understanding_node", _route_after_understanding, {
        "cypher_node": "cypher_node",
        "evidence_node": "evidence_node",
        "deep_node": "deep_node",
        "end_clarify": END,
    })
    g.add_edge("cypher_node", "execute_node")
    g.add_conditional_edges("execute_node", _route_after_exec, {
        "cypher_retry": "cypher_node",
        "summarize_node": "summarize_node",
        "end_failed": END,
    })
    g.add_conditional_edges("evidence_node", _route_after_evidence, {
        "summarize_node": "summarize_node",
        "end_failed": END,
    })
    g.add_conditional_edges("deep_node", _route_after_evidence, {
        "summarize_node": "summarize_node",
        "end_failed": END,
    })
    g.add_edge("summarize_node", "confidence_node")
    g.add_edge("confidence_node", END)
    return g.compile()


_app = None


def get_app():
    global _app
    if _app is None:
        _app = build_workflow()
    return _app


def run_agent(question: str, history: list[dict] | None = None, mode: str = "fast", emit=None) -> dict:
    app = get_app()
    init: AgentState = {
        "question": question,
        "retry_count": 0,
        "history": history or [],
        "mode": mode if mode in ("fast", "deep") else "fast",
    }
    if callable(emit):
        init["emit"] = emit
    return app.invoke(init)
