# MAV Extension - Multi-AI Voting Chrome Extension

## 概述

Chrome Extension 實作 LLM Council 概念：並行查詢多個 LLM，匿名互評，主席綜合產出最終答案。

**開源版本**：用戶自行提供 OpenRouter API Key 和 Brave Search API Key（可選）。

## 核心功能

### 1. 多模型並行查詢 ✅
- 用戶輸入問題
- 同時發送至多個 LLM (透過 OpenRouter API)
- 串流顯示各模型回應

### 2. 匿名互評 (可選) ✅
- 各模型匿名評估其他模型回應
- 產出排名與評語

### 3. 主席綜合 ✅
- 指定模型綜合所有回應
- 產出最終答案

---

## 技術規格

### Manifest V3

```json
{
  "manifest_version": 3,
  "name": "MAV - 多模型 AI 投票",
  "version": "1.0.2",
  "permissions": ["storage", "sidePanel", "activeTab", "scripting", "contextMenus"],
  "host_permissions": [
    "https://openrouter.ai/*",
    "https://api.search.brave.com/*",
    "<all_urls>"
  ],
  "background": {
    "service_worker": "background.js",
    "type": "module"
  },
  "side_panel": {
    "default_path": "sidepanel/index.html"
  }
}
```

### 目錄結構

```
mav-extension/
├── manifest.json              # Manifest V3 配置
├── background.js              # Service Worker
├── sidepanel/
│   ├── index.html
│   ├── style.css
│   └── app.js                 # 主應用邏輯（含 Council、Markdown、Models 等）
├── options/
│   ├── index.html
│   ├── style.css
│   └── options.js
├── canvas/                    # 畫布編輯器
│   ├── index.html
│   ├── style.css
│   └── canvas.js
├── content/                   # 內容腳本
│   └── content.js
├── icons/
│   ├── icon.svg
│   ├── icon32.png
│   ├── icon64.png
│   └── icon128.png
├── .gitignore
├── LICENSE                    # MIT License
├── README.md
├── CLAUDE.md                  # Claude 開發指南
└── SPEC.md                    # 本文件
```

---

## 支援模型

| 模型 | Provider | Vision | Image Gen |
|------|----------|--------|-----------|
| GPT-5.1 | OpenAI | ✓ | |
| GPT-4o | OpenAI | ✓ | |
| GPT-4o Mini | OpenAI | ✓ | |
| Claude Sonnet 4.5 | Anthropic | ✓ | |
| Claude Sonnet 4 | Anthropic | ✓ | |
| Claude 3.5 Sonnet | Anthropic | ✓ | |
| Gemini 3 Pro | Google | ✓ | |
| Gemini 3 Pro Image | Google | ✓ | ✓ |
| Gemini 2.5 Flash | Google | ✓ | |
| Gemini 2.5 Flash Image | Google | ✓ | ✓ |
| Gemini 2.0 Flash | Google | ✓ | |
| Gemini 1.5 Pro | Google | ✓ | |
| Grok 3 | xAI | ✓ | |
| Llama 3.1 405B | Meta | | |
| DeepSeek R1 | DeepSeek | | |
| Mistral Large | Mistral | | |

---

## API 設計

### OpenRouter 呼叫格式

```javascript
// POST https://openrouter.ai/api/v1/chat/completions
{
  "model": "openai/gpt-4o",
  "messages": [
    { "role": "system", "content": "繁體中文 + 簡潔回答" },
    { "role": "user", "content": "..." }
  ],
  "stream": true,
  "max_tokens": 2000
}
```

### 圖片生成 (Gemini)

```javascript
{
  "model": "google/gemini-3-pro-image-preview",
  "messages": [...],
  "modalities": ["text", "image"],
  "image_config": { "width": 1024, "height": 1024 }
}
```

### 內部訊息格式

```javascript
// CouncilRequest
{
  query: string,              // 用戶問題
  models: string[],           // 參與模型
  chairmanModel: string,      // 主席模型
  enableReview: boolean       // 是否啟用互評
}

// ModelResponse
{
  model: string,
  content: string,
  latency: number,            // ms
  tokenCount: number          // optional
}

// ReviewResult
{
  reviewer: string,           // 匿名化
  rankings: [{
    model: string,            // 匿名化 (Model A, B, C...)
    rank: number,
    reason: string
  }]
}

// CouncilResult
{
  responses: ModelResponse[],
  reviews: ReviewResult[],    // optional
  finalAnswer: string,
  totalLatency: number
}
```

---

## 功能模組

### Context System ✅
- 右鍵選單「加入 MAV Context」
- 擷取目前頁面內容
- 擷取選取文字
- 從剪貼簿貼上
- Badge 顯示 context 數量

### Web Search ✅
- Brave Search API 整合
- 搜尋結果自動加入 context
- AI 延伸搜尋迭代模式
- **需要 Brave API Key**（無 key 時網搜功能禁用）

### Canvas ✅
- 獨立畫布編輯器
- 支援分頁或獨立視窗開啟
- Markdown 編輯與預覽

### Image Generation ✅
- Gemini image models 支援
- Lightbox 預覽
- 支援下載

### Vision Mode ✅
- 支援圖片輸入分析
- 拖曳或貼上圖片至輸入區
- 支援 `canVision: true` 的模型（GPT-4o, Claude, Gemini 等）
- 自動轉換為 base64 傳送

### Output Style ✅
- **輸出長度**：簡潔 / 標準 / 詳盡
- **輸出格式**：純文字 / 混合 / 結構化
- 設定於 Options 頁面

---

## API Key 驗證

### OpenRouter API Key（必要）
- 無 key 時無法使用任何功能
- 送出時顯示錯誤提示

### Brave Search API Key（可選）
- 無 key 時：
  - Council 功能正常
  - 網搜 toggle 禁用
  - 延伸搜尋按鈕禁用
  - Context 區網搜按鈕禁用

---

## UI 規劃

### Side Panel 佈局

```
┌─────────────────────────────────┐
│ MAV          [新對話][歷史][設定]│
├─────────────────────────────────┤
│ [Context Section]               │
│  參考 (N) ▼                     │
│  ┌─ 擷取頁面 / 選取 / 網搜 ─┐   │
│  │ [context items...]       │   │
│  └─────────────────────────┘   │
├─────────────────────────────────┤
│ [輸入框]                        │
│ [🖼️] [🔍] 3 個模型      [送出] │
├─────────────────────────────────┤
│ [Stepper: ① 回應 ② 審查 ③ 彙整]│
├─────────────────────────────────┤
│ 階段 1: 模型回應                │
│ ┌───┬───┬───┬───┐              │
│ │GPT│Claude│Gemini│Grok│ tabs  │
│ └───┴───┴───┴───┘              │
│ (streaming response)            │
├─────────────────────────────────┤
│ 階段 2: 互評審查 [展開/收合]    │
│ 排名: 1. Model B  2. Model A... │
├─────────────────────────────────┤
│ 階段 3: 最終答案                │
│ (chairman synthesis)            │
├─────────────────────────────────┤
│ [延伸搜尋] [生成圖片] [開啟畫布]│
└─────────────────────────────────┘
```

### Options 頁面 ✅

- OpenRouter API Key（必要）
- Brave Search API Key（可選）
- 模型選擇 (checkbox list，顯示 VIS/IMG 標記)
- 主席模型選擇 (dropdown)
- 啟用/停用互評階段
- 延伸搜尋最大迭代次數
- 輸出風格設定（長度、格式）
- 自訂提示詞範本

---

## 儲存結構

```javascript
// chrome.storage.sync (跨裝置同步)
{
  "apiKey": "sk-or-v1-...",           // OpenRouter API Key
  "braveApiKey": "BSA...",            // Brave Search API Key (optional)
  "councilModels": ["openai/gpt-4o", "anthropic/claude-sonnet-4", ...],
  "chairmanModel": "anthropic/claude-sonnet-4",
  "enableReview": true,
  "maxSearchIterations": 5,           // 延伸搜尋最大迭代次數
  "reviewPrompt": "...",
  "chairmanPrompt": "...",
  "outputLength": "standard",         // concise | standard | detailed
  "outputFormat": "mixed"             // text | mixed | structured
}

// chrome.storage.local (本地)
{
  "conversations": [...],
  "contextItems": [...],
  "canvasImport": { content, title }
}
```

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
- [Brave Search API](https://brave.com/search/api/)
