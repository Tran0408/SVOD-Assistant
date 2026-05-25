"""LangGraph node functions."""
import re
import time
import json

from .state import AgentState
from services.cypher_query_service import generate_cypher, is_safe
from services.neo4j_service import run_query
from services.llm_service import chat, extract_json
from services.schema_introspect import get_schema

MAX_RETRIES = 2
MAX_QUESTION_LEN = 500


def _emit(state: dict, event: str, payload: dict | None = None) -> None:
    """Safe emit — no-op if state has no emitter wired."""
    fn = state.get("emit")
    if callable(fn):
        try:
            fn(event, payload or {})
        except Exception:
            pass


# 1. Query Validation
def query_validation(state: AgentState) -> AgentState:
    _emit(state, "validating", {})
    q = (state.get("question") or "").strip()
    if not q:
        return {**state, "is_valid": False, "validation_error": "Empty question."}
    if len(q) > MAX_QUESTION_LEN:
        return {**state, "is_valid": False, "validation_error": f"Question too long (>{MAX_QUESTION_LEN} chars)."}
    if re.search(r"\b(DROP|DELETE|DETACH|TRUNCATE|SHUTDOWN)\b", q, re.IGNORECASE):
        return {**state, "is_valid": False, "validation_error": "Question contains forbidden keywords."}
    return {**state, "is_valid": True}


# 2. Understanding Decision — LLM-driven: complexity + clarification gate
_UNDERSTANDING_SYS = (
    "You are the query-understanding stage of a graph database assistant. "
    "Given the live graph schema and a user question, decide: "
    "(a) complexity — 'simple' if one Cypher will answer it, 'complex' if it needs decomposition; "
    "(b) answer_type — 'data' if the question is a direct lookup (counts, lists, aggregates, top-K, breakdowns); "
    "'reasoning' if the question asks for an EXPLANATION or CAUSE. "
    "Strong signals for 'reasoning': starts with 'why', 'how come', 'explain', 'what's driving', 'what causes', "
    "or asks to compare two segments with implied causality ('why is X higher than Y'). "
    "When uncertain between data/reasoning AND the question contains 'why' or 'explain' → choose 'reasoning'.\n"
    "(c) needs_clarification — true ONLY if the question is genuinely ambiguous given the schema "
    "(missing entity, undefined metric, multiple plausible interpretations). Be permissive — most reasonable "
    "questions do NOT need clarification. "
    "(d) clarification — if needs_clarification, a single concise follow-up question. Otherwise empty string. "
    "(e) intent_summary — one-sentence paraphrase of what you will compute. "
    "Return ONLY a JSON object: "
    '{"complexity": "simple|complex", "answer_type": "data|reasoning", '
    '"needs_clarification": bool, "clarification": "...", "intent_summary": "..."}'
)


def _format_history(history: list[dict]) -> str:
    if not history:
        return "(no prior turns)"
    lines = []
    for i, turn in enumerate(history[-3:], 1):
        lines.append(
            f"Turn {i}:\n"
            f"  Q: {turn.get('question', '')}\n"
            f"  Intent: {turn.get('intent_summary', '')}\n"
            f"  Cypher: {turn.get('cypher', '')}\n"
            f"  Sample rows: {json.dumps(turn.get('sample_rows', [])[:3], default=str)}"
        )
    return "\n".join(lines)


def understanding_decision(state: AgentState) -> AgentState:
    _emit(state, "understanding", {})
    user = (
        f"GRAPH SCHEMA:\n{get_schema()}\n\n"
        f"CONVERSATION HISTORY (most recent last):\n{_format_history(state.get('history', []))}\n\n"
        f"USER QUESTION: {state['question']}\n\n"
        "Resolve referring expressions ('those users', 'these', 'them') using the history. "
        "If the question clearly refers to prior results, do NOT request clarification.\n"
        "Respond with JSON only."
    )
    raw = chat(_UNDERSTANDING_SYS, user, temperature=0.1, max_tokens=400)
    parsed = extract_json(raw) or {}
    complexity = parsed.get("complexity") if parsed.get("complexity") in ("simple", "complex") else "simple"
    answer_type = parsed.get("answer_type") if parsed.get("answer_type") in ("data", "reasoning") else "data"
    intent = str(parsed.get("intent_summary") or "").strip() or state["question"]
    # Hard override: strong reasoning signals in the question force the reasoning path.
    q_lower = state["question"].lower()
    reasoning_triggers = ("why ", "why's", "how come", "explain ", "what's driving", "what is driving",
                          "what causes", "what's causing", "what is causing", "root cause", "reason behind")
    if any(t in q_lower for t in reasoning_triggers):
        answer_type = "reasoning"
    return {
        **state,
        "complexity": complexity,
        "answer_type": answer_type,
        "needs_clarification": bool(parsed.get("needs_clarification", False)),
        "clarification": str(parsed.get("clarification") or ""),
        "intent_summary": intent,
    }


# 3. Cypher Generation
def cypher_generation(state: AgentState) -> AgentState:
    _emit(state, "generating_cypher", {"retry": state.get("retry_count", 0)})
    err = state.get("last_error")
    cypher = generate_cypher(
        state["question"],
        error_feedback=err,
        history=state.get("history", []),
    )
    ok, reason = is_safe(cypher)
    if not ok:
        return {**state, "cypher": cypher, "last_error": f"Unsafe Cypher rejected: {reason}"}
    return {**state, "cypher": cypher, "last_error": ""}


# 4. Query Execution
def query_execution(state: AgentState) -> AgentState:
    _emit(state, "executing_query", {})
    cypher = state["cypher"]
    t0 = time.time()
    try:
        rows = run_query(cypher)
        return {
            **state,
            "results": rows,
            "record_count": len(rows),
            "execution_time_ms": int((time.time() - t0) * 1000),
            "last_error": "",
        }
    except Exception as e:
        return {
            **state,
            "retry_count": state.get("retry_count", 0) + 1,
            "last_error": str(e),
            "results": [],
        }


# 4b. Evidence Gathering — for reasoning questions, plan 2-3 supporting Cypher queries.
_EVIDENCE_PLAN_SYS = (
    "You are the evidence planner for a reasoning question. "
    "Given the user's question and the graph schema, produce 2-3 read-only Cypher queries whose results will "
    "TOGETHER let an analyst explain the answer. Aim for complementary angles (e.g. one for the headline metric, "
    "one for a contrasting segment, one for a temporal/structural breakdown). Each query MUST be read-only "
    "(MATCH/WITH/RETURN, no writes), include a LIMIT, and not use id()/elementId().\n"
    'Return ONLY JSON: {"queries": [{"purpose": "<short label>", "cypher": "<single cypher>"}, ...]}'
)


def evidence_gathering(state: AgentState) -> AgentState:
    user = (
        f"GRAPH SCHEMA:\n{get_schema()}\n\n"
        f"USER QUESTION: {state['question']}\n"
        f"INTENT: {state.get('intent_summary', '')}\n\n"
        "Plan 2-3 Cypher queries. Return JSON only."
    )
    raw = chat(_EVIDENCE_PLAN_SYS, user, temperature=0.1, max_tokens=900)
    parsed = extract_json(raw) or {}
    plan = parsed.get("queries") if isinstance(parsed.get("queries"), list) else []

    evidence: list[dict] = []
    queries: list[str] = []
    _emit(state, "evidence_planned", {"count": len(plan)})
    _run_evidence_batch(plan, evidence, queries, max_items=3, emit=state.get("emit"))

    # If nothing succeeded, replan ONCE with the errors as feedback.
    if not any(not e.get("error") and e.get("rows") for e in evidence):
        errors_summary = "\n".join(
            f"- purpose: {e.get('purpose','')}\n  cypher: {e.get('cypher','')[:200]}\n  error: {e.get('error','')[:200]}"
            for e in evidence
        )
        replan_user = (
            f"GRAPH SCHEMA:\n{get_schema()}\n\n"
            f"USER QUESTION: {state['question']}\n"
            f"INTENT: {state.get('intent_summary', '')}\n\n"
            f"PREVIOUS ATTEMPTS ALL FAILED:\n{errors_summary}\n\n"
            "Plan 2-3 DIFFERENT Cypher queries that avoid the prior errors. "
            "Read the schema carefully. Return JSON only."
        )
        _emit(state, "evidence_planned", {"count": 0, "retry": True})
        raw2 = chat(_EVIDENCE_PLAN_SYS, replan_user, temperature=0.2, max_tokens=900)
        parsed2 = extract_json(raw2) or {}
        plan2 = parsed2.get("queries") if isinstance(parsed2.get("queries"), list) else []
        _run_evidence_batch(plan2, evidence, queries, max_items=3, emit=state.get("emit"))

    # Pick the largest successful set as the "primary" results for downstream nodes.
    successful = [e for e in evidence if not e.get("error") and e.get("rows")]
    primary = max(successful, key=lambda e: len(e["rows"]), default=None)
    results = primary["rows"] if primary else []
    cypher_used = primary["cypher"] if primary else ""

    return {
        **state,
        "evidence_queries": queries,
        "evidence_results": evidence,
        "results": results,
        "cypher": cypher_used,
        "record_count": len(results),
        # Never bubble as a workflow-fatal error — summarizer will report what evidence exists.
        "last_error": "",
    }


# 4c. Deep Reasoning — iterative plan→execute→reflect loop, capped at 4 cycles.
DEEP_MAX_CYCLES = 4
DEEP_MAX_QUERIES_PER_CYCLE = 2

_DEEP_INITIAL_SYS = (
    "You are the FIRST planner in a deep multi-cycle reasoning loop. "
    "Given the user's question and the graph schema, propose 2 read-only Cypher queries that establish the foundation: "
    "one for the headline metric, one for an immediate contrast. Each MUST be read-only with a LIMIT. "
    "No id()/elementId().\n"
    'Return ONLY JSON: {"queries": [{"purpose": str, "cypher": str}, ...]}'
)

_DEEP_REFLECT_SYS = (
    "You are the reflection step in a deep reasoning loop. You have prior evidence from earlier queries — some may have "
    "errored. Decide whether enough SUCCESSFUL evidence exists to ANSWER the user's question with high confidence, OR plan "
    "1-2 follow-up Cypher queries that would meaningfully strengthen the answer.\n"
    "Rules:\n"
    "- If ANY prior query has a non-empty 'error' field, you MUST set done=false and plan a CORRECTED alternative Cypher "
    "for that purpose. Read the error message and fix the syntax (common fixes: re-introduce variables in WITH before "
    "RETURN; preserve aliases through ORDER BY; use only properties defined in the schema).\n"
    "- If the answer is one-dimensional (only totals, no breakdown) and the question implies comparison or drill-down, "
    "done=false; add a breakdown query.\n"
    "- Each new Cypher MUST be read-only with LIMIT, no id()/elementId(), and must differ in purpose from prior queries.\n"
    "- Only set done=true when you have at least 2 distinct successful queries covering complementary angles, "
    "AND no fixable errors remain.\n"
    "- For 'why' / 'what causes' / 'what drives' questions, time-series alone is NOT sufficient. You MUST also have "
    "evidence segmented by another dimension (e.g. plan, tenure bucket, billing amount range, engagement level, "
    "content/genre, geography, account age). Plan a segmentation query before declaring done.\n"
    'Return ONLY JSON: {"done": bool, "rationale": str, '
    '"queries": [{"purpose": str, "cypher": str}, ...]}'
)


DEEP_MIN_CYCLES = 2  # never exit before this many cycles (in deep mode)


_SELF_CORRECT_SYS = (
    "You are a Cypher fixer. Given a graph schema, an intended purpose, a broken Cypher, and the error it produced, "
    "return ONE corrected read-only Cypher that satisfies the original purpose. "
    "Rules: read-only (MATCH/WITH/RETURN/ORDER BY/LIMIT), no writes, no id()/elementId(), include a LIMIT, "
    "use only properties from the schema. Re-introduce variables in WITH before RETURN if scoping is the issue.\n"
    "Return ONE cypher inside a ```cypher fenced block, no commentary."
)


def _self_correct(purpose: str, broken: str, err: str) -> str:
    """One-shot Cypher repair using the error message as feedback."""
    user = (
        f"GRAPH SCHEMA:\n{get_schema()}\n\n"
        f"PURPOSE: {purpose}\n"
        f"BROKEN CYPHER:\n{broken}\n\n"
        f"ERROR:\n{err}\n\n"
        "Return corrected Cypher only."
    )
    from services.llm_service import extract_cypher
    raw = chat(_SELF_CORRECT_SYS, user, temperature=0.1, max_tokens=600)
    result = extract_cypher(raw)
    # Strip stray code fence remnants (LLM sometimes emits unclosed fences).
    result = re.sub(r"^```\w*\s*", "", result)
    result = re.sub(r"\s*```\s*$", "", result)
    return result.strip()


def _try_query(purpose: str, cypher: str) -> tuple[list[dict], str]:
    """Run a single Cypher. On failure, attempt ONE self-correction. Returns (rows, error_msg)."""
    ok, why = is_safe(cypher)
    if not ok:
        # Safety reject — also try a correction (LLM may rewrite to comply).
        corrected = _self_correct(purpose, cypher, why)
        ok2, why2 = is_safe(corrected)
        if not ok2:
            return [], f"{why} (self-correct also rejected: {why2})"
        try:
            return run_query(corrected), ""
        except Exception as e2:
            return [], str(e2)
    try:
        rows = run_query(cypher)
        return rows, ""
    except Exception as e:
        corrected = _self_correct(purpose, cypher, str(e))
        if not corrected or corrected.strip() == cypher.strip():
            return [], str(e)
        ok2, why2 = is_safe(corrected)
        if not ok2:
            return [], f"{e} (self-correct unsafe: {why2})"
        try:
            return run_query(corrected), ""
        except Exception as e2:
            return [], f"{e} | retry: {e2}"


def _normalize_cypher(c: str) -> str:
    return re.sub(r"\s+", " ", c).strip().lower()


def _run_evidence_batch(plan: list[dict], evidence: list[dict], queries: list[str], max_items: int = DEEP_MAX_QUERIES_PER_CYCLE, emit=None) -> None:
    """Run each planned cypher with one self-correction attempt on failure. Skips duplicates of prior queries."""
    seen_cyphers = {_normalize_cypher(e.get("cypher", "")) for e in evidence}
    # Only block a purpose if it was ALREADY satisfied successfully. Failed purposes are retry-eligible.
    seen_successful_purposes = {
        (e.get("purpose") or "").strip().lower()
        for e in evidence
        if not e.get("error") and e.get("rows")
    }
    for item in plan[:max_items]:
        if not isinstance(item, dict):
            continue
        cypher = str(item.get("cypher") or "").strip()
        purpose = str(item.get("purpose") or "").strip()
        if not cypher:
            continue
        norm = _normalize_cypher(cypher)
        if norm in seen_cyphers:
            continue
        if purpose and purpose.lower() in seen_successful_purposes:
            continue
        seen_cyphers.add(norm)
        if callable(emit):
            try:
                emit("evidence_query", {"purpose": purpose, "index": len(evidence) + 1})
            except Exception:
                pass
        rows, err = _try_query(purpose, cypher)
        if err:
            evidence.append({"purpose": purpose, "cypher": cypher, "rows": [], "error": err})
            continue
        queries.append(cypher)
        evidence.append({"purpose": purpose, "cypher": cypher, "rows": rows[:50]})


def deep_reasoning(state: AgentState) -> AgentState:
    schema = get_schema()
    question = state["question"]
    intent = state.get("intent_summary", "")
    emit = state.get("emit")

    evidence: list[dict] = []
    queries: list[str] = []

    # Cycle 0: initial plan
    _emit(state, "deep_cycle", {"cycle": 1, "max": DEEP_MAX_CYCLES, "phase": "planning"})
    init_user = (
        f"GRAPH SCHEMA:\n{schema}\n\n"
        f"USER QUESTION: {question}\nINTENT: {intent}\n\n"
        "Plan 2 starter Cypher queries. Return JSON only."
    )
    raw = chat(_DEEP_INITIAL_SYS, init_user, temperature=0.1, max_tokens=900)
    parsed = extract_json(raw) or {}
    _run_evidence_batch(parsed.get("queries") if isinstance(parsed.get("queries"), list) else [], evidence, queries, emit=emit)

    q_lower = question.lower()
    driver_question = any(t in q_lower for t in ("driving", "drives", "drive", "causes", "causing", "why ", "explain", "root cause", "factor"))

    cycles = 1
    # Reflection cycles 1..DEEP_MAX_CYCLES-1
    while cycles < DEEP_MAX_CYCLES:
        _emit(state, "deep_cycle", {"cycle": cycles + 1, "max": DEEP_MAX_CYCLES, "phase": "reflecting"})
        explored_purposes = [e.get("purpose", "") for e in evidence if e.get("purpose")]
        reflect_payload = json.dumps({
            "question": question,
            "intent": intent,
            "already_explored_purposes": explored_purposes,
            "next_query_must_explore_a_NEW_angle_not_in_the_list_above": True,
            "evidence_so_far": [
                {
                    "purpose": e.get("purpose", ""),
                    "cypher": e.get("cypher", ""),
                    "rows": (e.get("rows") or [])[:15],
                    "error": e.get("error", ""),
                }
                for e in evidence
            ],
            "cycles_used": cycles,
            "cycles_remaining": DEEP_MAX_CYCLES - cycles,
        }, default=str)
        reflect_user = f"GRAPH SCHEMA:\n{schema}\n\nSTATE:\n{reflect_payload}\n\nDecide. Return JSON only."
        raw = chat(_DEEP_REFLECT_SYS, reflect_user, temperature=0.1, max_tokens=900)
        decision = extract_json(raw) or {}
        has_errors = any(e.get("error") for e in evidence)
        successful_count = sum(1 for e in evidence if not e.get("error") and e.get("rows"))
        # Hard gates: don't allow early exit if errors remain or too few successful queries.
        force_continue = has_errors or successful_count < 2 or cycles < DEEP_MIN_CYCLES
        # Driver/cause questions need at least 3 successful queries (typically one of which is a segmentation).
        if driver_question and successful_count < 3:
            force_continue = True
        if decision.get("done") is True and not force_continue:
            break
        next_plan = decision.get("queries") if isinstance(decision.get("queries"), list) else []
        if not next_plan and not force_continue:
            break
        if next_plan:
            _run_evidence_batch(next_plan, evidence, queries, emit=emit)
        cycles += 1

    successful = [e for e in evidence if not e.get("error") and e.get("rows")]
    primary = max(successful, key=lambda e: len(e["rows"]), default=None)
    results = primary["rows"] if primary else []
    cypher_used = primary["cypher"] if primary else ""

    return {
        **state,
        "evidence_queries": queries,
        "evidence_results": evidence,
        "evidence_cycles": cycles,
        "results": results,
        "cypher": cypher_used,
        "record_count": len(results),
        "last_error": "",
    }


# 5. Report Summarizer — LLM writes prose only; tables built deterministically.
_REPORT_SYS = (
    "You are a data analyst. Given a user question, the Cypher used, and a sample of result rows, "
    "produce a JSON object with prose fields ONLY: "
    '{"executive_summary": str, "key_metrics": {k: number}, "insights": [str], "recommendations": [str], '
    '"suggested_followups": [str]}. '
    "Rules:\n"
    "- executive_summary: <=3 sentences, factual, derived from the rows provided.\n"
    "- key_metrics: 2-5 single-number stats computed from the rows. KEYS MUST be snake_case identifiers "
    "(lowercase words separated by underscores, e.g. avg_churn_per_month, total_revenue, peak_month_churn). "
    "Never CamelCase or run-together words.\n"
    "- insights / recommendations: 2-4 short bullets each.\n"
    "- suggested_followups: EXACTLY 3 short concrete follow-up questions a business user would naturally ask next. "
    "Each MUST be directly answerable by a Cypher query on the same graph schema — i.e. it asks for COUNTS, SUMS, AVERAGES, "
    "LISTS, RANKINGS, or BREAKDOWNS over existing nodes/properties. "
    "BANNED: 'why' questions, causal reasoning, predictions, or anything requiring data outside the graph. "
    "Vary the type: one drill-down (filter to a segment seen in the rows), one pivot (different dimension or time slice), "
    "one comparison/breakdown (top-K or rank against another segment). "
    "Keep each <= 12 words, phrased as a question.\n"
    "- DO NOT invent account IDs, names, or row values. Refer to data in aggregate only.\n"
    "- Return ONLY JSON, no prose outside JSON."
)


def _build_main_table(results: list[dict], question: str) -> dict | None:
    """Deterministically build the main display table from real result rows."""
    if not results:
        return None
    columns = list(results[0].keys())
    rows = [[r.get(c) for c in columns] for r in results[:10]]
    title = "Top Results" if len(results) > 10 else "Results"
    return {"title": title, "columns": columns, "rows": rows}


def report_summarizer(state: AgentState) -> AgentState:
    _emit(state, "summarizing", {})
    results = state.get("results", []) or []
    payload = {
        "question": state["question"],
        "intent_summary": state.get("intent_summary", ""),
        "cypher": state.get("cypher", ""),
        "record_count": state.get("record_count", 0),
        "sample_rows": results[:25],
    }
    # For reasoning answers OR deep mode, attach all evidence so the summary can synthesize.
    if state.get("answer_type") == "reasoning" or state.get("mode") == "deep":
        evidence = state.get("evidence_results", []) or []
        payload["evidence"] = [
            {
                "purpose": e.get("purpose", ""),
                "cypher": e.get("cypher", ""),
                "rows": (e.get("rows") or [])[:15],
                "error": e.get("error", ""),
            }
            for e in evidence
        ]
        payload["instruction"] = (
            "This is a REASONING question. Synthesize an explanation that cites the numbers from the evidence. "
            "Frame causal language as inference, not certainty. Use phrases like 'this suggests', 'likely because', "
            "'based on the data'. Do not invent data outside the evidence."
        )
    user = json.dumps(payload, default=str)
    # Deep / reasoning answers pack more evidence — budget more tokens.
    is_heavy = state.get("answer_type") == "reasoning" or state.get("mode") == "deep"
    raw = chat(_REPORT_SYS, user, temperature=0.2, max_tokens=2800 if is_heavy else 1500)
    report = extract_json(raw) or {}
    if not isinstance(report, dict):
        report = {}
    report.setdefault("executive_summary", "")
    report.setdefault("key_metrics", {"Rows": state.get("record_count", 0)})
    report.setdefault("insights", [])
    report.setdefault("recommendations", [])
    # Fallback when LLM omits executive_summary: derive from intent + row count.
    if not (report.get("executive_summary") or "").strip():
        intent = state.get("intent_summary", "").strip()
        rc = state.get("record_count", 0)
        ev = state.get("evidence_results") or []
        had_evidence_attempt = bool(ev)
        successful = [e for e in ev if not e.get("error") and e.get("rows")]
        if had_evidence_attempt and not successful:
            report["executive_summary"] = (
                f"Could not gather usable evidence for this question. "
                f"Attempted {len(ev)} queries; all returned errors or no rows. "
                f"See the Evidence section for details."
            )
        elif intent:
            report["executive_summary"] = f"{intent} Returned {rc} row{'s' if rc != 1 else ''}."
        elif report.get("insights"):
            report["executive_summary"] = report["insights"][0]
    # Normalize follow-ups: ensure list of clean strings, at most 3.
    raw_fups = report.get("suggested_followups") or []
    if isinstance(raw_fups, list):
        report["suggested_followups"] = [str(x).strip() for x in raw_fups if str(x).strip()][:3]
    else:
        report["suggested_followups"] = []

    # Force tables to be deterministic from real rows — never LLM-generated.
    main = _build_main_table(results, state["question"])
    report["tables"] = [main] if main else []

    return {**state, "report": report}


# 6. Confidence Assessment — LLM-as-judge with structured rubric.
_CONF_SYS = (
    "You are an evaluator (LLM-as-judge) for a graph-database analytics assistant. "
    "Given a user question, the generated Cypher, the result rows, and the analyst summary, "
    "score the answer across four dimensions on a 1-5 integer scale:\n\n"
    "1. relevance — does the Cypher target what the question actually asks? "
    "(5 = exact intent match OR a reasonable interpretation of a vague question — e.g. 'biggest customers' "
    "→ total lifetime billed is a reasonable proxy; 3 = plausible but debatable proxy; 1 = wrong entity/metric)\n"
    "2. completeness — does it return the dimensions the question implies? "
    "(5 = all asked-for fields/groupings present; vague questions only require one sensible grouping; "
    "1 = missing core dimension the user explicitly named)\n"
    "3. grounding — does the summary stick to values present in the rows, without inventing facts? "
    "(5 = every claim traces to the rows; 1 = fabricated values)\n"
    "4. sufficiency — is there enough data to answer? "
    "(5 = answer is decisive; 1 = empty/unusable result. NOTE: a 1-row aggregate (sum/avg/count/min/max) "
    "or a top-K returning ≤K rows is fully sufficient — score 5.)\n\n"
    "Compute avg = mean of the four scores, then bucket:\n"
    "  avg >= 4.0 → 'high'\n"
    "  avg >= 2.5 → 'medium'\n"
    "  avg <  2.5 → 'low'\n\n"
    "Return ONLY a flat JSON object with these exact keys:\n"
    '{"relevance": <1-5>, "completeness": <1-5>, "grounding": <1-5>, "sufficiency": <1-5>, '
    '"reason": "one short sentence citing the lowest-scoring dimension"}'
)


def _bucket(scores: dict) -> str:
    vals = [scores.get(k) for k in ("relevance", "completeness", "grounding", "sufficiency")]
    nums = [v for v in vals if isinstance(v, (int, float))]
    if not nums:
        return "medium"
    avg = sum(nums) / len(nums)
    if avg >= 4.0:
        return "high"
    if avg >= 2.5:
        return "medium"
    return "low"


def confidence_assessment(state: AgentState) -> AgentState:
    _emit(state, "scoring_confidence", {})
    results = state.get("results", []) or []
    user = json.dumps({
        "question": state["question"],
        "cypher": state.get("cypher", ""),
        "record_count": state.get("record_count", 0),
        "sample_rows": results[:10],
        "report": state.get("report", {}),
    }, default=str)
    raw = chat(_CONF_SYS, user, temperature=0.1, max_tokens=1024)
    parsed = extract_json(raw) or {}
    scores = {
        k: parsed[k]
        for k in ("relevance", "completeness", "grounding", "sufficiency")
        if isinstance(parsed.get(k), (int, float))
    }
    conf = _bucket(scores) if scores else "medium"
    print(f"[CONFIDENCE] raw={raw!r} scores={scores} → {conf}")
    return {
        **state,
        "confidence": conf,
        "confidence_reason": str(parsed.get("reason") or ""),
        "confidence_scores": scores,
        "success": True,
    }
