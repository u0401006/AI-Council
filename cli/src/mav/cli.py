"""mav CLI entrypoint."""
from __future__ import annotations

import asyncio
import os
import sys
from pathlib import Path

import click
from dotenv import load_dotenv
from rich.console import Console
from rich.markdown import Markdown
from rich.panel import Panel
from rich.rule import Rule

from .council import (
    chairman_synthesize,
    peer_review,
    query_parallel,
)
from .models import DEFAULT_CHAIRMAN, DEFAULT_COUNCIL, resolve
from .render import stream_to_console


def _load_env() -> None:
    """Load .env from cwd or repo root if present."""
    for candidate in (Path.cwd() / ".env", Path(__file__).parent.parent.parent / ".env"):
        if candidate.exists():
            load_dotenv(candidate)
            break


async def _run(
    question: str,
    council_ids: list[str],
    chairman_id: str,
    enable_review: bool,
    output_path: Path | None,
) -> int:
    console = Console()
    council = [resolve(mid) for mid in council_ids] if council_ids else DEFAULT_COUNCIL
    chairman = resolve(chairman_id) if chairman_id else DEFAULT_CHAIRMAN

    console.print(Rule("[bold]Stage 1: Council 並行查詢[/bold]"))
    responses = await stream_to_console(council, query_parallel(question, council), console)

    failed = [r for r in responses if r.error]
    if failed:
        for r in failed:
            console.print(f"[red]✗ {r.model.label}: {r.error}[/red]")
    valid = [r for r in responses if not r.error and r.text.strip()]
    if not valid:
        console.print("[red]All council members failed. Aborting.[/red]")
        return 2

    ranking = None
    if enable_review and len(valid) >= 2:
        console.print(Rule("[bold]Stage 2: 互評[/bold]"))
        with console.status("[cyan]互評中...[/cyan]", spinner="dots"):
            reviews, ranking = await peer_review(question, valid)
        console.print("[bold]Aggregated ranking:[/bold]")
        for i, m in enumerate(ranking, 1):
            console.print(f"  {i}. {m.label}")

    console.print(Rule(f"[bold]Stage 3: 主席綜合 ({chairman.label})[/bold]"))
    chairman_text = ""
    final_panel_buffer: list[str] = []

    async def _accumulate():
        nonlocal chairman_text
        async for delta in chairman_synthesize(question, valid, chairman, ranking):
            chairman_text += delta
            final_panel_buffer.append(delta)
            console.print(delta, end="")
        console.print()

    await _accumulate()

    if output_path:
        md = _format_markdown(question, valid, ranking, chairman, chairman_text)
        output_path.write_text(md, encoding="utf-8")
        console.print(f"\n[green]✓ Saved to {output_path}[/green]")

    return 0


def _format_markdown(question, valid, ranking, chairman, chairman_text) -> str:
    lines = [f"# {question}\n"]
    lines.append("## Council Responses\n")
    for r in valid:
        lines.append(f"### {r.model.label}\n\n{r.text}\n")
    if ranking:
        lines.append("## Peer Review Ranking\n")
        for i, m in enumerate(ranking, 1):
            lines.append(f"{i}. {m.label}")
        lines.append("")
    lines.append(f"## Chairman Synthesis ({chairman.label})\n\n{chairman_text}\n")
    return "\n".join(lines)


@click.command()
@click.argument("question", nargs=-1, required=True)
@click.option(
    "-m",
    "--model",
    "models",
    multiple=True,
    help="Council model ID (repeat for multiple). Default: 3-model preset.",
)
@click.option(
    "--chairman",
    "chairman_id",
    default="",
    help="Chairman model ID. Default: anthropic/claude-sonnet-4.5",
)
@click.option(
    "--review/--no-review",
    "enable_review",
    default=False,
    help="Enable peer review stage (default: off)",
)
@click.option(
    "-o",
    "--output",
    "output",
    type=click.Path(dir_okay=False, path_type=Path),
    default=None,
    help="Save full markdown report to file",
)
def main(
    question: tuple[str, ...],
    models: tuple[str, ...],
    chairman_id: str,
    enable_review: bool,
    output: Path | None,
) -> None:
    """Multi-AI Voting CLI - parallel queries to multiple LLMs.

    Example:
      mav "為什麼天空是藍的？"
      mav --review --chairman openai/gpt-5.1 -o out.md "explain quantum entanglement"
    """
    _load_env()
    if not os.environ.get("OPENROUTER_API_KEY"):
        click.echo(
            "Error: OPENROUTER_API_KEY not set. Create a .env file or export the var.",
            err=True,
        )
        sys.exit(1)

    q = " ".join(question).strip()
    if not q:
        click.echo("Error: empty question", err=True)
        sys.exit(1)

    rc = asyncio.run(_run(q, list(models), chairman_id, enable_review, output))
    sys.exit(rc)


if __name__ == "__main__":
    main()
