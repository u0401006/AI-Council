"""Council model registry. OpenRouter model IDs."""
from dataclasses import dataclass


@dataclass(frozen=True)
class Model:
    id: str
    label: str


DEFAULT_COUNCIL: list[Model] = [
    Model("anthropic/claude-sonnet-4.5", "Claude Sonnet 4.5"),
    Model("openai/gpt-5.1", "GPT-5.1"),
    Model("google/gemini-3-pro-preview", "Gemini 3 Pro"),
]

DEFAULT_CHAIRMAN = Model("anthropic/claude-sonnet-4.5", "Claude Sonnet 4.5")


def resolve(model_id: str) -> Model:
    for m in DEFAULT_COUNCIL:
        if m.id == model_id:
            return m
    return Model(model_id, model_id.split("/")[-1])
