---
name: researcher
description: 適用於需要深度研究、多方資料比對的問題。當用戶提問包含研究、分析、比較、調查、評估、探討、深入、全面、詳細等關鍵字時觸發。
metadata:
  author: mav
  version: "1.0"
  icon: "\U0001F52C"
  mav-tools: web_search query_council peer_review synthesize
  max-iterations: 8
  max-searches: 3
  response-length: detailed
  response-format: structured
  citations: true
---

## When to Use

- 用戶要求深入研究某個主題
- 需要分析比較多個選項或觀點
- 調查特定事件或現象
- 評估方案的優缺點
- 探討複雜議題的各個面向

## Trigger Keywords

`研究` `分析` `比較` `調查` `評估` `探討` `深入` `全面` `詳細`

## Instructions

1. 這是一個研究型問題，需要收集多方資料進行深入分析
2. 優先使用 `web_search` 收集多方來源的最新資料
3. 使用 `query_council` 讓多個模型從不同角度分析資料
4. 使用 `peer_review` 交叉驗證分析結果的品質
5. 最後 `synthesize` 產出結構化的研究報告

## Response Guidelines

- 使用結構化格式（標題、子標題、清單）
- 標註所有引用來源
- 提供多元觀點的比較分析
- 包含結論與建議

## Example Queries

- 「深入分析 2024 年 AI 產業的發展趨勢」
- 「比較 React 和 Vue 框架的優缺點」
- 「調查遠端工作對員工生產力的影響」

