"""OpenRouter SSE streaming - thin wrapper around httpx."""
from __future__ import annotations

import json
import os
from collections.abc import AsyncIterator

import httpx

OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"


class OpenRouterError(RuntimeError):
    pass


async def stream_chat(
    model: str,
    messages: list[dict],
    *,
    api_key: str | None = None,
    timeout: float = 120.0,
) -> AsyncIterator[str]:
    """Yield content deltas from OpenRouter SSE stream."""
    key = api_key or os.environ.get("OPENROUTER_API_KEY")
    if not key:
        raise OpenRouterError("OPENROUTER_API_KEY not set")

    headers = {
        "Authorization": f"Bearer {key}",
        "HTTP-Referer": "https://github.com/u0401006/AI-Council",
        "X-Title": "MAV CLI",
    }
    payload = {"model": model, "messages": messages, "stream": True}

    async with httpx.AsyncClient(timeout=timeout) as client:
        async with client.stream("POST", OPENROUTER_URL, headers=headers, json=payload) as r:
            if r.status_code >= 400:
                body = await r.aread()
                raise OpenRouterError(f"HTTP {r.status_code}: {body.decode()[:300]}")
            async for line in r.aiter_lines():
                if not line or not line.startswith("data: "):
                    continue
                data = line[6:]
                if data.strip() == "[DONE]":
                    return
                try:
                    chunk = json.loads(data)
                except json.JSONDecodeError:
                    continue
                delta = chunk.get("choices", [{}])[0].get("delta", {}).get("content")
                if delta:
                    yield delta


async def complete_chat(
    model: str,
    messages: list[dict],
    *,
    api_key: str | None = None,
    timeout: float = 120.0,
) -> str:
    """Non-streaming version - collects deltas into a single string."""
    parts: list[str] = []
    async for delta in stream_chat(model, messages, api_key=api_key, timeout=timeout):
        parts.append(delta)
    return "".join(parts)
