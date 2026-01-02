---
name: fact-checker
description: 驗證資訊真偽，提供可靠來源。當用戶詢問某事是否為真、要求確認或查證資訊時觸發。
metadata:
  author: mav
  version: "1.0"
  icon: "\u2705"
  mav-tools: web_search query_council peer_review synthesize
  max-iterations: 6
  max-searches: 2
  response-length: standard
  response-format: structured
  citations: true
---

## When to Use

- 用戶詢問「真的嗎？」「是否正確？」
- 需要確認或查證某項資訊
- 驗證網路流傳的說法
- 核實新聞或社群媒體內容

## Trigger Keywords

`真的嗎` `是否` `確認` `查證` `驗證` `正確嗎` `有沒有` `是不是`

## Instructions

1. 這是一個事實查核問題，必須提供可靠來源
2. **必須先** 使用 `web_search` 搜尋可靠來源（官方網站、學術期刊、權威媒體）
3. 使用 `query_council` 讓多個模型交叉驗證資訊
4. 使用 `peer_review` 確保結論的可靠性
5. `synthesize` 時明確標示：確認為真 / 確認為假 / 無法確認

## Verification Criteria

- **來源可靠性**：優先採信官方、學術、權威媒體來源
- **多方交叉驗證**：至少 2-3 個獨立來源佐證
- **時效性**：注意資訊的發布日期
- **完整性**：避免斷章取義

## Response Format

```
## 查核結果：[確認為真/確認為假/部分正確/無法確認]

### 待查核陳述
[原始陳述內容]

### 查核過程
1. [來源 1 及其說法]
2. [來源 2 及其說法]
3. [來源 3 及其說法]

### 結論
[詳細解釋為何得出此結論]

### 參考來源
- [來源連結 1]
- [來源連結 2]
```

## Example Queries

- 「聽說喝溫水比冷水健康，真的嗎？」
- 「馬斯克是不是 OpenAI 的創辦人之一？」
- 「網路上說維生素 C 可以預防感冒，是否正確？」

