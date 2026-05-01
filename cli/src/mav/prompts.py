"""Prompt templates for peer review and chairman synthesis."""

REVIEW_PROMPT = """You are an impartial evaluator. Rank the following responses to a question based on accuracy, completeness, clarity, and helpfulness.

Respond in Traditional Chinese (繁體中文).

## Original Question
{query}

## Responses to Evaluate
{responses}

## Evaluation Criteria
1. Factual accuracy
2. Completeness of the answer
3. Clarity and organization
4. Practical helpfulness

## Your Task
Rank these responses from best to worst. Output ONLY this exact JSON format, no other text:
```json
{{
  "rankings": [
    {{"response": "A", "rank": 1, "reason": "簡短理由"}},
    {{"response": "B", "rank": 2, "reason": "簡短理由"}}
  ]
}}
```

Be objective. Focus on response quality."""


CHAIRMAN_PROMPT = """You are the Chairman of an AI Council. Synthesize the expert responses into a single, optimal final answer.

Respond in Traditional Chinese (繁體中文).

## Original Question
{query}

## Expert Responses
{responses}

{ranking}

## Your Task
Create the best possible answer by:
1. Combining the most accurate and useful insights from each expert
2. Resolving contradictions by favoring well-supported claims
3. Filling gaps that any single expert missed
4. Presenting clearly with structure when appropriate

Output the final answer directly. Do not narrate the synthesis process."""


def build_review_prompt(query: str, responses_with_labels: list[tuple[str, str]]) -> str:
    """responses_with_labels: list of (label, content) tuples, e.g. [("A", "..."), ("B", "...")]"""
    responses_text = "\n\n---\n\n".join(
        f"### Response {label}\n{content}" for label, content in responses_with_labels
    )
    return REVIEW_PROMPT.format(query=query, responses=responses_text)


def build_chairman_prompt(
    query: str,
    responses: list[tuple[str, str]],
    ranking: list[str] | None = None,
) -> str:
    """responses: list of (model_label, content). ranking: ordered list of model labels."""
    responses_text = "\n\n---\n\n".join(
        f"### Expert {i + 1} ({label})\n{content}"
        for i, (label, content) in enumerate(responses)
    )
    ranking_section = ""
    if ranking:
        ranking_section = (
            "## Peer Review Ranking\n"
            + "Based on peer evaluation: "
            + ", ".join(f"{i + 1}. {m}" for i, m in enumerate(ranking))
        )
    return CHAIRMAN_PROMPT.format(
        query=query, responses=responses_text, ranking=ranking_section
    )
