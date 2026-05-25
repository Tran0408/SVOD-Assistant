"""Groq LLM client wrapper. Model: openai/gpt-oss-120b."""
import os
import re
import json
import time
from groq import Groq, RateLimitError

_client: Groq | None = None


def get_client() -> Groq:
    global _client
    if _client is None:
        _client = Groq(api_key=os.environ["GROQ_API_KEY"])
    return _client


def _model() -> str:
    return os.getenv("GROQ_MODEL", "openai/gpt-oss-120b")


def chat(system: str, user: str, temperature: float = 0.1, max_tokens: int = 2048, reasoning_effort: str = "low") -> str:
    """Return raw assistant text. Retries on 429 with backoff."""
    attempts = 0
    while True:
        try:
            kwargs = dict(
                model=_model(),
                messages=[
                    {"role": "system", "content": system},
                    {"role": "user", "content": user},
                ],
                temperature=temperature,
                max_tokens=max_tokens,
            )
            # gpt-oss models on Groq accept reasoning_effort; ignore TypeError for other models.
            try:
                resp = get_client().chat.completions.create(**kwargs, reasoning_effort=reasoning_effort)
            except TypeError:
                resp = get_client().chat.completions.create(**kwargs)
            return resp.choices[0].message.content or ""
        except RateLimitError as e:
            attempts += 1
            if attempts > 4:
                raise
            wait = min(2 ** attempts, 30)
            msg = str(e)
            m = re.search(r"try again in ([\d.]+)([ms]+)", msg)
            if m:
                val = float(m.group(1))
                unit = m.group(2)
                wait = max(wait, val / 1000 if "ms" in unit else val)
            time.sleep(wait + 0.5)


_CODE_FENCE = re.compile(r"```(?:cypher|sql)?\s*(.*?)```", re.DOTALL | re.IGNORECASE)


def extract_cypher(text: str) -> str:
    """Pull Cypher out of fenced block if present, else strip."""
    m = _CODE_FENCE.search(text)
    return (m.group(1) if m else text).strip()


def extract_json(text: str) -> dict | list | None:
    """Best-effort JSON extraction from model output."""
    text = text.strip()
    m = re.search(r"```(?:json)?\s*(.*?)```", text, re.DOTALL | re.IGNORECASE)
    if m:
        text = m.group(1).strip()
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        start = text.find("{")
        end = text.rfind("}")
        if start != -1 and end > start:
            try:
                return json.loads(text[start:end + 1])
            except json.JSONDecodeError:
                return None
    return None
