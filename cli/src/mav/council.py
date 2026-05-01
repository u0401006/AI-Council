"""Council orchestration: parallel queries, peer review, chairman synthesis."""
from __future__ import annotations

from collections.abc import AsyncIterator
from dataclasses import dataclass, field

from .models import Model
from .stream import stream_chat


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


async def query_one(
    model: Model,
    messages: list[dict],
) -> AsyncIterator[tuple[Model, str]]:
    """Stream one model's response. Yields (model, delta) tuples."""
    async for delta in stream_chat(model.id, messages):
        yield model, delta
