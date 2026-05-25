"""Quick AuraDB connectivity + counts check. Run: python -m scripts.verify_connection"""
import os
from dotenv import load_dotenv
from neo4j import GraphDatabase

load_dotenv()

driver = GraphDatabase.driver(
    os.environ["NEO4J_URI"],
    auth=(os.environ["NEO4J_USERNAME"], os.environ["NEO4J_PASSWORD"]),
)
driver.verify_connectivity()
print("OK: connected")

with driver.session() as s:
    r = s.run("MATCH (n) RETURN count(n) AS nodes").single()
    print(f"Nodes: {r['nodes']}")
    r = s.run("MATCH ()-[x]->() RETURN count(x) AS rels").single()
    print(f"Rels: {r['rels']}")

driver.close()
