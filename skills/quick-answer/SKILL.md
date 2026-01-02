---
name: quick-answer
description: 適用於簡單直接的問題，快速給出答案。當問題長度小於 50 字且不包含複雜分析關鍵字時觸發。
metadata:
  author: mav
  version: "1.0"
  icon: "\u26A1"
  mav-tools: query_council synthesize
  max-iterations: 3
  response-length: concise
  response-format: text
  citations: false
---

## When to Use

- 簡短的問題（少於 50 字）
- 不需要深入分析的事實查詢
- 定義解釋類問題
- 不包含「為什麼」「如何」「分析」「比較」等複雜關鍵字

## Instructions

1. 這是一個簡單問題，快速回答即可
2. 直接使用 `query_council` 獲取回答
3. 跳過 `peer_review`（簡單問題不需要互評）
4. 快速 `synthesize` 產出簡潔答案
5. 控制迭代次數在 3 次以內

## Response Guidelines

- 簡潔扼要，避免冗長
- 直接回答問題核心
- 不需要結構化格式
- 不需要引用來源

## Example Queries

- 「台灣的首都是哪裡？」
- 「什麼是 API？」
- 「今天星期幾？」
- 「Python 是誰發明的？」

