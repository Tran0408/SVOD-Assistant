"""One-shot: remove the corrupted a.account_id property from all Account nodes.
Run: python -m scripts.drop_account_id
"""
from dotenv import load_dotenv
load_dotenv()

from services.neo4j_service import run_query
from services.schema_introspect import reset_cache


def main():
    before = run_query("MATCH (a:Account) WHERE a.account_id IS NOT NULL RETURN count(a) AS c")[0]["c"]
    print(f"Accounts with account_id set: {before}")
    if before == 0:
        print("Nothing to remove.")
    else:
        run_query("MATCH (a:Account) WHERE a.account_id IS NOT NULL REMOVE a.account_id")
        after = run_query("MATCH (a:Account) WHERE a.account_id IS NOT NULL RETURN count(a) AS c")[0]["c"]
        print(f"Removed. Remaining with account_id: {after}")
    reset_cache()
    print("Schema cache reset.")


if __name__ == "__main__":
    main()
