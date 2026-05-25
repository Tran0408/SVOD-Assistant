"""Neo4j driver wrapper."""
import os
from typing import Any
from neo4j import GraphDatabase, Driver
from neo4j.time import Date, DateTime, Time

_driver: Driver | None = None


def get_driver() -> Driver:
    global _driver
    if _driver is None:
        _driver = GraphDatabase.driver(
            os.environ["NEO4J_URI"],
            auth=(os.environ["NEO4J_USERNAME"], os.environ["NEO4J_PASSWORD"]),
        )
        _driver.verify_connectivity()
    return _driver


def close_driver() -> None:
    global _driver
    if _driver:
        _driver.close()
        _driver = None


def _serialize(v: Any) -> Any:
    if isinstance(v, (Date, DateTime, Time)):
        return v.iso_format()
    if isinstance(v, dict):
        return {k: _serialize(x) for k, x in v.items()}
    if isinstance(v, (list, tuple)):
        return [_serialize(x) for x in v]
    return v


def run_query(cypher: str, params: dict | None = None) -> list[dict]:
    """Run a read-only Cypher and return JSON-serializable rows."""
    driver = get_driver()
    with driver.session() as s:
        result = s.run(cypher, params or {})
        return [_serialize(dict(record)) for record in result]
