from openai import OpenAI
from django.conf import settings
import json

client = OpenAI(
    api_key=settings.OPENAI_API_KEY,
)


def build_prompt() -> str:
    return """
Convert the document into a JSON array of editor blocks.

Rules:
- Return ONLY valid JSON
- No markdown
- No explanations
- Preserve structure: headings, paragraphs, lists, code blocks
- Output format:
[
  {
    "type": "paragraph",
    "content": "example"
  }
]
"""


def clean_json(raw: str):
    raw = raw.strip()

    if raw.startswith("```"):
        raw = raw.replace("```json", "").replace("```", "").strip()

    return raw


def convert_plain_text(text: str):
    prompt = build_prompt()

    try:
        response = client.responses.create(
    model="gpt-5.4-mini",
    input=[
        {
            "role": "system",
            "content": "You convert documents into JSON editor blocks. Return ONLY valid JSON.",
        },
        {
            "role": "user",
            "content": f"""
Document text:

{text[:12000]}

{prompt}
""",
        },
    ],
)

        raw = response.output_text.strip()
        blocks_json = clean_json(raw)

        return {
            "success": True,
            "content": blocks_json,
        }

    except Exception as e:
        return {
            "success": False,
            "error": str(e),
        }
    
def enrich_reference(raw: str) -> dict:
    """
    Given a title or URL, use OpenAI to find/infer:
    title, authors, year, url, abstract, tags
    Returns a dict.
    """
    import openai, json as _json
    client = openai.OpenAI()
    
    prompt = f"""You are a research reference resolver.
Given this reference hint: "{raw}"

Return a JSON object with these fields (use null if unknown):
{{
  "title": "Full title of the paper/resource",
  "authors": "Author names as string",
  "year": "Publication year",
  "url": "Best URL (DOI, arxiv, publisher page, or original URL if already a URL)",
  "abstract": "Brief 1-2 sentence description",
  "tags": ["relevant", "topic", "tags"]
}}

Only return valid JSON, no other text."""

    try:
        resp = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.1,
        )
        text = resp.choices[0].message.content.strip()
        text = text.replace("```json", "").replace("```", "").strip()
        return _json.loads(text)
    except Exception:
        return {"title": raw, "url": raw if raw.startswith("http") else "", "tags": []}
    

def _embed(text: str) -> list[float]:
    """
    Generate embedding vector using OpenAI.
    """
    resp = _openai.embeddings.create(
        model=EMBED_MODEL,
        input=text,
    )
    return resp.data[0].embedding


"""
papers/views_search.py

Endpoint: GET /projects/search/?q=<query>&mode=semantic|keyword|hybrid
          Searches ALL projects belonging to the authenticated user.

Returns:
[
  {
    "type": "paper" | "reference",
    "id": int,
    "project_id": int,
    "project_title": str,
    "title": str,
    "snippet": str,
    "score": float,   # 0–1
    "extra": { … }
  }
]
"""

import json
import re

import numpy as np
from django.db.models import Q
from rest_framework.response import Response
from rest_framework.views import APIView

from openai import OpenAI
from django.conf import settings

from projects.models import Project
from papers.models import Paper, PaperChunk, ReferenceItem

_openai = OpenAI(api_key=settings.OPENAI_API_KEY)

EMBED_MODEL = "text-embedding-3-small"


# ── text helpers ──────────────────────────────────────────────────────────────

def _normalise(text: str) -> str:
    """Lower-case and normalise common apostrophe/quote variants."""
    return (
        text.lower()
        .replace("\u2019", "'")   # right single quotation mark → apostrophe
        .replace("\u2018", "'")   # left single quotation mark → apostrophe
        .replace("\u201c", '"')
        .replace("\u201d", '"')
    )


def _query_words(query: str) -> list[str]:
    """
    Split the query into meaningful tokens, stripping punctuation that
    would prevent icontains from matching (e.g. the apostrophe in "canada's").
    Returns the cleaned whole query AND individual words, longest first, so
    we try the full phrase match before falling back to per-word matching.
    """
    normalised = _normalise(query)
    # Strip leading/trailing punctuation from each token but keep internal hyphens
    tokens = [re.sub(r"^[^\w]+|[^\w]+$", "", t) for t in normalised.split()]
    tokens = [t for t in tokens if len(t) >= 2]  # drop single-char noise
    # Also add the full normalised phrase as the first candidate
    full_phrase = normalised.strip()
    candidates = []
    if full_phrase not in tokens:
        candidates.append(full_phrase)
    candidates.extend(tokens)
    return candidates


def _extract_text_from_content(content_json: str) -> str:
    """Pull plain text out of the JSON block array stored in Paper.content."""
    try:
        blocks = json.loads(content_json)
    except Exception:
        return content_json or ""
    parts = []
    for block in blocks:
        if not isinstance(block, dict):
            continue
        # Recursively grab text from nested structures (e.g. table cells)
        for key in ("content", "text", "body", "caption", "alt"):
            val = block.get(key)
            if isinstance(val, str) and val.strip():
                parts.append(val)
            elif isinstance(val, list):
                for item in val:
                    if isinstance(item, str):
                        parts.append(item)
                    elif isinstance(item, list):
                        parts.extend(str(x) for x in item if x)
        # Table rows
        for row in block.get("rows", []):
            if isinstance(row, list):
                parts.extend(str(cell) for cell in row if cell)
        for hdr in block.get("headers", []):
            if isinstance(hdr, str):
                parts.append(hdr)
    return " ".join(p for p in parts if p)


def _snippet(text: str, query: str, window: int = 220) -> str:
    """
    Return a short excerpt centred on the first query-word hit.
    Falls back to the beginning of the text.
    """
    if not text:
        return ""
    text_clean = re.sub(r"\s+", " ", text).strip()
    lower = _normalise(text_clean)
    for word in _query_words(query):
        idx = lower.find(word)
        if idx != -1:
            start = max(0, idx - window // 2)
            end = min(len(text_clean), idx + window // 2)
            excerpt = text_clean[start:end].strip()
            if start > 0:
                excerpt = "…" + excerpt
            if end < len(text_clean):
                excerpt = excerpt + "…"
            return excerpt
    return text_clean[:window] + ("…" if len(text_clean) > window else "")


# ── keyword filter builder ────────────────────────────────────────────────────

def _paper_q(words: list[str]) -> Q:
    """
    Build a Q object that requires at least ONE of the search words to appear
    in ANY of the paper's searchable fields.
    Using OR across words gives maximum recall; scoring below rewards
    papers that match more words.
    """
    q = Q()
    for word in words:
        q |= (
            Q(title__icontains=word) |
            Q(abstract__icontains=word) |
            Q(authors__icontains=word) |
            Q(content__icontains=word)
        )
    return q


def _ref_q(words: list[str]) -> Q:
    q = Q()
    for word in words:
        q |= (
            Q(title__icontains=word) |
            Q(body__icontains=word) |
            Q(url__icontains=word) |
            Q(authors__icontains=word) |
            Q(journal__icontains=word)
        )
    return q


def _score_paper(paper: Paper, words: list[str], body_text: str) -> float:
    """
    Score 0–1 based on how many query words appear and in which fields.
    Title matches are worth more than body matches.
    """
    if not words:
        return 0.5
    hits = 0
    title_norm = _normalise(paper.title)
    abstract_norm = _normalise(paper.abstract)
    body_norm = _normalise(body_text)
    for word in words:
        if word in title_norm:
            hits += 3       # title match counts triple
        elif word in abstract_norm:
            hits += 2
        elif word in body_norm:
            hits += 1
    max_possible = len(words) * 3
    raw = hits / max_possible if max_possible else 0
    # Clamp to [0.50, 0.95] so keyword results always sit below perfect semantic
    return round(0.50 + raw * 0.45, 4)


def _score_ref(ref: ReferenceItem, words: list[str]) -> float:
    if not words:
        return 0.5
    hits = 0
    title_norm = _normalise(ref.title or "")
    body_norm = _normalise(ref.body or "")
    for word in words:
        if word in title_norm:
            hits += 3
        elif word in body_norm:
            hits += 1
    max_possible = len(words) * 3
    raw = hits / max_possible if max_possible else 0
    return round(0.45 + raw * 0.45, 4)


# ── keyword search ────────────────────────────────────────────────────────────

def _keyword_search_papers(user, query: str) -> list[dict]:
    words = _query_words(query)
    if not words:
        return []

    papers = (
        Paper.objects
        .filter(project__user=user)
        .filter(_paper_q(words))
        .select_related("project")
        .order_by("-updated_at")[:60]
    )

    results = []
    for paper in papers:
        body_text = _extract_text_from_content(paper.content)
        snippet_src = paper.abstract or body_text or paper.title
        results.append({
            "type": "paper",
            "id": paper.id,
            "project_id": paper.project_id,
            "project_title": paper.project.title,
            "title": paper.title,
            "snippet": _snippet(snippet_src, query),
            "score": _score_paper(paper, words, body_text),
            "extra": {
                "paper_type": paper.paper_type,
                "authors": paper.authors,
                "status": paper.status,
                "citation_format": paper.citation_format,
            },
        })
    return results


def _keyword_search_references(user, query: str) -> list[dict]:
    words = _query_words(query)
    if not words:
        return []

    refs = (
        ReferenceItem.objects
        .filter(project__user=user)
        .filter(_ref_q(words))
        .select_related("project")
        .order_by("-updated_at")[:60]
    )

    results = []
    for ref in refs:
        results.append({
            "type": "reference",
            "id": ref.id,
            "project_id": ref.project_id,
            "project_title": ref.project.title,
            "title": ref.title or ref.url or "Untitled",
            "snippet": _snippet(ref.body or ref.url or ref.title or "", query),
            "score": _score_ref(ref, words),
            "extra": {
                "item_type": ref.item_type,
                "url": ref.url,
                "authors": ref.authors,
                "year": ref.year,
                "journal": ref.journal,
                "doi": ref.doi,
            },
        })
    return results

# ── embeddings helpers ────────────────────────────────────────────────────────



def _cosine(a: list[float], b: list[float]) -> float:
    """
    Cosine similarity between two vectors.
    """
    a_np = np.array(a, dtype=np.float32)
    b_np = np.array(b, dtype=np.float32)

    denom = np.linalg.norm(a_np) * np.linalg.norm(b_np)
    if denom == 0:
        return 0.0

    return float(np.dot(a_np, b_np) / denom)
# ── semantic search (pgvector) ────────────────────────────────────────────────

def _semantic_search(user, query_vec: list[float], top_k: int = 20) -> list[dict]:
    """
    Pull all PaperChunks for the user's projects, compute cosine similarity
    in Python, and return the top_k results.

    For larger datasets you'd do this in SQL with pgvector's <=> operator;
    this approach works well up to tens of thousands of chunks and avoids
    requiring a specific pgvector Django version.
    """
    project_ids = list(Project.objects.filter(user=user).values_list("id", flat=True))
    if not project_ids:
        return []

    chunks = PaperChunk.objects.filter(
        paper__project_id__in=project_ids
    ).select_related("paper", "paper__project")

    scored = []
    for chunk in chunks:
        if chunk.embedding is None:
            continue
        sim = _cosine(query_vec, chunk.embedding)
        scored.append((sim, chunk))

    scored.sort(key=lambda x: x[0], reverse=True)
    top = scored[:top_k]

    # De-duplicate by paper — keep highest-scored chunk per paper
    seen_paper_ids: set[int] = set()
    results = []
    for sim, chunk in top:
        if chunk.paper_id in seen_paper_ids:
            continue
        seen_paper_ids.add(chunk.paper_id)
        results.append({
            "type": "paper",
            "id": chunk.paper_id,
            "project_id": chunk.paper.project_id,
            "project_title": chunk.paper.project.title,
            "title": chunk.paper.title,
            "snippet": _snippet(chunk.content, ""),   # already the best chunk
            "score": round(sim, 4),
            "extra": {
                "paper_type": chunk.paper.paper_type,
                "authors": chunk.paper.authors,
                "status": chunk.paper.status,
                "citation_format": chunk.paper.citation_format,
                "page": chunk.page_number,
            },
        })

    return results

# ── chunking/indexing ─────────────────────────────────────────────────────────

CHUNK_SIZE = 1200
CHUNK_OVERLAP = 200


def _chunk_text(text: str) -> list[str]:
    """
    Split text into overlapping chunks.
    """
    text = re.sub(r"\s+", " ", text).strip()

    if not text:
        return []

    chunks = []
    start = 0

    while start < len(text):
        end = start + CHUNK_SIZE
        chunk = text[start:end]

        if chunk.strip():
            chunks.append(chunk)

        start += CHUNK_SIZE - CHUNK_OVERLAP

    return chunks


def _index_paper(paper: Paper):
    """
    Rebuild semantic chunks for a paper.
    """

    # delete old chunks
    PaperChunk.objects.filter(paper=paper).delete()

    body_text = _extract_text_from_content(paper.content)

    combined = "\n\n".join(filter(None, [
        paper.title,
        paper.abstract,
        body_text,
    ])).strip()

    if not combined:
        return

    chunks = _chunk_text(combined)

    for idx, chunk in enumerate(chunks):
        try:
            embedding = _embed(chunk)

            PaperChunk.objects.create(
                paper=paper,
                chunk_index=idx,
                content=chunk,
                embedding=embedding,
            )

        except Exception:
            # don't fail paper save if embedding fails
            pass
# ── merge & deduplicate ───────────────────────────────────────────────────────

def _merge(results: list[dict]) -> list[dict]:
    """
    Merge results from multiple sources, deduplicating by (type, id).
    When the same item appears more than once, keep the highest score.
    """
    seen: dict[tuple, dict] = {}
    for r in results:
        key = (r["type"], r["id"])
        if key not in seen or r["score"] > seen[key]["score"]:
            seen[key] = r
    merged = sorted(seen.values(), key=lambda x: x["score"], reverse=True)
    return merged


# ── view ──────────────────────────────────────────────────────────────────────
"""
papers/views_compare.py

POST /projects/compare/
Body:
{
  "items": [
    { "type": "paper",     "id": 12 },
    { "type": "reference", "id": 7  },
    ...
  ]
}

Returns a comparison table generated by gpt-4o-mini:
{
  "criteria": ["Methodology", "Dataset", "Results", ...],
  "items": [
    {
      "id": 12,
      "type": "paper",
      "title": "Attention Is All You Need",
      "cells": {
        "Methodology": "Transformer with multi-head self-attention",
        "Dataset": "WMT 2014 EN-DE / EN-FR",
        "Results": "28.4 BLEU on EN-DE"
      }
    },
    ...
  ]
}
"""

import json

from django.db.models import Q

from openai import OpenAI
from django.conf import settings

from projects.models import Project
from papers.models import Paper, ReferenceItem

_openai = OpenAI(api_key=settings.OPENAI_API_KEY)


# ── helpers ───────────────────────────────────────────────────────────────────

def _extract_text_from_content(content_json: str, max_chars: int = 3000) -> str:
    """Pull plain text out of the JSON block array stored in Paper.content."""
    try:
        blocks = json.loads(content_json)
    except Exception:
        return (content_json or "")[:max_chars]
    parts = []
    for block in blocks:
        if not isinstance(block, dict):
            continue
        for key in ("content", "text", "body", "caption"):
            val = block.get(key)
            if isinstance(val, str) and val.strip():
                parts.append(val)
        for row in block.get("rows", []):
            if isinstance(row, list):
                parts.extend(str(c) for c in row if c)
    text = " ".join(p for p in parts if p)
    return text[:max_chars]


def _paper_summary(paper: Paper) -> str:
    parts = []
    if paper.title:
        parts.append(f"Title: {paper.title}")
    if paper.authors:
        parts.append(f"Authors: {paper.authors}")
    if paper.abstract:
        parts.append(f"Abstract: {paper.abstract[:800]}")
    body = _extract_text_from_content(paper.content, max_chars=2000)
    if body:
        parts.append(f"Content excerpt: {body}")
    return "\n".join(parts)


def _ref_summary(ref: ReferenceItem) -> str:
    parts = []
    if ref.title:
        parts.append(f"Title: {ref.title}")
    if ref.authors:
        parts.append(f"Authors: {ref.authors}")
    if ref.year:
        parts.append(f"Year: {ref.year}")
    if ref.journal:
        parts.append(f"Journal: {ref.journal}")
    if ref.body:
        parts.append(f"Notes: {ref.body[:1000]}")
    if ref.url:
        parts.append(f"URL: {ref.url}")
    return "\n".join(parts)

def _generate_comparison(item_summaries: list[dict]) -> dict:
    """
    Generate structured comparison table using OpenAI.
    """

    titles = [s["title"] for s in item_summaries]

    items_text = "\n\n---\n\n".join(
        f"ITEM {i+1}: {s['title']}\n{s['summary']}"
        for i, s in enumerate(item_summaries)
    )

    system = (
        "You are a research analysis assistant. "
        "Given summaries of research papers or references, "
        "produce a structured comparison table. "
        "Return ONLY valid JSON."
    )

    user = f"""
Compare these {len(item_summaries)} items:

{items_text}

Return JSON in this format:

{{
  "criteria": ["Criterion1", "Criterion2"],
  "cells": {{
    "Item Title": {{
      "Criterion1": "value",
      "Criterion2": "value"
    }}
  }}
}}

Rules:
- 5 to 8 criteria
- concise values
- use N/A if missing
- ONLY return JSON
"""

    resp = _openai.responses.create(
        model="gpt-5.4-mini",
        input=[
            {
                "role": "system",
                "content": system,
            },
            {
                "role": "user",
                "content": user,
            },  
        ],
    )

    raw = resp.output_text.strip()

    raw = (
        raw.replace("```json", "")
        .replace("```", "")
        .strip()
    )

    return json.loads(raw)