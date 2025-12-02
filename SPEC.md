# MAV Extension - Multi-AI Voting Chrome Extension

## 概述

Chrome Extension 實作 LLM Council 概念：並行查詢多個 LLM，匿名互評，主席綜合產出最終答案。

## 核心功能

### 1. 多模型並行查詢
- 用戶輸入問題
- 同時發送至多個 LLM (透過 OpenRouter API)
- 串流顯示各模型回應

### 2. 匿名互評 (可選)
- 各模型匿名評估其他模型回應
- 產出排名與評語

### 3. 主席綜合
- 指定模型綜合所有回應
- 產出最終答案

---

## 技術規格

### Manifest V3

```json
{
  "manifest_version": 3,
  "name": "MAV - Multi-AI Voting",
  "version": "1.0.0",
  "permissions": ["storage", "sidePanel"],
  "host_permissions": ["https://openrouter.ai/*"],
  "background": {
    "service_worker": "background.js"
  },
  "side_panel": {
    "default_path": "sidepanel/index.html"
  },
  "options_page": "options/index.html",
  "action": {
    "default_icon": "icons/icon48.png",
    "default_title": "Open MAV Panel"
  }
}
```

### 目錄結構

```
mav-extension/
├── manifest.json
├── background.js              # Service Worker
├── sidepanel/
│   ├── index.html
│   ├── style.css
│   └── app.js
├── options/
│   ├── index.html
│   ├── style.css
│   └── options.js
├── lib/
│   ├── api.js                 # OpenRouter API 封裝
│   ├── council.js             # 三階段邏輯
│   └── storage.js             # chrome.storage 封裝
├── icons/
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
└── SPEC.md
```

---

## API 設計

### OpenRouter 呼叫格式

```javascript
// POST https://openrouter.ai/api/v1/chat/completions
{
  "model": "openai/gpt-4o",
  "messages": [
    { "role": "user", "content": "..." }
  ],
  "stream": true
}
```

### 內部訊息格式

```typescript
interface CouncilRequest {
  query: string;
  models: string[];           // 參與模型
  chairmanModel: string;      // 主席模型
  enableReview: boolean;      // 是否啟用互評
}

interface ModelResponse {
  model: string;
  content: string;
  latency: number;            // ms
  tokenCount?: number;
}

interface ReviewResult {
  reviewer: string;           // 匿名化
  rankings: {
    model: string;            // 匿名化 (Model A, B, C...)
    rank: number;
    reason: string;
  }[];
}

interface CouncilResult {
  responses: ModelResponse[];
  reviews?: ReviewResult[];
  finalAnswer: string;
  totalLatency: number;
}
```

---

## UI 規劃

### Side Panel 佈局

```
┌─────────────────────────────────┐
│  MAV - Multi-AI Voting          │
├─────────────────────────────────┤
│ ┌─────────────────────────────┐ │
│ │ [輸入框]                    │ │
│ │                             │ │
│ └─────────────────────────────┘ │
│ [Send] [⚙️ Settings]            │
├─────────────────────────────────┤
│ Stage 1: Responses              │
│ ┌───┬───┬───┬───┐               │
│ │GPT│Claude│Gemini│Grok│ (tabs) │
│ └───┴───┴───┴───┘               │
│ ┌─────────────────────────────┐ │
│ │ (streaming response)        │ │
│ │                             │ │
│ └─────────────────────────────┘ │
├─────────────────────────────────┤
│ Stage 2: Reviews [展開/收合]    │
│ 排名: 1. Model B  2. Model A... │
├─────────────────────────────────┤
│ Stage 3: Final Answer           │
│ ┌─────────────────────────────┐ │
│ │ (chairman synthesis)        │ │
│ └─────────────────────────────┘ │
└─────────────────────────────────┘
```

### Options 頁面

- OpenRouter API Key 輸入
- 模型選擇 (checkbox list)
- 主席模型選擇 (dropdown)
- 啟用/停用互評階段
- 對話歷史管理

---

## 流程細節

### Stage 1: 並行查詢

```javascript
async function stage1(query, models) {
  const promises = models.map(model => 
    callOpenRouter(model, query, { stream: true })
  );
  return Promise.all(promises);
}
```

### Stage 2: 匿名互評

```javascript
const reviewPrompt = `
你是一位公正的評審。以下是針對問題「${query}」的多個回答：

${responses.map((r, i) => `**Model ${String.fromCharCode(65+i)}:**\n${r.content}`).join('\n\n')}

請針對準確性和洞察力進行排名，說明理由。
輸出 JSON: { "rankings": [{ "model": "A", "rank": 1, "reason": "..." }, ...] }
`;
```

### Stage 3: 主席綜合

```javascript
const chairmanPrompt = `
你是 LLM Council 的主席。針對問題「${query}」，多位專家提供了以下回答：

${responses.map((r, i) => `**專家 ${i+1}:**\n${r.content}`).join('\n\n')}

評審意見摘要：${reviewSummary}

請綜合以上意見，產出一份完整、準確的最終答案。
`;
```

---

## 儲存結構

```javascript
// chrome.storage.sync (跨裝置同步)
{
  "apiKey": "sk-or-v1-...",
  "councilModels": ["openai/gpt-4o", "anthropic/claude-sonnet-4", ...],
  "chairmanModel": "anthropic/claude-sonnet-4",
  "enableReview": true
}

// chrome.storage.local (本地)
{
  "conversations": [
    {
      "id": "uuid",
      "timestamp": 1700000000000,
      "query": "...",
      "result": { /* CouncilResult */ }
    }
  ]
}
```

---

## 預設模型配置

```javascript
const DEFAULT_MODELS = [
  "openai/gpt-4o",
  "anthropic/claude-sonnet-4",
  "google/gemini-2.0-flash",
  "x-ai/grok-3"
];

const DEFAULT_CHAIRMAN = "anthropic/claude-sonnet-4";
```

---

## 開發階段

### Phase 1: MVP
- [ ] 基礎 extension 架構
- [ ] Options 頁面 (API Key 設定)
- [ ] Side Panel UI
- [ ] 單模型查詢測試

### Phase 2: Core
- [ ] 多模型並行查詢
- [ ] 串流回應顯示
- [ ] Tab 切換檢視

### Phase 3: Council
- [ ] Stage 2 互評邏輯
- [ ] Stage 3 主席綜合
- [ ] 完整流程串接

### Phase 4: Polish
- [ ] 對話歷史
- [ ] 錯誤處理
- [ ] UI 優化
- [ ] 匯出功能

---

## 風險與限制

| 項目 | 說明 | 緩解方案 |
|------|------|---------|
| Service Worker 30s 限制 | 長時間 API 呼叫可能中斷 | 使用 `chrome.runtime.connect` 保持連線 |
| API 費用 | 每次查詢呼叫多個模型 | 顯示預估費用、設定模型數量上限 |
| 串流處理 | SSE 在 extension 中的處理 | 使用 fetch + ReadableStream |
| Rate Limiting | OpenRouter 有請求限制 | 實作 retry with backoff |

---

## 參考

- [Karpathy LLM Council](https://github.com/karpathy/llm-council)
- [OpenRouter API Docs](https://openrouter.ai/docs)
- [Chrome Extension Manifest V3](https://developer.chrome.com/docs/extensions/mv3/)





