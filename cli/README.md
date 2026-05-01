# mav — Multi-AI Voting CLI

並行查詢多個 LLM、互評、主席綜合，全部在 terminal。AI-Council 的極簡命令列版。

## 安裝

```bash
cd cli
uv tool install .
```

需要 [OpenRouter](https://openrouter.ai/) API key。複製 `.env.example` 為 `.env` 並填入：

```bash
cp .env.example .env
# OPENROUTER_API_KEY=sk-or-v1-...
```

## 使用

```bash
# 基本：3 個預設模型並行回答
mav "為什麼天空是藍的？"

# 加互評
mav --review "解釋量子糾纏"

# 加主席綜合（指定主席）
mav --review --chairman openai/gpt-5.1 "比較 Rust 和 Go"

# 輸出 markdown
mav -o out.md "...你的問題..."

# 自訂模型清單
mav -m openai/gpt-5.1 -m anthropic/claude-sonnet-4.5 "..."
```

## 預設 council

| Slot | 模型 |
|------|------|
| Council 1 | `anthropic/claude-sonnet-4.5` |
| Council 2 | `openai/gpt-5.1` |
| Council 3 | `google/gemini-3-pro-preview` |
| Chairman | `anthropic/claude-sonnet-4.5` |

更多模型 ID 見 [OpenRouter models](https://openrouter.ai/models)。

## 開發

```bash
uv sync                # 裝開發依賴
uv run pytest          # 跑單元測試
uv run mav --help      # 不安裝直接執行
```

## 三階段流程

1. **並行查詢** — 多模型同時 stream，rich live 多欄輸出
2. **互評（可選 `--review`）** — 匿名 A/B/C，產出 JSON ranking
3. **主席綜合** — 指定模型彙整最終答案

## 限制

- 僅支援 OpenRouter（直接呼叫 provider 的版本未實作）
- 終端必須支援 ANSI（一般 terminal 都可）
- Stream 中斷沒有自動重試
