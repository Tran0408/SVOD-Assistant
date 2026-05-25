"""POST /api/query — run agent and return structured response."""
import json
import queue
import threading
from flask import Blueprint, request, jsonify, Response, stream_with_context
from agents.workflow import run_agent

bp = Blueprint("query", __name__)


def _build_response(final: dict) -> dict:
    """Map agent final state → API response dict."""
    if not final.get("is_valid", True):
        return {"success": False, "error": final.get("validation_error", "Invalid query")}
    if final.get("needs_clarification"):
        return {
            "success": False,
            "needs_clarification": True,
            "clarification": final.get("clarification", ""),
            "intent_summary": final.get("intent_summary", ""),
        }
    if final.get("last_error") and not final.get("success"):
        return {
            "success": False,
            "error": f"Query failed after retries: {final['last_error']}",
            "cypher_query": final.get("cypher"),
            "retry_count": final.get("retry_count", 0),
        }
    return {
        "success": True,
        "results": final.get("results", []),
        "report": final.get("report", {}),
        "cypher_query": final.get("cypher", ""),
        "execution_time": final.get("execution_time_ms", 0),
        "record_count": final.get("record_count", 0),
        "complexity": final.get("complexity"),
        "answer_type": final.get("answer_type", "data"),
        "mode_used": final.get("mode", "fast"),
        "evidence_cycles": final.get("evidence_cycles", 0),
        "evidence_queries": final.get("evidence_queries", []),
        "evidence_results": [
            {"purpose": e.get("purpose", ""), "cypher": e.get("cypher", ""),
             "row_count": len(e.get("rows", []) or []), "error": e.get("error", "")}
            for e in (final.get("evidence_results") or [])
        ],
        "intent_summary": final.get("intent_summary", ""),
        "confidence": final.get("confidence", "medium"),
        "confidence_reason": final.get("confidence_reason", ""),
        "confidence_scores": final.get("confidence_scores", {}),
        "retry_count": final.get("retry_count", 0),
    }


@bp.post("/query")
def query():
    payload = request.get_json(silent=True) or {}
    question = (payload.get("question") or "").strip()
    if not question:
        return jsonify({"success": False, "error": "Missing 'question'"}), 400

    history = payload.get("history") or []
    if not isinstance(history, list):
        history = []
    mode = payload.get("mode") if payload.get("mode") in ("fast", "deep") else "fast"

    final = run_agent(question, history=history, mode=mode)
    body = _build_response(final)
    status = 400 if not body.get("success") and not body.get("needs_clarification") and "Invalid" in body.get("error", "") else (
        500 if not body.get("success") and "failed after retries" in body.get("error", "") else 200
    )
    return jsonify(body), status


@bp.post("/query/stream")
def query_stream():
    payload = request.get_json(silent=True) or {}
    question = (payload.get("question") or "").strip()
    if not question:
        return jsonify({"success": False, "error": "Missing 'question'"}), 400
    history = payload.get("history") or []
    if not isinstance(history, list):
        history = []
    mode = payload.get("mode") if payload.get("mode") in ("fast", "deep") else "fast"

    q: queue.Queue = queue.Queue()
    SENTINEL = object()

    def emit(event: str, data: dict) -> None:
        q.put((event, data))

    def runner():
        try:
            final = run_agent(question, history=history, mode=mode, emit=emit)
            q.put(("final", _build_response(final)))
        except Exception as e:
            q.put(("error", {"error": str(e)}))
        finally:
            q.put(SENTINEL)

    threading.Thread(target=runner, daemon=True).start()

    @stream_with_context
    def gen():
        while True:
            item = q.get()
            if item is SENTINEL:
                break
            event, data = item
            yield f"event: {event}\ndata: {json.dumps(data, default=str)}\n\n"

    return Response(gen(), mimetype="text/event-stream", headers={
        "Cache-Control": "no-cache",
        "X-Accel-Buffering": "no",
    })


@bp.get("/health")
def health():
    from services.neo4j_service import run_query
    try:
        run_query("RETURN 1 AS ok")
        return jsonify({"status": "healthy", "neo4j": "connected"})
    except Exception as e:
        return jsonify({"status": "degraded", "neo4j": str(e)}), 500


@bp.get("/schema")
def schema_endpoint():
    """Expose introspected schema (debug aid)."""
    from services.schema_introspect import get_schema
    return jsonify({"schema": get_schema()})
