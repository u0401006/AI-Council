"""Council orchestration: parallel queries, peer review, chairman synthesis."""
from __future__ import annotations

import asyncio
import json
import re
from collections import Counter
from collections.abc import AsyncIterator
from dataclasses import dataclass, field

from .models import Model
from .prompts import build_chairman_prompt, build_review_prompt
from .stream import OpenRouterError, complete_chat, stream_chat


@dataclass
class ModelResponse:
    model: Model
    text: str = ""
    error: str | None = None


@dataclass
class CouncilResult:
    question: str
    responses: list[ModelResponse] = field(default_factory=list)
    reviews: list[ModelResponse] = field(default_factory=list)
    chairman: ModelResponse | None = None


@dataclass
class StreamEvent:
    """Event emitted during parallel streaming."""
    model: Model
    delta: str | None = None
    done: bool = False
    error: str | None = None


async def _stream_with_events(
    model: Model,
    messages: list[dict],
    queue: asyncio.Queue[StreamEvent],
) -> ModelResponse:
    response = ModelResponse(model=model)
    try:
        async for delta in stream_chat(model.id, messages):
            response.text += delta
            await queue.put(StreamEvent(model=model, delta=delta))
    except OpenRouterError as e:
        response.error = str(e)
        await queue.put(StreamEvent(model=model, error=str(e)))
    except Exception as e:  # noqa: BLE001 - catch-all for network/parse errors
        response.error = f"{type(e).__name__}: {e}"
        await queue.put(StreamEvent(model=model, error=response.error))
    finally:
        await queue.put(StreamEvent(model=model, done=True))
    return response


async def query_parallel(
    question: str,
    council: list[Model],
) -> AsyncIterator[StreamEvent | list[ModelResponse]]:
    """Query council in parallel. Yields StreamEvent during streaming;
    yields final list[ModelResponse] as last item."""
    messages = [{"role": "user", "content": question}]
    queue: asyncio.Queue[StreamEvent] = asyncio.Queue()
    tasks = [
        asyncio.create_task(_stream_with_events(m, messages, queue))
        for m in council
    ]

    pending = len(council)
    while pending > 0:
        ev = await queue.get()
        yield ev
        if ev.done:
            pending -= 1

    responses = await asyncio.gather(*tasks)
    yield list(responses)


async def query_one_complete(model: Model, prompt: str) -> ModelResponse:
    """Non-streaming single-model query (used for review/chairman stages)."""
    response = ModelResponse(model=model)
    try:
        response.text = await complete_chat(
            model.id, [{"role": "user", "content": prompt}]
        )
    except OpenRouterError as e:
        response.error = str(e)
    except Exception as e:  # noqa: BLE001
        response.error = f"{type(e).__name__}: {e}"
    return response


# ---------------------------------------------------------------------------
# Peer review
# ---------------------------------------------------------------------------


def _label_for(idx: int) -> str:
    return chr(ord("A") + idx)


def _parse_ranking(text: str) -> list[str]:
    """Extract response labels in ranked order from the reviewer's JSON output.
    Tolerant: scans for ```json ... ``` block first, then any {...}."""
    candidates: list[str] = []
    fence_match = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", text, re.DOTALL)
    if fence_match:
        candidates.append(fence_match.group(1))
    brace_match = re.search(r"\{[\s\S]*\}", text)
    if brace_match:
        candidates.append(brace_match.group(0))

    for blob in candidates:
        try:
            data = json.loads(blob)
        except json.JSONDecodeError:
            continue
        rankings = data.get("rankings")
        if not isinstance(rankings, list):
            continue
        sorted_ranks = sorted(
            (r for r in rankings if isinstance(r, dict) and "response" in r),
            key=lambda r: r.get("rank", 99),
        )
        return [str(r["response"]) for r in sorted_ranks]
    return []


async def peer_review(
    query: str,
    responses: list[ModelResponse],
) -> tuple[list[ModelResponse], list[Model]]:
    """Each model reviews the others (anonymized A/B/C).
    Returns (review_responses, aggregated_ranking_by_model)."""
    valid = [r for r in responses if not r.error and r.text.strip()]
    if len(valid) < 2:
        return [], []

    review_tasks: list[asyncio.Task[ModelResponse]] = []
    label_to_model: list[dict[str, Model]] = []  # per-reviewer label mapping

    for reviewer in valid:
        others = [r for r in valid if r.model.id != reviewer.model.id]
        labels = {_label_for(i): r.model for i, r in enumerate(others)}
        label_to_model.append(labels)
        prompt = build_review_prompt(
            query,
            [(_label_for(i), r.text) for i, r in enumerate(others)],
        )
        review_tasks.append(
            asyncio.create_task(query_one_complete(reviewer.model, prompt))
        )

    reviews = await asyncio.gather(*review_tasks)

    # Aggregate ranking: for each reviewer, parse the order and accumulate scores.
    # Lower rank index = better. Score = sum of rank positions across reviewers.
    scores: Counter[str] = Counter()
    seen_models: dict[str, Model] = {}
    for review, labels in zip(reviews, label_to_model, strict=True):
        if review.error:
            continue
        order = _parse_ranking(review.text)
        for rank_idx, label in enumerate(order):
            model = labels.get(label)
            if not model:
                continue
            scores[model.id] += rank_idx + 1
            seen_models[model.id] = model

    aggregated = [seen_models[mid] for mid, _ in scores.most_common()][::-1]
    # most_common returns highest-score-first; lower score = better, so reverse
    if not aggregated:
        aggregated = [r.model for r in valid]
    return list(reviews), aggregated


# ---------------------------------------------------------------------------
# Chairman synthesis
# ---------------------------------------------------------------------------


async def chairman_synthesize(
    query: str,
    responses: list[ModelResponse],
    chairman_model: Model,
    ranking: list[Model] | None = None,
) -> AsyncIterator[str]:
    """Stream the chairman's synthesized answer."""
    valid = [r for r in responses if not r.error and r.text.strip()]
    prompt = build_chairman_prompt(
        query,
        [(r.model.label, r.text) for r in valid],
        ranking=[m.label for m in ranking] if ranking else None,
    )
    async for delta in stream_chat(
        chairman_model.id, [{"role": "user", "content": prompt}]
    ):
        yield delta
