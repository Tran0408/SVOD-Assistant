"""Cypher generation + safety guard. Schema introspected at runtime — dataset-agnostic."""
import re
from .llm_service import chat, extract_cypher
from .schema_introspect import get_schema

DANGEROUS = re.compile(
    r"\b(CREATE|DELETE|DETACH|MERGE|SET|REMOVE|DROP|CALL\s+db\.|CALL\s+dbms\.|LOAD\s+CSV|FOREACH)\b",
    re.IGNORECASE,
)

INTERNAL_ID = re.compile(r"\b(id|elementId)\s*\(", re.IGNORECASE)


def is_safe(cypher: str) -> tuple[bool, str]:
    if DANGEROUS.search(cypher):
        return False, "Write/admin operation detected. Only read queries allowed."
    if INTERNAL_ID.search(cypher):
        return False, "Do not use id()/elementId(). Return stored properties instead."
    if not re.search(r"\b(MATCH|RETURN|WITH)\b", cypher, re.IGNORECASE):
        return False, "Query does not look like a read query."
    return True, ""


def _system_prompt() -> str:
    return (
        "You are a Neo4j Cypher generator for a knowledge graph.\n"
        "You ONLY produce read-only Cypher (MATCH/WITH/RETURN/ORDER BY/LIMIT). "
        "NEVER CREATE/MERGE/DELETE/SET/REMOVE/DROP.\n"
        "NEVER use Neo4j internal identifiers id() or elementId(). "
        "Use stored properties (e.g. _id, _key fields) as identifiers.\n"
        "\n"
        "COMMON PITFALL — variable scoping after RETURN:\n"
        "Once you write RETURN, variables from earlier MATCH clauses are NOT available to ORDER BY for "
        "properties you didn't return.\n"
        "WRONG:  MATCH (s)-[:CHURNED_IN]->(m:Month) RETURN m.key, count(s) ORDER BY m.year, m.month\n"
        "RIGHT:  MATCH (s)-[:CHURNED_IN]->(m:Month) WITH m, count(s) AS c "
        "RETURN m.key, c ORDER BY m.year, m.month\n"
        "Use WITH to preserve node variables before RETURN whenever you need ORDER BY on properties "
        "you are not returning.\n"
        "\n"
        "Always return a single Cypher query inside a ```cypher fenced block, with no commentary.\n\n"
        "GRAPH SCHEMA (auto-introspected from live database):\n"
        f"{get_schema()}\n"
    )


def _format_history(history: list[dict] | None) -> str:
    if not history:
        return ""
    import json as _json
    lines = ["\nCONVERSATION HISTORY (use to resolve references like 'those users'):"]
    for i, turn in enumerate(history[-3:], 1):
        lines.append(
            f"Turn {i}:\n"
            f"  Question: {turn.get('question', '')}\n"
            f"  Intent: {turn.get('intent_summary', '')}\n"
            f"  Cypher used: {turn.get('cypher', '')}\n"
            f"  Sample rows: {_json.dumps(turn.get('sample_rows', [])[:3], default=str)}"
        )
    return "\n".join(lines)


def generate_cypher(question: str, error_feedback: str | None = None, history: list[dict] | None = None) -> str:
    user = f"User question: {question}\n"
    hist = _format_history(history)
    if hist:
        user += hist + "\n"
    user += "\nReturn Cypher only."
    if error_feedback:
        user += f"\n\nPrevious attempt failed with error:\n{error_feedback}\nFix the query."
    raw = chat(_system_prompt(), user, temperature=0.1)
    return extract_cypher(raw)
