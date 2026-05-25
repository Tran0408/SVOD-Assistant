# Deployment Guide

Two services. Backend on **Railway**, frontend on **Vercel**, graph on **Neo4j AuraDB** (free tier).

---

## 1. Neo4j AuraDB

Your instance is already provisioned and loaded. Grab the credentials from `backend/.env`:
- `NEO4J_URI` (e.g. `neo4j+s://xxxxxxxx.databases.neo4j.io`)
- `NEO4J_USERNAME` (`neo4j`)
- `NEO4J_PASSWORD`

You'll paste these into Railway in step 2.

Only reload (`python -m scripts.load_data`) if the dataset changes.

---

## 2. Backend → Railway

1. Push the repo to GitHub if not already.
2. https://railway.app → New Project → Deploy from GitHub repo
3. Set **Root Directory**: `backend`
4. Railway auto-detects Python via `requirements.txt` and `Procfile`
5. Add env vars (Variables tab):
   - `GROQ_API_KEY` = your Groq key
   - `NEO4J_URI` = your Aura URI
   - `NEO4J_USERNAME` = `neo4j`
   - `NEO4J_PASSWORD` = your Aura password
   - `SCHEMA_NOTES_FILE` = `prompts/svod_notes.txt`
   - `SCHEMA_EXAMPLES_FILE` = `prompts/svod_examples.txt`
   - `CORS_ORIGINS` = `https://<your-vercel-app>.vercel.app` (add after Vercel deploy)
6. Generate a public domain (Settings → Networking → Generate Domain).
7. Verify: `curl https://<railway-domain>/api/health` → `{"status":"healthy",...}`

**Procfile** uses gunicorn + gevent worker so SSE streaming works.

---

## 3. Frontend → Vercel

1. https://vercel.com → New Project → Import the same GitHub repo
2. Set **Root Directory**: `frontend`
3. Framework preset: **Next.js** (auto)
4. Add env var:
   - `NEXT_PUBLIC_API_URL` = `https://<railway-domain>/api`
5. Deploy. Vercel returns a URL like `svod-assistant.vercel.app`
6. Back to Railway: update `CORS_ORIGINS` to that Vercel URL and redeploy backend.

---

## 4. Smoke test

- Open `https://<your-vercel-app>.vercel.app`
- Click **Launch**
- Ask "Top 5 most watched content by total hours"
- Confirm streaming progress bubble + answer with confidence badge + visualization tab

---

## Notes

- **Free tiers**: Aura sleeps after inactivity (cold start ~10s). Railway free hobby tier and Vercel hobby are sufficient for demo traffic.
- **Cost guard**: Groq is paid per token. Set spending limits in their dashboard.
- **SSE caveat**: Vercel proxies don't buffer for the API host (we hit Railway directly). Don't put Railway behind a CDN that buffers.
- **Re-loading data**: re-run `python -m scripts.load_data` locally with new env if you swap datasets.
