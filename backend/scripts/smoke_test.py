"""End-to-end smoke test: run a few questions through the agent."""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from dotenv import load_dotenv
load_dotenv()

from agents.workflow import run_agent

QUESTIONS = [
    "Top 5 most watched content by total hours",
    "How many accounts churned in 2024 by product tier?",
    "What are the top genres by total watch hours?",
]


def main():
    import time
    for i, q in enumerate(QUESTIONS, 1):
        if i > 1:
            time.sleep(8)  # ease Groq free-tier TPM
        print(f"\n========== Q{i}: {q} ==========")
        final = run_agent(q)
        print(f"valid={final.get('is_valid')} complexity={final.get('complexity')} "
              f"clarify={final.get('needs_clarification')} "
              f"retries={final.get('retry_count')} rows={final.get('record_count')} "
              f"confidence={final.get('confidence')} time_ms={final.get('execution_time_ms')}")
        print(f"Cypher:\n{final.get('cypher','')}\n")
        rep = final.get("report", {})
        if rep:
            print(f"Summary: {rep.get('executive_summary','')[:300]}")
            print(f"Metrics: {json.dumps(rep.get('key_metrics',{}))[:200]}")
        if final.get("clarification"):
            print(f"Clarification: {final['clarification']}")
        if final.get("last_error"):
            print(f"Error: {final['last_error']}")


if __name__ == "__main__":
    main()
