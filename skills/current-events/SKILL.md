---
name: current-events
description: 適用於新聞、時事、即時資訊查詢。當用戶詢問最新、現在、今天、最近的事件或新聞時觸發。
metadata:
  author: mav
  version: "1.0"
  icon: "\U0001F4F0"
  mav-tools: web_search query_council synthesize
  max-iterations: 5
  max-searches: 2
  response-length: standard
  response-format: mixed
  citations: true
---

## When to Use

- 查詢最新新聞或時事
- 詢問近期發生的事件
- 需要即時資訊（股價、天氣、賽事結果等）
- 追蹤特定議題的最新發展

## Trigger Keywords

`最新` `現在` `今天` `昨天` `最近` `新聞` `時事` `目前` `當前`

## Instructions

1. 這是一個時事問題，需要最新資訊
2. **必須先** 使用 `web_search` 獲取最新資訊
3. 使用 `query_council` 分析整理搜尋結果
4. **不需要** `peer_review`（新聞重時效，非深度分析）
5. `synthesize` 時標註資訊來源和時間

## Freshness Guidelines

- 使用 `freshness: 'pd'`（過去一天）查詢即時資訊
- 使用 `freshness: 'pw'`（過去一週）查詢近期新聞
- 注意資訊的發布時間，優先採用最新來源

## Response Format

```
## [主題] 最新動態

### 重點摘要
- [要點 1]
- [要點 2]
- [要點 3]

### 詳細內容
[整理後的詳細說明]

### 時間軸（如適用）
- [時間 1]：[事件]
- [時間 2]：[事件]

### 來源
- [來源 1]（[發布時間]）
- [來源 2]（[發布時間]）

*資訊更新時間：[查詢時間]*
```

## Example Queries

- 「今天有什麼重要新聞？」
- 「最近 AI 產業有什麼新發展？」
- 「現在台積電的股價多少？」
- 「昨天的世界杯比賽結果？」

