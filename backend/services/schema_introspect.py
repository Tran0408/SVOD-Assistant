"""Auto-introspect Neo4j schema. Dataset-agnostic — works against any graph."""
import os
from pathlib import Path
from .neo4j_service import run_query

_cache: str | None = None


def _format_props(prop_list):
    return ", ".join(prop_list) if prop_list else "(no properties)"


def introspect_schema() -> str:
    """Pull live node labels, property keys, relationship types + endpoints from DB."""
    labels = run_query("CALL db.labels() YIELD label RETURN label ORDER BY label")
    rel_types = run_query("CALL db.relationshipTypes() YIELD relationshipType RETURN relationshipType ORDER BY relationshipType")

    lines = ["NODE LABELS:"]
    for row in labels:
        lbl = row["label"]
        props = run_query(
            f"MATCH (n:`{lbl}`) WITH n LIMIT 1 RETURN keys(n) AS k"
        )
        prop_keys = props[0]["k"] if props else []
        lines.append(f"(:{lbl})  properties: {_format_props(prop_keys)}")

    lines.append("")
    lines.append("RELATIONSHIPS:")
    for row in rel_types:
        rt = row["relationshipType"]
        endpoints = run_query(
            f"MATCH (a)-[r:`{rt}`]->(b) WITH a, r, b LIMIT 1 "
            f"RETURN labels(a) AS src, labels(b) AS tgt, keys(r) AS props"
        )
        if endpoints:
            src = ":".join(endpoints[0]["src"]) or "?"
            tgt = ":".join(endpoints[0]["tgt"]) or "?"
            rprops = endpoints[0]["props"]
            prop_str = f" {{{', '.join(rprops)}}}" if rprops else ""
            lines.append(f"({src})-[:{rt}{prop_str}]->({tgt})")
        else:
            lines.append(f"(?)-[:{rt}]->(?)")

    return "\n".join(lines)


def _read_optional(env_var: str) -> str:
    path = os.getenv(env_var)
    if not path:
        return ""
    p = Path(path)
    if not p.exists():
        return ""
    return p.read_text()


def get_schema() -> str:
    """Composed schema string — introspected + optional notes + examples."""
    global _cache
    if _cache is not None:
        return _cache

    parts = [introspect_schema()]
    notes = _read_optional("SCHEMA_NOTES_FILE")
    if notes:
        parts.append("\nNOTES:\n" + notes)
    examples = _read_optional("SCHEMA_EXAMPLES_FILE")
    if examples:
        parts.append("\nEXAMPLE QUERIES:\n" + examples)

    _cache = "\n".join(parts)
    return _cache


def reset_cache() -> None:
    global _cache
    _cache = None
