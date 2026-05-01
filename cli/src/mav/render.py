"""Terminal rendering for parallel council output via rich.live."""
from __future__ import annotations

from rich.columns import Columns
from rich.console import Console
from rich.live import Live
from rich.panel import Panel
from rich.text import Text

from .council import ModelResponse, StreamEvent
from .models import Model

PANEL_COLORS = ["cyan", "magenta", "green", "yellow", "blue"]


def _panel_for(model: Model, text: str, color: str, error: str | None = None) -> Panel:
    title = f"[bold {color}]{model.label}[/bold {color}]"
    body: Text
    if error:
        body = Text(f"[error] {error}", style="red")
    else:
        body = Text(text or "…")
    return Panel(body, title=title, border_style=color, padding=(0, 1))


def render_parallel(council: list[Model], events: list[StreamEvent], console: Console) -> None:
    """Render parallel responses as live-updating columns."""
    buffers: dict[str, str] = {m.id: "" for m in council}
    errors: dict[str, str | None] = {m.id: None for m in council}
    colors: dict[str, str] = {
        m.id: PANEL_COLORS[i % len(PANEL_COLORS)] for i, m in enumerate(council)
    }

    def _columns() -> Columns:
        return Columns(
            [
                _panel_for(m, buffers[m.id], colors[m.id], errors[m.id])
                for m in council
            ],
            equal=True,
            expand=True,
        )

    with Live(_columns(), console=console, refresh_per_second=12) as live:
        for ev in events:
            if ev.delta:
                buffers[ev.model.id] += ev.delta
            if ev.error:
                errors[ev.model.id] = ev.error
            live.update(_columns())


async def stream_to_console(
    council: list[Model],
    aiter,
    console: Console,
) -> list[ModelResponse]:
    """Async-driven version: consume events from query_parallel directly."""
    buffers: dict[str, str] = {m.id: "" for m in council}
    errors: dict[str, str | None] = {m.id: None for m in council}
    colors: dict[str, str] = {
        m.id: PANEL_COLORS[i % len(PANEL_COLORS)] for i, m in enumerate(council)
    }

    def _columns() -> Columns:
        return Columns(
            [
                _panel_for(m, buffers[m.id], colors[m.id], errors[m.id])
                for m in council
            ],
            equal=True,
            expand=True,
        )

    final: list[ModelResponse] = []
    with Live(_columns(), console=console, refresh_per_second=12) as live:
        async for item in aiter:
            if isinstance(item, list):
                final = item
                break
            if item.delta:
                buffers[item.model.id] += item.delta
            if item.error:
                errors[item.model.id] = item.error
            live.update(_columns())
        live.update(_columns())
    return final
