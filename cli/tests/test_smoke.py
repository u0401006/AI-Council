"""Smoke tests: parser logic + mocked HTTP for end-to-end shape.

Real network calls live in tests/test_e2e.py (manual, requires API key).
"""
from __future__ import annotations

import asyncio

import httpx
import pytest
import respx

from mav.council import (
    _parse_ranking,
    chairman_synthesize,
    peer_review,
    query_parallel,
)
from mav.models import DEFAULT_COUNCIL, Model
from mav.prompts import build_chairman_prompt, build_review_prompt
from mav.stream import OPENROUTER_URL


# ---------------------------------------------------------------------------
# Pure-logic tests (no network)
# ---------------------------------------------------------------------------


def test_parse_ranking_fenced_json():
    text = """Some preamble.
```json
{"rankings": [
  {"response": "B", "rank": 1, "reason": "good"},
  {"response": "A", "rank": 2, "reason": "ok"}
]}
```
"""
    assert _parse_ranking(text) == ["B", "A"]


def test_parse_ranking_bare_json():
    text = '{"rankings":[{"response":"C","rank":1},{"response":"A","rank":2},{"response":"B","rank":3}]}'
    assert _parse_ranking(text) == ["C", "A", "B"]


def test_parse_ranking_garbage():
    assert _parse_ranking("no json at all") == []
    assert _parse_ranking("") == []


def test_parse_ranking_handles_disordered_ranks():
    text = '{"rankings":[{"response":"A","rank":3},{"response":"B","rank":1},{"response":"C","rank":2}]}'
    assert _parse_ranking(text) == ["B", "C", "A"]


def test_build_review_prompt_includes_query_and_labels():
    p = build_review_prompt("why is sky blue?", [("A", "rayleigh"), ("B", "scattering")])
    assert "why is sky blue?" in p
    assert "Response A" in p and "Response B" in p
    assert "rayleigh" in p and "scattering" in p


def test_build_chairman_prompt_with_ranking():
    p = build_chairman_prompt(
        "test query",
        [("M1", "answer one"), ("M2", "answer two")],
        ranking=["M2", "M1"],
    )
    assert "test query" in p
    assert "M1" in p and "M2" in p
    assert "Peer Review Ranking" in p


def test_build_chairman_prompt_no_ranking_omits_section():
    p = build_chairman_prompt("q", [("M1", "a")], ranking=None)
    assert "Peer Review Ranking" not in p


# ---------------------------------------------------------------------------
# Mocked HTTP tests (respx intercepts httpx)
# ---------------------------------------------------------------------------


def _sse_response(deltas: list[str]) -> str:
    parts = []
    for d in deltas:
        parts.append(
            'data: {"choices":[{"delta":{"content":' + repr(d).replace("'", '"') + '}}]}\n\n'
        )
    parts.append("data: [DONE]\n\n")
    return "".join(parts)


@pytest.mark.asyncio
async def test_query_parallel_streams_and_aggregates(monkeypatch):
    monkeypatch.setenv("OPENROUTER_API_KEY", "test-key")
    council = DEFAULT_COUNCIL[:2]

    with respx.mock:
        respx.post(OPENROUTER_URL).mock(
            return_value=httpx.Response(
                200,
                headers={"content-type": "text/event-stream"},
                content=_sse_response(["hello ", "world"]),
            )
        )

        events = []
        responses = None
        async for item in query_parallel("ping?", council):
            if isinstance(item, list):
                responses = item
            else:
                events.append(item)

        assert responses is not None
        assert len(responses) == 2
        # Both models should produce "hello world"
        for r in responses:
            assert r.error is None
            assert r.text == "hello world"
        # Streaming events should include deltas + done flags
        delta_events = [e for e in events if e.delta]
        done_events = [e for e in events if e.done]
        assert len(delta_events) >= 4  # 2 deltas * 2 models
        assert len(done_events) == 2


@pytest.mark.asyncio
async def test_query_parallel_isolates_per_model_failure(monkeypatch):
    monkeypatch.setenv("OPENROUTER_API_KEY", "test-key")
    council = [
        Model("openai/gpt-5.1", "GPT-5.1"),
        Model("anthropic/claude-sonnet-4.5", "Claude"),
    ]

    def _route(request: httpx.Request):
        body = request.read().decode()
        if "gpt-5.1" in body:
            return httpx.Response(500, text="server error")
        return httpx.Response(
            200,
            headers={"content-type": "text/event-stream"},
            content=_sse_response(["ok"]),
        )

    with respx.mock:
        respx.post(OPENROUTER_URL).mock(side_effect=_route)

        responses = None
        async for item in query_parallel("hi", council):
            if isinstance(item, list):
                responses = item

        assert responses is not None
        by_id = {r.model.id: r for r in responses}
        assert by_id["openai/gpt-5.1"].error is not None
        assert by_id["anthropic/claude-sonnet-4.5"].error is None
        assert by_id["anthropic/claude-sonnet-4.5"].text == "ok"


@pytest.mark.asyncio
async def test_chairman_synthesize_streams(monkeypatch):
    monkeypatch.setenv("OPENROUTER_API_KEY", "test-key")
    from mav.council import ModelResponse

    chairman_model = Model("anthropic/claude-sonnet-4.5", "Claude")
    responses = [
        ModelResponse(model=Model("openai/gpt-5.1", "GPT"), text="answer one"),
        ModelResponse(model=Model("google/gemini-3-pro-preview", "Gemini"), text="answer two"),
    ]

    with respx.mock:
        respx.post(OPENROUTER_URL).mock(
            return_value=httpx.Response(
                200,
                headers={"content-type": "text/event-stream"},
                content=_sse_response(["final ", "synthesis"]),
            )
        )
        deltas = []
        async for d in chairman_synthesize("q", responses, chairman_model):
            deltas.append(d)
        assert "".join(deltas) == "final synthesis"


@pytest.mark.asyncio
async def test_peer_review_aggregates_rankings(monkeypatch):
    monkeypatch.setenv("OPENROUTER_API_KEY", "test-key")
    from mav.council import ModelResponse

    m1 = Model("openai/gpt-5.1", "GPT")
    m2 = Model("anthropic/claude-sonnet-4.5", "Claude")
    m3 = Model("google/gemini-3-pro-preview", "Gemini")

    responses = [
        ModelResponse(model=m1, text="text one"),
        ModelResponse(model=m2, text="text two"),
        ModelResponse(model=m3, text="text three"),
    ]

    # Each reviewer ranks the OTHER two as A, B
    # Reviewer m1 sees (m2 as A, m3 as B) -> say A wins (m2 first)
    # Reviewer m2 sees (m1 as A, m3 as B) -> say B wins (m3 first)
    # Reviewer m3 sees (m1 as A, m2 as B) -> say A wins (m1 first)
    review_payload = (
        'data: {"choices":[{"delta":{"content":'
        '"```json\\n{\\"rankings\\":[{\\"response\\":\\"A\\",\\"rank\\":1},{\\"response\\":\\"B\\",\\"rank\\":2}]}\\n```"}}]}\n\n'
        "data: [DONE]\n\n"
    )

    with respx.mock:
        respx.post(OPENROUTER_URL).mock(
            return_value=httpx.Response(
                200,
                headers={"content-type": "text/event-stream"},
                content=review_payload,
            )
        )

        reviews, ranking = await peer_review("q", responses)
        # All 3 models reviewed
        assert len(reviews) == 3
        # Ranking should be a list of Models, length up to 3
        assert all(hasattr(m, "id") for m in ranking)
        assert len(ranking) >= 2
