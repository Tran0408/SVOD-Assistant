"""
Load SVOD CSVs into Neo4j AuraDB.
Samples N accounts, filters services + viewership to that set, loads nodes + rels.
Run: python -m scripts.load_data
"""
import os
import sys
import json
import time
from pathlib import Path
from datetime import datetime

import pandas as pd
from dotenv import load_dotenv
from neo4j import GraphDatabase

load_dotenv()

DATA_DIR = Path(os.getenv("DATA_DIR", "../capstone data")).expanduser().resolve()
SAMPLE_ACCOUNTS = int(os.getenv("SAMPLE_ACCOUNTS", "1000"))
SEED = int(os.getenv("RANDOM_SEED", "42"))
BATCH = 1000

URI = os.environ["NEO4J_URI"]
USER = os.environ["NEO4J_USERNAME"]
PWD = os.environ["NEO4J_PASSWORD"]


def parse_date_dmy(s):
    if pd.isna(s) or s == "":
        return None
    try:
        return datetime.strptime(str(s), "%d/%m/%Y").date().isoformat()
    except ValueError:
        return None


def parse_date_iso(s):
    if pd.isna(s) or s == "":
        return None
    try:
        return datetime.fromisoformat(str(s)[:10]).date().isoformat()
    except ValueError:
        return None


def parse_genres(s):
    if pd.isna(s) or s == "":
        return []
    try:
        g = json.loads(s)
        return [x.strip() for x in g if x and x.strip()]
    except (json.JSONDecodeError, TypeError):
        return []


def batched(rows, n=BATCH):
    buf = []
    for r in rows:
        buf.append(r)
        if len(buf) >= n:
            yield buf
            buf = []
    if buf:
        yield buf


def run_constraints(session):
    stmts = [
        "CREATE CONSTRAINT account_key IF NOT EXISTS FOR (a:Account) REQUIRE a.account_key IS UNIQUE",
        "CREATE CONSTRAINT service_key IF NOT EXISTS FOR (s:Service) REQUIRE s.service_transaction_key IS UNIQUE",
        "CREATE CONSTRAINT content_key IF NOT EXISTS FOR (c:Content) REQUIRE c.content_key IS UNIQUE",
        "CREATE CONSTRAINT genre_name IF NOT EXISTS FOR (g:Genre) REQUIRE g.name IS UNIQUE",
        "CREATE CONSTRAINT month_key IF NOT EXISTS FOR (m:Month) REQUIRE m.key IS UNIQUE",
        "CREATE CONSTRAINT year_value IF NOT EXISTS FOR (y:Year) REQUIRE y.year IS UNIQUE",
        "CREATE INDEX account_acq IF NOT EXISTS FOR (a:Account) ON (a.first_acquisition_date)",
        "CREATE INDEX service_churn IF NOT EXISTS FOR (s:Service) ON (s.churn_date)",
    ]
    for s in stmts:
        session.run(s)


def month_key(date_iso):
    if not date_iso:
        return None
    return date_iso[:7]  # YYYY-MM


def wipe(session):
    print("Wiping existing graph...")
    while True:
        res = session.run("MATCH (n) WITH n LIMIT 10000 DETACH DELETE n RETURN count(n) AS c").single()
        if res["c"] == 0:
            break


def load_accounts(session, df):
    rows = []
    for r in df.itertuples(index=False):
        acq = parse_date_dmy(r.first_acquisition_date)
        rows.append({
            "account_key": int(r.account_key),
            "create_date": parse_date_dmy(r.create_date),
            "first_acquisition_date": acq,
            "acq_month": month_key(acq),
            "total_lifetime_billed": float(r.total_lifetime_billed_amount) if pd.notna(r.total_lifetime_billed_amount) else 0.0,
        })
    q = """
    UNWIND $rows AS row
    MERGE (a:Account {account_key: row.account_key})
    SET a.create_date = CASE WHEN row.create_date IS NULL THEN NULL ELSE date(row.create_date) END,
        a.first_acquisition_date = CASE WHEN row.first_acquisition_date IS NULL THEN NULL ELSE date(row.first_acquisition_date) END,
        a.total_lifetime_billed = row.total_lifetime_billed
    FOREACH (_ IN CASE WHEN row.acq_month IS NULL THEN [] ELSE [1] END |
        MERGE (m:Month {key: row.acq_month})
        SET m.year = toInteger(split(row.acq_month, '-')[0]),
            m.month = toInteger(split(row.acq_month, '-')[1])
        MERGE (a)-[:ACQUIRED_IN]->(m)
    )
    """
    for chunk in batched(rows):
        session.run(q, rows=chunk)
    print(f"  Loaded {len(rows)} accounts")


def load_services(session, df):
    rows = []
    for r in df.itertuples(index=False):
        churn = parse_date_dmy(r.churn_date)
        rows.append({
            "account_key": int(r.account_key),
            "service_transaction_key": int(r.service_transaction_key),
            "service_key": int(r.service_key) if pd.notna(r.service_key) else None,
            "product_name": r.product_name,
            "is_currently_active": str(r.is_currently_active).upper() == "TRUE",
            "acquisition_date": parse_date_dmy(r.acquisition_date),
            "subscription_start_date": parse_date_dmy(r.subscription_start_date),
            "subscription_end_date": parse_date_dmy(r.subscription_end_date),
            "churn_date": churn,
            "churn_month": month_key(churn),
            "billed_amount": float(r.billed_amount) if pd.notna(r.billed_amount) else 0.0,
        })
    q = """
    UNWIND $rows AS row
    MATCH (a:Account {account_key: row.account_key})
    MERGE (s:Service {service_transaction_key: row.service_transaction_key})
    SET s.service_key = row.service_key,
        s.product_name = row.product_name,
        s.is_currently_active = row.is_currently_active,
        s.acquisition_date = CASE WHEN row.acquisition_date IS NULL THEN NULL ELSE date(row.acquisition_date) END,
        s.subscription_start_date = CASE WHEN row.subscription_start_date IS NULL THEN NULL ELSE date(row.subscription_start_date) END,
        s.subscription_end_date = CASE WHEN row.subscription_end_date IS NULL THEN NULL ELSE date(row.subscription_end_date) END,
        s.churn_date = CASE WHEN row.churn_date IS NULL THEN NULL ELSE date(row.churn_date) END,
        s.billed_amount = row.billed_amount
    MERGE (a)-[:SUBSCRIBED_TO]->(s)
    FOREACH (_ IN CASE WHEN row.churn_month IS NULL THEN [] ELSE [1] END |
        MERGE (m:Month {key: row.churn_month})
        SET m.year = toInteger(split(row.churn_month, '-')[0]),
            m.month = toInteger(split(row.churn_month, '-')[1])
        MERGE (s)-[:CHURNED_IN]->(m)
    )
    """
    for i, chunk in enumerate(batched(rows)):
        session.run(q, rows=chunk)
        if (i + 1) % 10 == 0:
            print(f"  Services batch {i+1}")
    print(f"  Loaded {len(rows)} services")


def load_content_and_views(session, df):
    content_seen = {}
    content_rows = []
    for r in df.itertuples(index=False):
        ck = int(r.content_key) if pd.notna(r.content_key) else None
        if ck is None or ck in content_seen:
            continue
        content_seen[ck] = True
        content_rows.append({
            "content_key": ck,
            "content_name": r.content_name if pd.notna(r.content_name) else None,
            "content_type": r.content_type if pd.notna(r.content_type) else None,
            "content_year": int(r.content_year) if pd.notna(r.content_year) else None,
            "season_name": r.season_name if pd.notna(r.season_name) else None,
            "genres": parse_genres(r.genres),
        })

    q_content = """
    UNWIND $rows AS row
    MERGE (c:Content {content_key: row.content_key})
    SET c.content_name = row.content_name,
        c.content_type = row.content_type,
        c.content_year = row.content_year,
        c.season_name = row.season_name
    FOREACH (_ IN CASE WHEN row.content_year IS NULL THEN [] ELSE [1] END |
        MERGE (y:Year {year: row.content_year})
        MERGE (c)-[:RELEASED_IN]->(y)
    )
    WITH c, row
    UNWIND row.genres AS gname
    MERGE (g:Genre {name: gname})
    MERGE (c)-[:HAS_GENRE]->(g)
    """
    for chunk in batched(content_rows):
        session.run(q_content, rows=chunk)
    print(f"  Loaded {len(content_rows)} content nodes")

    view_rows = []
    for r in df.itertuples(index=False):
        if pd.isna(r.content_key) or pd.isna(r.account_key):
            continue
        view_rows.append({
            "account_key": int(r.account_key),
            "content_key": int(r.content_key),
            "view_key": r.view_key,
            "view_date": parse_date_iso(r.view_date),
            "play_seconds": float(r.play_seconds) if pd.notna(r.play_seconds) else 0.0,
            "quality": r.hd_saver_sd if pd.notna(r.hd_saver_sd) else None,
        })

    q_view = """
    UNWIND $rows AS row
    MATCH (a:Account {account_key: row.account_key})
    MATCH (c:Content {content_key: row.content_key})
    CREATE (a)-[:VIEWED {
        view_key: row.view_key,
        view_date: CASE WHEN row.view_date IS NULL THEN NULL ELSE date(row.view_date) END,
        play_seconds: row.play_seconds,
        quality: row.quality
    }]->(c)
    """
    for i, chunk in enumerate(batched(view_rows, n=2000)):
        session.run(q_view, rows=chunk)
        if (i + 1) % 10 == 0:
            print(f"  Views batch {i+1} ({(i+1)*2000} rows)")
    print(f"  Loaded {len(view_rows)} VIEWED rels")

    # Aggregated VIEWED_IN: one edge per (account, month) with rollup props
    df_v = df.dropna(subset=["account_key", "view_date"]).copy()
    df_v["view_date"] = pd.to_datetime(df_v["view_date"], errors="coerce")
    df_v = df_v.dropna(subset=["view_date"])
    df_v["month_key"] = df_v["view_date"].dt.strftime("%Y-%m")
    df_v["play_seconds"] = pd.to_numeric(df_v["play_seconds"], errors="coerce").fillna(0)
    agg = df_v.groupby(["account_key", "month_key"], as_index=False).agg(
        view_count=("view_date", "count"),
        total_seconds=("play_seconds", "sum"),
    )
    agg_rows = [
        {
            "account_key": int(r.account_key),
            "month_key": r.month_key,
            "view_count": int(r.view_count),
            "total_seconds": float(r.total_seconds),
        }
        for r in agg.itertuples(index=False)
    ]
    q_agg = """
    UNWIND $rows AS row
    MATCH (a:Account {account_key: row.account_key})
    MERGE (m:Month {key: row.month_key})
      ON CREATE SET m.year = toInteger(split(row.month_key, '-')[0]),
                    m.month = toInteger(split(row.month_key, '-')[1])
    MERGE (a)-[r:VIEWED_IN]->(m)
    SET r.view_count = row.view_count,
        r.total_seconds = row.total_seconds
    """
    for chunk in batched(agg_rows):
        session.run(q_agg, rows=chunk)
    print(f"  Loaded {len(agg_rows)} VIEWED_IN aggregated rels")


def main():
    print(f"Data dir: {DATA_DIR}")
    print(f"Sampling {SAMPLE_ACCOUNTS} accounts (seed={SEED})")

    accounts = pd.read_csv(DATA_DIR / "accounts.csv")
    sampled = accounts.sample(n=min(SAMPLE_ACCOUNTS, len(accounts)), random_state=SEED)
    account_keys = set(sampled["account_key"].astype(int).tolist())
    print(f"Sampled {len(account_keys)} account_keys")

    services = pd.read_csv(DATA_DIR / "services.csv")
    services = services.rename(columns={"1": "account_key"})
    services = services[services["account_key"].isin(account_keys)]
    print(f"Filtered services: {len(services)} rows")

    print("Reading viewership (large file)...")
    view_chunks = []
    for chunk in pd.read_csv(DATA_DIR / "viewership.csv", chunksize=200000):
        view_chunks.append(chunk[chunk["account_key"].isin(account_keys)])
    views = pd.concat(view_chunks, ignore_index=True)
    print(f"Filtered viewership: {len(views)} rows")

    driver = GraphDatabase.driver(URI, auth=(USER, PWD))
    driver.verify_connectivity()
    print("Connected to Neo4j")

    with driver.session() as session:
        run_constraints(session)
        wipe(session)
        print("Loading accounts...")
        load_accounts(session, sampled)
        print("Loading services...")
        load_services(session, services)
        print("Loading content + views...")
        load_content_and_views(session, views)

        counts = session.run("""
            MATCH (a:Account) WITH count(a) AS accounts
            MATCH (s:Service) WITH accounts, count(s) AS services
            MATCH (c:Content) WITH accounts, services, count(c) AS content
            MATCH (g:Genre) WITH accounts, services, content, count(g) AS genres
            OPTIONAL MATCH (m:Month) WITH accounts, services, content, genres, count(m) AS months
            OPTIONAL MATCH (y:Year) WITH accounts, services, content, genres, months, count(y) AS years
            MATCH ()-[r]->() RETURN accounts, services, content, genres, months, years, count(r) AS rels
        """).single()
        print(f"Final: {dict(counts)}")

    driver.close()
    print("Done.")


if __name__ == "__main__":
    t0 = time.time()
    main()
    print(f"Elapsed: {time.time()-t0:.1f}s")
