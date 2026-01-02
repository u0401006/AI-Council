---
name: technical
description: 適用於程式碼、技術問題、除錯。當用戶提問涉及程式、API、函數、實作、bug 等技術關鍵字時觸發。
metadata:
  author: mav
  version: "1.0"
  icon: "\U0001F4BB"
  mav-tools: query_council peer_review web_search synthesize
  max-iterations: 6
  response-length: detailed
  response-format: structured
  citations: true
---

## When to Use

- 程式碼相關問題
- API 使用或整合
- 技術架構設計
- 除錯（Debug）
- 技術實作方案

## Trigger Keywords

`程式` `code` `coding` `bug` `錯誤` `API` `函數` `function` `實作` `implement`

## Instructions

1. 這是一個技術問題，需要精確且可執行的解答
2. 使用 `query_council` 獲取多個模型的解決方案
3. 使用 `peer_review` 評估程式碼品質和正確性
4. 如需查詢最新文件或 API 規格，使用 `web_search`
5. `synthesize` 時提供完整可執行的程式碼

## Code Quality Checklist

- **正確性**：程式碼能正確執行
- **可讀性**：有適當的註解和命名
- **效能**：考慮時間和空間複雜度
- **安全性**：避免常見安全漏洞
- **最佳實踐**：遵循該語言/框架的慣例

## Response Format

```
## 問題分析
[簡述問題核心]

## 解決方案

### 方案 1：[方案名稱]
\`\`\`[language]
// 程式碼
\`\`\`

**說明**：[方案說明]
**優點**：[優點]
**缺點**：[缺點]

### 方案 2（可選）
...

## 注意事項
- [需要注意的陷阱或邊界情況]

## 參考資源
- [官方文件連結]
- [相關教學]
```

## Example Queries

- 「如何用 Python 讀取 JSON 檔案？」
- 「React useEffect 的 dependency array 怎麼用？」
- 「這段程式碼為什麼會有 memory leak？」
- 「幫我實作一個二分搜尋演算法」

