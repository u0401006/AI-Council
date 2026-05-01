"""Council orchestration: parallel queries, peer review, chairman synthesis."""
from __future__ import annotations

import asyncio
from collections.abc import AsyncIterator
from dataclasses import dataclass, field

from .models import Model
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
