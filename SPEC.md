# AI Council 產品規格書

> 版本：2.3
> 更新日期：2026-01-14
> 狀態：Chrome Extension 已上線，React Native iOS 規劃中

---

## 目錄

1. [目的](#1-目的)
2. [使用情境](#2-使用情境)
3. [技術棧（現況）](#3-技術棧現況)
4. [Agent Planner 框架](#4-agent-planner-框架)
5. [Skills 系統](#5-skills-系統)
6. [Lifecycle Hooks 系統](#6-lifecycle-hooks-系統)
7. [Multi-Agent Orchestration](#7-multi-agent-orchestration)
8. [多語言支援](#8-多語言支援)
9. [圖片生成系統規格](#9-圖片生成系統規格)
10. [React Native iOS 移轉技術細節](#10-react-native-ios-移轉技術細節)
11. [移轉需補足項目](#11-移轉需補足項目)
12. [相關文件索引](#12-相關文件索引)
13. [使用手冊](#13-使用手冊)

---

## 1. 目的

### 1.1 核心概念

AI Council 實作 **LLM Council**（多模型智囊團）概念，靈感來自 [Karpathy's LLM Council](https://github.com/karpathy/llm-council)。

核心理念：**單一 AI 模型可能有偏見或盲點，透過多模型協作可獲得更全面、可靠的答案。**

### 1.2 運作流程

```
用戶問題
    │
    ▼
┌─────────────────────────────────────────────┐
│  Stage 1: 並行查詢                           │
│  GPT-5.1 │ Claude 4.5 │ Gemini 3 │ Grok 3   │
│     ↓          ↓           ↓          ↓     │
│   回答 A     回答 B      回答 C     回答 D   │
└─────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────┐
│  Stage 2: 匿名互評（可選）                   │
│  各模型評估其他模型的回答（不含自己）         │
│  輸出：排名 + 評語                           │
└─────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────┐
│  Stage 3: 主席綜合                           │
│  指定模型（主席）綜合所有回答與互評結果       │
│  輸出：最終權威答案                          │
└─────────────────────────────────────────────┘
```

### 1.3 價值主張

| 優勢 | 說明 |
|------|------|
| **多元視角** | 不同模型有不同訓練資料與推理風格 |
| **品質篩選** | 互評機制自動識別高品質回答 |
| **降低幻覺** | 多模型交叉驗證減少單一模型胡說 |
| **透明度** | 用戶可查看各模型原始回答 |

### 1.4 開源版本定位

- 用戶自行提供 **OpenRouter API Key**（必要）
- 用戶自行提供 **Brave Search API Key**（可選，啟用網搜功能）
- 無後端伺服器，所有 API 呼叫從客戶端直接發出
- 資料存於本地（chrome.storage），不上傳任何用戶資料

---

## 2. 使用情境

### 2.1 一般使用者

**場景**：日常問答、資料查詢、決策輔助

- 輸入問題，獲得 4+ 個 AI 模型的回答
- 查看互評排名，了解哪個回答最佳
- 閱讀主席綜合的最終答案

**範例**：
> 「2024 年最適合新手的程式語言是什麼？」
> → 4 個模型各自推薦 → 互評排名 → 主席綜合出平衡觀點

### 2.2 研究者 / 開發者

**場景**：比較模型表現、Prompt 工程測試

- 觀察不同模型對同一問題的回答差異
- 分析互評結果，了解模型偏好
- 調整 Council 提示詞，優化輸出品質

**範例**：
> 測試「解釋量子糾纏」，比較 Claude 與 GPT 的解釋風格差異

### 2.3 學習者（Learner Mode）

**場景**：探索式學習、蘇格拉底教學法

AI Council 提供 **學習者模式**，依年齡層調整回答策略：

| 年齡層 | 策略 | 特色 |
|--------|------|------|
| 9-10 歲 | 70% 揭露 | 簡單詞彙、生活例子、發現式引導 |
| 11-12 歲 | 50% 揭露 | 給線索推導、連結已知 |
| 13-15 歲 | 框架為主 | 方法論引導、批判分析 |
| 16-18 歲 | 多元觀點 | 學術深度、自主研究 |

**核心原則**：
- 不直接給答案，留給探索任務
- 生成「探索」「驗證」「應用」「連結」四類任務
- 引導學習者自主思考

### 2.4 內容創作者

**場景**：文案撰寫、內容編輯、AI 輔助寫作

- **Canvas 編輯器**：WYSIWYG Markdown 編輯
- **AI 輔助功能**：
  - 潤飾：改善文字流暢度
  - 擴寫：增加內容細節
  - 縮寫：精簡內容
  - 翻譯：多語言轉換
  - 續寫：延續內容脈絡

**範例**：
> 將 Council 產出的技術說明匯入 Canvas，進行編輯潤飾後匯出

---

## 3. 技術棧（現況）

### 3.1 專案結構

```
mav-extension/
├── manifest.json              # Chrome Extension Manifest V3
├── background.js              # Service Worker
│                              # - API 呼叫代理
│                              # - 串流處理
│                              # - Context Menu 處理
│
├── sidepanel/                 # 主要 UI 與核心邏輯
│   ├── index.html
│   ├── style.css
│   ├── app.js                 # 主應用（UI + Council 邏輯）
│   ├── agent.js               # Agent Loop 核心
│   ├── planner.js             # Planner 類別（決策邏輯）
│   ├── tools.js               # Tool 定義與 Registry
│   ├── orchestrator.js        # Multi-Agent Orchestration
│   ├── hooks.js               # Lifecycle Hooks 系統
│   ├── skill-loader.js        # Skill 載入器
│   ├── skill-evaluator.js     # Skill 評估器
│   ├── skill-rules.json       # Skill 匹配規則
│   ├── skills-bundle.js       # 打包的 Skills
│   ├── skills.js              # Skills 定義（Legacy）
│   └── legacy.js              # 舊版相容層
│
├── canvas/                    # WYSIWYG 編輯器
│   ├── index.html
│   ├── style.css
│   └── canvas.js
│
├── options/                   # 設定頁
│   ├── index.html
│   ├── style.css
│   └── options.js
│
├── content/                   # Content Script
│   └── content.js             # 頁面內容擷取
│
├── locales/                   # 多語言支援
│   ├── i18n.js
│   ├── en-US.js
│   ├── ja-JP.js
│   └── zh-TW.js
│
├── skills/                    # Skill 定義（SKILL.md 格式）
│   ├── quick-answer/
│   ├── researcher/
│   ├── educator/
│   ├── fact-checker/
│   ├── current-events/
│   ├── creative/
│   ├── technical/
│   ├── image-design/
│   └── vision-analysis/
│
├── docs/                      # GitHub Pages 網站
│   ├── index.html
│   ├── style.css
│   └── assets/
│
└── icons/                     # 圖示資源
```

### 3.2 核心技術

| 類別 | 技術 | 說明 |
|------|------|------|
| **平台** | Chrome Extension Manifest V3 | Service Worker 架構 |
| **語言** | JavaScript (ES6+) | 純 JS，無框架 |
| **UI** | HTML + CSS | 無 UI 框架 |
| **儲存** | chrome.storage | sync + local |
| **API** | OpenRouter | 統一 LLM 存取介面 |
| **搜尋** | Brave Search API | 可選網路搜尋 |

### 3.3 API 整合

#### OpenRouter（必要）

```javascript
// 串流查詢
POST https://openrouter.ai/api/v1/chat/completions
{
  "model": "openai/gpt-5.1",
  "messages": [...],
  "stream": true
}

// Headers
{
  "Authorization": "Bearer sk-or-v1-...",
  "HTTP-Referer": "chrome-extension://...",
  "X-Title": "AI Council Extension"
}
```

支援模型（動態更新）：
- OpenAI: GPT-5.1, GPT-4o, GPT-4o Mini
- Anthropic: Claude Sonnet 4.5, Claude Sonnet 4, Claude 3.5 Sonnet
- Google: Gemini 3 Pro, Gemini 2.5 Flash, Gemini 2.0 Flash
- Meta: Llama 3.3 70B, Llama 3.1 405B

#### Brave Search（可選）

```javascript
GET https://api.search.brave.com/res/v1/web/search
?q={query}&count=20&country=tw&search_lang=zh-hant

// Headers
{
  "X-Subscription-Token": "BSA..."
}
```

### 3.4 儲存架構

```javascript
// chrome.storage.sync（跨裝置同步，有配額限制）
{
  "apiKey": "sk-or-v1-...",           // OpenRouter API Key
  "braveApiKey": "BSA...",            // Brave Search API Key
  "councilModels": ["openai/gpt-5.1", ...],
  "chairmanModel": "anthropic/claude-sonnet-4.5",
  "plannerModel": "openai/gpt-4o-mini", // Planner 決策模型
  "enableReview": true,
  "maxSearchIterations": 5,
  "maxCardDepth": 3,
  "reviewPrompt": "...",
  "chairmanPrompt": "...",
  "outputLength": "standard",         // concise | standard | detailed
  "outputFormat": "mixed",            // text | mixed | structured
  "learnerMode": "standard"           // standard | 9-10 | 11-12 | 13-15 | 16-18
}

// chrome.storage.local（本地儲存，無配額限制）
{
  "conversations": [...],             // 歷史對話（最多 50 筆）
  "contextItems": [...],              // Context 項目
  "canvasDocuments": [...],           // Canvas 文件
  "canvasImport": {...},              // 匯入暫存
  "availableModels": [...],           // 動態模型列表
  "skillsBundle": {...},              // 自訂 Skills
  "externalSkillsCache": {...}        // 外部 Skills LRU Cache
}
```

### 3.5 串流實作

Chrome Extension Service Worker 有 30 秒逾時限制，使用 Port 連線繞過：

```javascript
// UI 層 (sidepanel/app.js)
const port = chrome.runtime.connect({ name: 'stream' });
port.postMessage({ type: 'QUERY_MODEL_STREAM', payload: {...} });
port.onMessage.addListener(msg => {
  if (msg.type === 'CHUNK') appendContent(msg.content);
  if (msg.type === 'DONE') finishStream();
});

// Background (background.js)
chrome.runtime.onConnect.addListener(port => {
  if (port.name === 'stream') {
    // 處理 SSE 串流，透過 port.postMessage 回傳 chunks
  }
});
```

### 3.6 功能模組

| 功能 | 狀態 | 說明 |
|------|------|------|
| 多模型並行查詢 | ✅ | 同時查詢 4+ 模型，串流顯示 |
| 匿名互評 | ✅ | 各模型評估其他回答，輸出 JSON 排名 |
| 主席綜合 | ✅ | 指定模型產出最終答案 |
| Web Search | ✅ | Brave Search 整合，AI 延伸搜尋 |
| Google Search Tab | ✅ | 開啟 Google 搜尋分頁，個人化搜尋 |
| Price Compare | ✅ | 電商比價（momo, pchome, shopee, yahoo）|
| Vision Mode | ✅ | 圖片輸入分析（支援拖曳/貼上） |
| Image Generation | ✅ | Gemini Image 模型生成圖片 |
| Context System | ✅ | 右鍵加入選取文字/頁面內容 |
| Canvas | ✅ | WYSIWYG Markdown 編輯器 |
| 學習者模式 | ✅ | 四種年齡層探索式學習 |
| 動態模型更新 | ✅ | 從 OpenRouter 自動抓取最新模型 |
| Agent Planner | ✅ | 智能任務規劃（4 種 Planner） |
| Skills 系統 | ✅ | 9 種專業技能自動匹配 |
| Lifecycle Hooks | ✅ | 生命週期事件註冊 |
| Multi-Agent Orchestration | ✅ | 異質任務分配、動態主席 |

---

## 4. Agent Planner 框架

AI Council 採用 **Agent Planner** 框架，實現智能任務規劃與多工具協作。

### 4.1 架構概覽

```
用戶問題
    │
    ▼
┌─────────────────────────────────────────────────────────────┐
│  Skill Loader（技能載入）                                    │
│  - 根據問題關鍵字匹配最適合的 Skill                           │
│  - 載入 Skill 的 plannerHint 與 preferredTools              │
└─────────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────────┐
│  Planner（規劃器）                                           │
│  - 評估當前狀態（has_responses, has_reviews, iteration）     │
│  - 根據決策原則選擇下一個 Tool                               │
│  - 支援 LLM Planner 與 Rule-based Planner                   │
└─────────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────────┐
│  Tool Registry（工具註冊表）                                 │
│  - 執行選定的 Tool                                           │
│  - 記錄執行歷史                                              │
│  - 回傳結果給 Planner                                        │
└─────────────────────────────────────────────────────────────┘
    │
    ▼
  迭代直到 final_answer
```

### 4.2 可用工具（Tools）

| 工具 | 說明 | 參數 |
|------|------|------|
| `query_council` | 並行查詢多個 LLM 模型 | `query`, `models?`, `includeSearchSuffix?`, `skillId?`, `taskDescription?` |
| `web_search` | Brave Search API 網路搜尋 | `query`, `count?`, `freshness?` |
| `google_search_tab` | 開啟 Google 搜尋分頁 | `query`, `count?` |
| `price_compare` | 電商比價工具 | `query`, `platforms?`, `count?` |
| `peer_review` | 匿名互評，產出排名 | `responses`, `query`, `modelWeights?`, `evaluationMode?` |
| `synthesize` | 主席綜合所有資訊 | `query`, `responses`, `reviews?`, `searches?`, `useWeightedIntegration?`, `chairmanOverride?` |
| `request_user_input` | 暫停並詢問使用者 | `message`, `inputType`, `options?`, `suggestedSearches?`, `placeholder?` |
| `final_answer` | 輸出最終答案 | `content`, `summary?` |

### 4.3 Tool 定義格式

```javascript
// sidepanel/tools.js
const TOOL_DEFINITIONS = {
  query_council: {
    name: 'query_council',
    description: '並行查詢多個 LLM 模型獲取初步回答。適用於需要多元觀點的問題。支援異質任務分配。',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: '要查詢的問題' },
        models: { type: 'array', items: { type: 'string' }, description: '要查詢的模型列表' },
        includeSearchSuffix: { type: 'boolean', default: true, description: '是否要求模型提供搜尋建議' },
        skillId: { type: 'string', description: '套用的 skill ID' },
        taskDescription: { type: 'string', description: '具體任務描述' }
      },
      required: ['query']
    }
  },

  request_user_input: {
    name: 'request_user_input',
    description: '暫停執行並詢問使用者下一步行動。',
    parameters: {
      type: 'object',
      properties: {
        message: { type: 'string', description: '顯示給使用者的訊息' },
        inputType: {
          type: 'string',
          enum: ['choice', 'search', 'text', 'confirm'],
          description: '互動類型'
        },
        options: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              label: { type: 'string' },
              action: { type: 'string', enum: ['search', 'proceed', 'deepen', 'rephrase', 'switch_focus', 'clarify'] },
              value: { type: 'string' },
              icon: { type: 'string' }
            }
          }
        },
        suggestedSearches: { type: 'array', items: { type: 'string' } },
        placeholder: { type: 'string' }
      },
      required: ['message']
    }
  }
  // ... 其他工具定義
};
```

### 4.4 Planner 決策原則

```javascript
// 決策流程示意
1. 簡單問題（事實查詢）：
   query_council → synthesize → final_answer

2. 需要最新資訊（新聞、時事）：
   web_search → query_council → synthesize → final_answer

3. 複雜分析問題：
   query_council → peer_review → synthesize → request_user_input → final_answer

4. 事實查核問題：
   web_search → query_council → peer_review → synthesize

5. 圖像設計問題：
   query_council → synthesize → final_answer
```

### 4.5 Planner 類型

| 類型 | 說明 | 適用場景 | 檔案位置 |
|------|------|---------|----------|
| `Planner` | LLM 決策 | 複雜多變的問題 | `planner.js` |
| `RuleBasedPlanner` | 規則導向，無需 LLM | 簡單問題、節省 token | `planner.js` |
| `HybridPlanner` | 自動切換 | 根據問題複雜度選擇 | `planner.js` |
| `OrchestratedPlanner` | 支援動態主席 | 多輪互評時輪換 Chairman | `planner.js` |

### 4.6 狀態評估

Planner 在每次迭代時評估以下狀態：

```javascript
// AgentContext.getSummary()
{
  query: string,              // 用戶問題
  iteration: number,          // 目前迭代次數
  maxIterations: number,      // 最大迭代次數
  hasResponses: boolean,      // 是否已有模型回答
  responseCount: number,      // 已收到幾個模型的回答
  hasReviews: boolean,        // 是否已完成互評
  hasSearches: boolean,       // 是否已執行搜尋
  searchCount: number,        // 搜尋次數
  lastActions: string[],      // 最近執行的動作
  elapsedTime: number,        // 已用時間（ms）
  skill: string,              // 當前 Skill ID
  // Multi-Agent Orchestration
  hasAssignmentPlan: boolean, // 是否有任務分配計畫
  assignmentStrategy: string, // 分配策略
  currentChairman: string,    // 當前主席
  roundWinner: string,        // 本輪互評勝者
  taskCount: number           // 任務組數
}
```

### 4.7 Agent Loop 執行流程

```javascript
// sidepanel/agent.js - AgentLoop.run()
async run(query, options) {
  const context = new AgentContext(query, options);

  while (context.iteration < context.maxIterations && !context.completed) {
    context.iteration++;

    // 1. Planner 決策下一步
    const action = await this.planner.plan(context);

    // 2. 執行工具
    const result = await this.toolRegistry.execute(action.tool, action.parameters, context);

    // 3. 更新上下文
    context.updateFromResult(action.tool, result);
    context.addHistory(action, result);

    // 4. 檢查終止條件
    if (action.tool === 'final_answer') {
      context.completed = true;
    }

    // 5. request_user_input 處理（暫停等待用戶）
    if (action.tool === 'request_user_input') {
      // 根據用戶選擇決定繼續或結束
    }
  }

  return { success: true, content: context.lastSynthesis };
}
```

### 4.8 相關檔案

| 檔案 | 功能 |
|------|------|
| `sidepanel/planner.js` | Planner 類別定義（4 種） |
| `sidepanel/tools.js` | Tool 定義與 ToolRegistry |
| `sidepanel/agent.js` | AgentContext, AgentLoop |
| `sidepanel/orchestrator.js` | Multi-Agent 協作支援 |

---

## 5. Skills 系統

Skills 系統讓 AI Council 根據問題類型自動選擇最適合的處理策略。

### 5.1 Skill 架構

```
skills/
├── quick-answer/          # 快速問答
│   └── SKILL.md
├── researcher/            # 深度研究
│   └── SKILL.md
├── educator/              # 學習者模式
│   └── SKILL.md
├── fact-checker/          # 事實查核
│   └── SKILL.md
├── current-events/        # 時事新聞
│   └── SKILL.md
├── creative/              # 創意寫作
│   └── SKILL.md
├── technical/             # 技術問答
│   └── SKILL.md
├── image-design/          # 圖像設計
│   ├── SKILL.md
│   └── references/
│       ├── prompt-engineering.md
│       └── semiotics.md
└── vision-analysis/       # 圖片分析
    └── SKILL.md
```

### 5.2 內建 Skills

| Skill | 觸發關鍵字 | 工具組合 | 說明 |
|-------|-----------|---------|------|
| `quick-answer` | 預設 | `query_council → synthesize` | 快速問答，無互評 |
| `researcher` | 研究、分析、比較、調查 | `web_search → query_council → peer_review → synthesize` | 深度研究 |
| `educator` | 學習者模式設定 | `query_council → synthesize` | 蘇格拉底式引導 |
| `fact-checker` | 真的嗎、是否正確、查核 | `web_search → query_council → peer_review → synthesize` | 事實查核 |
| `current-events` | 新聞、最新、今日、近期 | `web_search → query_council → synthesize` | 時事新聞 |
| `creative` | 寫一篇、創作、故事、文案 | `query_council → synthesize` | 創意寫作 |
| `technical` | 程式、程式碼、bug、API | `query_council → peer_review → synthesize` | 技術問答 |
| `image-design` | 漫畫、插畫、海報、設計 | `query_council → synthesize` | 圖像設計 |
| `vision-analysis` | 有圖片輸入時 | `query_council → peer_review → synthesize` | 圖片分析 |

### 5.3 SKILL.md 格式

```yaml
---
name: researcher
description: 適用於需要深度研究、多方資料比對的問題
metadata:
  author: mav
  version: "1.0"
  icon: "🔬"
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

## Trigger Keywords

`研究` `分析` `比較` `調查` `評估`

## Instructions

1. 優先使用 web_search 收集多方資料
2. 使用 query_council 讓多個模型分析
3. 使用 peer_review 交叉驗證
4. synthesize 產出結構化報告

## Response Guidelines

- 使用結構化格式
- 標註所有引用來源
- 提供多元觀點的比較分析

## Example Queries

- 「深入分析 2024 年 AI 產業的發展趨勢」
- 「比較 React 和 Vue 框架的優缺點」
```

### 5.4 Skill 設定選項

| 設定 | 說明 | 預設值 |
|------|------|--------|
| `mav-tools` | 偏好的工具序列 | `query_council synthesize` |
| `max-iterations` | 最大迭代次數 | 6 |
| `max-searches` | 最大搜尋次數 | 2 |
| `response-length` | 輸出長度 | `standard` |
| `response-format` | 輸出格式 | `mixed` |
| `citations` | 是否標註來源 | `false` |
| `mav-ui` | UI 特殊功能 | - |
| `require-vision` | 需要 Vision 模型 | `false` |

### 5.5 Skill Loader 架構

```javascript
// sidepanel/skill-loader.js
class SkillLoader {
  // 三層載入架構
  // Layer 1: Metadata（啟動時載入所有 skill 的 name + description）
  // Layer 2: Instructions（選中 skill 時載入完整內容）
  // Layer 3: References（按需載入參考文件）

  async initialize() {
    // 載入 bundled skills + 外部 skills cache
  }

  async loadInstructions(skillId) {
    // 解析 SKILL.md，建構 skill 物件
  }

  async selectSkill(query, settings) {
    // 根據 query 和 settings 選擇最適合的 skill
  }
}
```

### 5.6 外部 Skill 支援

AI Council 支援從外部來源匯入 Skills：

```javascript
// 從 SkillsMP 匯入
await skillLoader.importFromSkillsMP('slug-name');

// 從 GitHub 匯入
await skillLoader.importFromGitHub('owner/repo/skills/my-skill/SKILL.md');

// 從文字內容匯入
await skillLoader.importFromContent(skillMdContent, { skillId: 'custom-skill' });
```

外部 Skills 使用 LRU Cache 管理，最多儲存 10 個外部 Skill。

---

## 6. Lifecycle Hooks 系統

Lifecycle Hooks 系統允許在執行流程的關鍵點註冊自訂處理邏輯。

### 6.1 Hook 事件

| 事件 | 觸發時機 | 用途 |
|------|---------|------|
| `skill:evaluate` | 評估 skill 時 | 自訂 skill 匹配邏輯 |
| `skill:activate` | skill 被選中 | 記錄、初始化 |
| `tool:before` | 工具執行前 | 參數修改、阻止執行 |
| `tool:after` | 工具執行後 | 結果處理、記錄 |
| `query:submit` | 用戶送出問題 | 預處理、驗證 |
| `synthesize:before` | 綜合前 | 參數調整 |
| `synthesize:after` | 綜合後 | 結果後處理 |
| `complete` | 流程結束 | 統計、清理 |

### 6.2 HookManager API

```javascript
// sidepanel/hooks.js
const hookManager = new HookManager();

// 註冊 hook
const handlerId = hookManager.register('tool:before', async (payload) => {
  const { toolName, params, context } = payload;

  // 修改參數
  if (toolName === 'web_search' && params.query.length > 50) {
    return { params: { ...params, query: params.query.slice(0, 50) } };
  }

  // 阻止執行
  if (shouldBlock) {
    return { block: true, message: '操作被阻止' };
  }
}, { priority: 10 });

// 移除 hook
hookManager.unregister('tool:before', handlerId);

// 觸發事件
const result = await hookManager.trigger('tool:before', { toolName, params, context });
```

### 6.3 Hook Result 格式

```typescript
interface HookResult {
  block?: boolean;        // 是否阻止後續動作
  message?: string;       // 阻止原因
  params?: object;        // 修改後的參數
  suppressOutput?: boolean; // 是否隱藏輸出
  data?: any;             // 任意附加資料
}
```

### 6.4 預設 Hooks

```javascript
// sidepanel/hooks.js - DefaultHooks
const DefaultHooks = {
  // peer_review 後自動 promote winner 為 Chairman
  autoPromoteChairman(orchestrator) { ... },

  // web_search 前優化搜尋關鍵字
  optimizeSearchQuery() { ... },

  // 流程結束後記錄統計
  logCompletionStats() { ... },

  // Skill 啟用時記錄
  logSkillActivation() { ... }
};
```

### 6.5 Planner 與 Hooks 整合

Planner 類別內建 Hook 整合：

```javascript
// planner.js
class Planner {
  async plan(context) {
    const action = await this._queryPlanner(systemPrompt, userPrompt);

    // 觸發 tool:before hook，可能修改或阻止 action
    return this._applyHooksAndReturn(action, context);
  }

  async _applyHooksAndReturn(action, context) {
    const hookResult = await hookManager.trigger('tool:before', {
      toolName: action.tool,
      params: action.parameters,
      context
    });

    if (hookResult?.block) {
      return hookResult.alternative || { tool: 'final_answer', ... };
    }

    if (hookResult?.params) {
      action.parameters = { ...action.parameters, ...hookResult.params };
    }

    return action;
  }
}
```

---

## 7. Multi-Agent Orchestration

Multi-Agent Orchestration 支援異質任務分配和動態主席輪換。

### 7.1 分配策略

| 策略 | 說明 | 適用場景 |
|------|------|---------|
| `homogeneous` | 所有模型相同任務 | 需要多角度驗證的問題 |
| `heterogeneous` | 不同模型不同任務 | 複雜多面向問題 |
| `mixed` | 部分相同、部分不同 | 需要深度驗證+補充觀點 |

### 7.2 Orchestrator 類別

```javascript
// sidepanel/orchestrator.js
class Orchestrator {
  // 分析任務複雜度和需求
  async analyzeTask(query, context) {
    return new TaskAnalysis({
      complexity: 'medium',
      requiresFactCheck: true,
      suggestedStrategy: 'mixed',
      suggestedSkills: ['researcher', 'fact-checker'],
      subtasks: [
        { description: '收集資料', skill: 'researcher', weight: 0.6 },
        { description: '驗證事實', skill: 'fact-checker', weight: 0.4 }
      ]
    });
  }

  // 建立任務分配計畫
  async createAssignmentPlan(analysis, models) {
    return new AssignmentPlan({
      strategy: analysis.suggestedStrategy,
      assignments: [
        { model: 'openai/gpt-5.1', skill: 'researcher', task: '收集資料', weight: 0.3 },
        { model: 'anthropic/claude-sonnet-4.5', skill: 'researcher', task: '收集資料', weight: 0.3 },
        { model: 'google/gemini-3-pro', skill: 'fact-checker', task: '驗證事實', weight: 0.4 }
      ]
    });
  }

  // 將互評勝者提升為主席
  promoteToChairman(winnerModel) {
    // 檢查連任限制（最多 3 任）
    // 更新主席歷史
    this.chairmanModel = winnerModel;
  }
}
```

### 7.3 加權評估模式

| 模式 | 說明 |
|------|------|
| `standard` | 傳統互評，所有回答同等權重 |
| `weighted` | 根據任務權重調整評分 |
| `contribution` | 計算各模型對最終答案的貢獻度 |

```javascript
// peer_review 加權計算
// finalScore = taskWeight × modelStrength × peerRank

// 貢獻度計算
function calculateContributionScores(taskGroups, responses, reviews) {
  // 每個任務組評估貢獻
  // 組內排名 + 任務權重 = 總貢獻度
}
```

### 7.4 AssignmentPlan 驗證規則

```javascript
class AssignmentPlan {
  validate() {
    const errors = [];

    // Rule 1: 至少 2 個模型執行相同任務（確保互相驗證）
    // Rule 2: 最多 3 種不同 skills（避免過度分散）
    // Rule 3: 任務權重總和應為 1.0

    return { valid: errors.length === 0, errors };
  }
}
```

### 7.5 動態主席輪換

```
Round 1:
  Models: [GPT-5.1, Claude, Gemini, Grok]
  Chairman: Claude (初始設定)
  Winner: GPT-5.1 (互評最高分)

Round 2:
  Chairman: GPT-5.1 (上輪勝者)
  Winner: Gemini

Round 3:
  Chairman: Gemini
  ...
```

---

## 8. 多語言支援

AI Council 支援多語言介面，透過 i18n 模組實現。

### 8.1 支援語言

| 語言 | 代碼 | 檔案 |
|------|------|------|
| 繁體中文 | `zh-TW` | `locales/zh-TW.js` |
| English | `en-US` | `locales/en-US.js` |
| 日本語 | `ja-JP` | `locales/ja-JP.js` |

### 8.2 i18n 架構

```javascript
// locales/i18n.js
const i18n = {
  currentLocale: 'zh-TW',
  translations: {},

  async init() {
    const result = await chrome.storage.sync.get({ language: 'zh-TW' });
    this.currentLocale = result.language;
    await this.loadTranslations(this.currentLocale);
    this.applyToPage();
  },

  t(key, params = {}) {
    let text = this.getNestedValue(this.translations, key);
    Object.keys(params).forEach(k => {
      text = text.replace(new RegExp(`\\{${k}\\}`, 'g'), params[k]);
    });
    return text;
  },

  applyToPage() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
      el.textContent = this.t(el.getAttribute('data-i18n'));
    });
  },

  getAILanguageInstruction() {
    return this.translations?.ai?.languageInstruction || '';
  }
};
```

### 8.3 使用方式

**HTML 標記：**

```html
<span data-i18n="sidebar.title">側邊欄標題</span>
<input data-i18n-placeholder="input.searchHint">
<button data-i18n-title="button.submit">送出</button>
```

**JavaScript 呼叫：**

```javascript
const text = i18n.t('messages.welcome');
const greeting = i18n.t('messages.greeting', { name: 'User' });
const instruction = i18n.getAILanguageInstruction();
```

---

## 9. 圖片生成系統規格

圖片生成系統採用**符號學兩軸論**（索緒爾理論）設計，透過五階段流程實現高品質、可控的多圖片生成。

### 9.1 系統流程總覽

```
Council 討論完成
       │
       ▼
┌─────────────────────────────────────────────────────────────┐
│  Phase 1: AI Prompt 生成 (generateImagePromptWithAI)        │
│  ├─ 分析 Council 內容                                        │
│  ├─ 識別多圖規劃                                             │
│  ├─ 生成結構化 JSON（風格、系譜軸、一致性區塊、base_prompt）    │
│  └─ 輸出：recommendedStyles, globalParadigms, images[]      │
└─────────────────────────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────────────────────┐
│  Phase 2: 風格選擇 (showStyleSelectionUI)                   │
│  ├─ 顯示 AI 推薦風格卡片                                     │
│  ├─ 全局系譜軸選擇器（paradigm chips）                       │
│  ├─ 一致性描述編輯區                                         │
│  └─ 輸出：selectedStyle, paradigmSelections, globalContext  │
└─────────────────────────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────────────────────┐
│  Phase 3: 風格整合 (integrateStyleIntoPrompts)              │
│  ├─ 全局 placeholder 替換（composePromptFromParadigms）      │
│  ├─ AI 將風格融入 consistency_block                         │
│  └─ 輸出：integratedConsistencyText, processedImages[]      │
└─────────────────────────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────────────────────┐
│  Phase 4: 預覽與編輯 (showPromptPreview)                    │
│  ├─ 純文字預覽區（可直接編輯）                                │
│  ├─ 解析編輯內容（parsePreviewContent）                      │
│  └─ 輸出：編輯後的 images[]                                  │
└─────────────────────────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────────────────────┐
│  Phase 5: 多圖編輯器 (showMultiImageEditor)                 │
│  ├─ 每張圖獨立編輯卡片                                       │
│  ├─ 單圖系譜軸選擇（image-level paradigms）                  │
│  ├─ 潤色功能（refinePromptWithAI）                          │
│  ├─ 組合：consistency_block + base_prompt                   │
│  └─ 呼叫 runImageGeneration 生成圖片                        │
└─────────────────────────────────────────────────────────────┘
```

### 9.2 符號學兩軸論架構

#### 9.2.1 核心概念

| 軸向 | 名稱 | 說明 |
|------|------|------|
| **系譜軸**（Paradigmatic） | 垂直替代選項 | 每個敘事主體的可替換屬性選項 |
| **毗鄰軸**（Syntagmatic） | 橫向組合結構 | 選定的選項組合成完整 prompt |

```
毗鄰軸組合公式：
最終 Prompt = 一致性區塊（consistency_block）+ 單圖描述（base_prompt）
            = [角色一致性] + [畫風一致性] + [場景一致性] + [該圖特定描述]
```

#### 9.2.2 系譜軸層級結構

```
系譜軸（Paradigmatic Axis）
├── 全局系譜軸（Global Paradigms）─ 跨圖片共用
│   ├── characters（角色系譜軸）
│   │   └── {角色名}
│   │       ├── 面貌: [方臉, 圓臉, 鵝蛋臉]
│   │       ├── 表情: [微笑, 沉思, 驚喜]
│   │       └── 髮型: [短髮, 長髮, 雙馬尾]
│   │
│   ├── style（風格系譜軸）
│   │   ├── 線條: [細膩手繪, 粗獷筆觸, 平滑向量]
│   │   └── 質感: [紙本紋理, 平滑數位, 水彩暈染]
│   │
│   └── color_atmosphere（色彩氛圍系譜軸）
│       ├── 色溫: [暖色調, 冷色調, 中性]
│       ├── 飽和度: [低飽和日系, 標準, 高飽和鮮明]
│       └── 光線: [柔和自然光, 強烈側光, 逆光剪影]
│
└── 單圖系譜軸（Image Paradigms）─ 每張圖獨立
    ├── scene（場景系譜軸）
    ├── object（物件系譜軸）
    └── composition（構圖系譜軸）
        ├── 視角: [平視, 俯視, 仰視]
        ├── 景深: [遠景全身, 中景半身, 近景特寫]
        └── 位置: [主體置中, 三分法左, 三分法右]
```

### 9.3 Placeholder 置換規則

| 類型 | 格式 | 範例 |
|------|------|------|
| 角色屬性 | `{角色名.屬性}` | `{爸爸.面貌}`, `{媽媽.表情}` |
| 風格屬性 | `{style.屬性}` | `{style.線條}`, `{style.質感}` |
| 色彩屬性 | `{color.屬性}` | `{color.色溫}`, `{color.光線}` |
| 場景屬性 | `{scene.元素.屬性}` | `{scene.庭園.狀態}` |
| 構圖屬性 | `{comp.屬性}` | `{comp.視角}`, `{comp.景深}` |

### 9.4 圖片生成 API

```javascript
async function runImageGeneration(prompt, timeoutMs = 240000) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({
      type: 'QUERY_IMAGE',
      payload: {
        model: 'google/gemini-2.0-flash-exp:free',
        prompt: prompt
      }
    }, (response) => {
      if (response?.images?.length) {
        resolve(response.images);
      } else {
        reject(new Error('未收到圖片'));
      }
    });
  });
}
```

---

## 10. React Native iOS 移轉技術細節

### 10.1 目標平台

- **主要目標**：iOS App（App Store 上架）
- **次要目標**：Android App（Google Play）
- **技術選型**：React Native + Expo

### 10.2 架構對照

| 層級 | Chrome Extension | React Native iOS |
|------|------------------|------------------|
| **UI 框架** | 純 HTML/CSS/JS | React Native + Expo |
| **樣式** | CSS | NativeWind (Tailwind) |
| **路由** | 無（單頁） | Expo Router |
| **狀態管理** | chrome.storage 事件 | Zustand |
| **API 呼叫** | background.js fetch | React Query + Serverless |
| **串流** | chrome.runtime.connect | SSE / EventSource |
| **本地儲存** | chrome.storage.local | MMKV / SQLite |
| **認證** | 無 | Apple Sign-In |

### 10.3 系統架構圖

```
┌──────────────────────────────────────────────────────────────┐
│                   React Native App (iOS)                     │
├──────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │ Expo Router │  │   Zustand   │  │    React Query      │  │
│  │  (路由導航)  │  │  (狀態管理)  │  │  (API 快取/串流)    │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │ NativeWind  │  │    MMKV     │  │   Expo SecureStore  │  │
│  │  (樣式系統)  │  │ (本地儲存)   │  │   (安全儲存 Token)  │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
└────────────────────────────┬─────────────────────────────────┘
                             │ HTTPS
                             ▼
┌──────────────────────────────────────────────────────────────┐
│                 Serverless Backend (Vercel)                  │
├──────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌───────────────┐  ┌───────────────┐  │
│  │  Edge Functions │  │   Vercel KV   │  │  Rate Limiter │  │
│  │  (API 代理)     │  │  (Session)    │  │  (Upstash)    │  │
│  └────────┬────────┘  └───────────────┘  └───────────────┘  │
│           │                                                  │
│  ┌────────▼────────┐  ┌───────────────┐                     │
│  │  Auth Handler   │  │  Usage Track  │                     │
│  │ (Apple Sign-In) │  │  (計費統計)    │                     │
│  └─────────────────┘  └───────────────┘                     │
└────────────────────────────┬─────────────────────────────────┘
                             │
         ┌───────────────────┼───────────────────┐
         ▼                   ▼                   ▼
   ┌───────────┐      ┌───────────┐      ┌───────────┐
   │ OpenRouter│      │  Brave    │      │  (Future) │
   │    API    │      │ Search API│      │  Firebase │
   └───────────┘      └───────────┘      └───────────┘
```

### 10.4 技術選型理由

| 技術 | 選擇原因 |
|------|---------|
| **Expo** | 簡化 iOS 建置流程，EAS Build 雲端打包 |
| **Expo Router** | 檔案系統路由，類似 Next.js |
| **Zustand** | 輕量狀態管理，無 boilerplate |
| **React Query** | 內建串流支援、快取、重試 |
| **NativeWind** | Tailwind 語法，樣式重用性高 |
| **MMKV** | 高效能 key-value 儲存，取代 AsyncStorage |
| **Vercel Edge** | 低延遲、全球部署、Streaming Response |

---

## 11. 移轉需補足項目

### 11.1 優先級定義

- **P0**：App Store 上架必要條件
- **P1**：核心用戶體驗
- **P2**：進階功能

### 11.2 後端開發

| 項目 | 優先級 | 說明 | 預估工時 |
|------|--------|------|---------|
| Serverless API 層 | P0 | 代理 OpenRouter/Brave API | 3d |
| Apple Sign-In | P0 | App Store 要求支援 | 2d |
| Rate Limiting | P0 | 防止濫用 | 1d |
| Usage Tracking | P1 | 用量統計（計費基礎） | 2d |
| 訂閱系統 | P1 | In-App Purchase 整合 | 5d |
| API Key 託管 | P1 | 用戶自帶 Key 選項 | 2d |

### 11.3 前端開發

| 項目 | 優先級 | 說明 | 預估工時 |
|------|--------|------|---------|
| Council UI | P0 | 主畫面重寫 | 5d |
| 串流 UI | P0 | SSE 接收 + 即時渲染 | 3d |
| Markdown 渲染 | P0 | react-native-markdown | 2d |
| 設定頁 | P0 | 模型選擇、Prompt 設定 | 2d |
| Canvas 編輯器 | P1 | 富文本編輯 | 5d |
| Vision Mode | P1 | 相機/相簿整合 | 3d |
| 離線儲存 | P1 | 對話歷史本地快取 | 2d |
| Deep Link | P2 | 外部分享連結 | 1d |

### 11.4 移轉優先順序

```
Phase 1 (MVP - App Store 上架)
├── Serverless API 代理
├── Apple Sign-In
├── Council 主畫面
├── 串流 UI
├── 基本設定頁
└── 隱私政策 & 合規

Phase 2 (核心體驗)
├── Canvas 編輯器
├── Vision Mode
├── 訂閱系統
├── Usage Tracking
└── 離線儲存

Phase 3 (進階功能)
├── 學習者模式
├── 延伸搜尋
├── Deep Link
└── Widget
```

---

## 12. 相關文件索引

### 12.1 文件總覽

| 文件 | 用途 | 維護時機 |
|------|------|---------|
| [`SPEC.md`](SPEC.md) | 產品規格總覽 | 功能規劃、架構變更時 |
| [`README.md`](README.md) | 安裝與快速入門 | 安裝流程變更時 |
| [`CLAUDE.md`](CLAUDE.md) | AI 開發助手指南 | 架構、命名慣例變更時 |
| [`PROMPTS_REFERENCE.md`](PROMPTS_REFERENCE.md) | Prompt 模板參考 | 新增/修改 Prompt 時 |
| [`USER_GUIDE.md`](USER_GUIDE.md) | 使用者功能文件 | 功能變更時 |
| [`HANDOFF.md`](HANDOFF.md) | 技術棧轉移指南 | 架構變更時 |
| [`MARKETING.md`](MARKETING.md) | 行銷素材與文案 | 版本發布時 |
| [`PRIVACY.md`](PRIVACY.md) | 隱私政策 | 資料處理方式變更時 |

### 12.2 核心程式碼檔案

| 檔案 | 功能 |
|------|------|
| `sidepanel/app.js` | 主應用 UI 與 Council 邏輯 |
| `sidepanel/agent.js` | AgentContext, AgentLoop |
| `sidepanel/planner.js` | Planner 類別（4 種） |
| `sidepanel/tools.js` | Tool 定義與 ToolRegistry |
| `sidepanel/orchestrator.js` | Multi-Agent Orchestration |
| `sidepanel/hooks.js` | Lifecycle Hooks 系統 |
| `sidepanel/skill-loader.js` | Skill 載入器 |
| `background.js` | Service Worker |
| `options/options.js` | 設定頁邏輯 |
| `canvas/canvas.js` | Canvas 編輯器 |

---

## 13. 使用手冊

### 13.1 Chrome Extension 安裝

1. Clone 或下載此 repo
2. 開啟 Chrome，前往 `chrome://extensions/`
3. 開啟右上角「開發人員模式」
4. 點擊「載入未封裝項目」
5. 選擇 repo 資料夾

### 13.2 初始設定

1. 點擊擴充功能圖示 → 右鍵 → **選項**
2. 輸入 **OpenRouter API Key**（必要）
   - 前往 [openrouter.ai](https://openrouter.ai/) 註冊取得
3. 輸入 **Brave Search API Key**（可選）
   - 前往 [brave.com/search/api](https://brave.com/search/api/) 取得
4. 選擇參與 Council 的模型（至少 2 個）
5. 選擇主席模型
6. 選擇 Planner 模型（決策用）
7. 點擊「儲存設定」

### 13.3 基本使用

#### 發起 Council 查詢

1. 點擊擴充功能圖示開啟 Side Panel
2. 在輸入框輸入問題
3. 點擊「送出」
4. 觀看執行流程：
   - **🤖 模型回應**：各模型回應（分頁顯示，串流更新）
   - **📊 互評審查**：模型互評（顯示排名與評語）
   - **✨ 主席彙整**：主席綜合答案
   - **⚡ 執行狀態**：Agent Planner 決策過程

#### 加入 Context

- **擷取頁面**：點擊 Side Panel 的「擷取頁面」按鈕
- **選取文字**：在網頁選取文字 → 右鍵 → 「加入 AI Council Context」
- **網路搜尋**：點擊「網搜」按鈕，輸入關鍵字

### 13.4 進階功能

#### Vision Mode（圖片分析）

1. 拖曳圖片至輸入區，或使用 Ctrl+V 貼上
2. 圖片會顯示為預覽縮圖
3. 輸入問題，點擊送出
4. 支援 Vision 的模型會分析圖片內容

#### 圖片生成

1. 完成 Council 查詢後
2. 點擊「生成圖片」按鈕
3. AI 會分析討論內容，生成適合的圖片 Prompt
4. 選擇風格後開始生成

#### Canvas 編輯器

1. 完成 Council 查詢後，點擊「開啟畫布」
2. 或在網頁選取文字 → 右鍵 → 「在畫布中開啟」
3. 使用工具列進行格式編輯
4. 選取文字後可使用 AI 輔助功能（潤飾、擴寫、縮寫、翻譯）

#### 延伸搜尋

1. 完成 Council 查詢後
2. 點擊回答中的「延伸搜尋」建議關鍵字
3. 系統會自動搜尋並發起新的 Council 查詢
4. 可設定最大迭代次數（預設 5 次）

### 13.5 學習者模式

1. 前往選項頁
2. 在「學習者模式」區塊選擇年齡層
3. 儲存設定
4. 發起查詢後，回答風格會依年齡層調整
5. 會生成探索任務引導學習

### 13.6 常見問題

**Q: 為什麼沒有回應？**
- 確認 OpenRouter API Key 已正確設定
- 確認已選擇至少 2 個模型
- 檢查 API Key 餘額是否足夠

**Q: 串流中斷怎麼辦？**
- 部分模型回應較慢，請耐心等待
- 若超過 3 分鐘無回應，會自動逾時
- 可嘗試減少參與模型數量

**Q: 網搜功能無法使用？**
- 確認 Brave Search API Key 已設定
- 無 Key 時網搜功能會自動禁用

**Q: Vision 模式沒反應？**
- 確認選擇的模型支援 Vision（顯示 VIS 標記）
- 圖片大小建議 < 5MB
- 支援 PNG、JPG、WebP 格式

**Q: 圖片生成失敗？**
- 確認選擇了支援圖片生成的模型（顯示 IMG 標記）
- 目前僅 Gemini Image 模型支援
- 生成需要較長時間（約 30-60 秒）

---

## 附錄：技術參考

### A. OpenRouter 模型 ID 格式

```
{provider}/{model-name}

範例：
- openai/gpt-5.1
- anthropic/claude-sonnet-4.5
- google/gemini-3-pro-preview
- x-ai/grok-3
- meta-llama/llama-3.3-70b-instruct
```

### B. 訊息格式

```javascript
// Council 請求
{
  query: string,              // 用戶問題
  models: string[],           // 參與模型
  chairmanModel: string,      // 主席模型
  enableReview: boolean,      // 是否啟用互評
  contextItems: [...],        // Context 項目
  visionMode: boolean,        // Vision 模式
  imageData: string           // Base64 圖片
}

// 模型回應
{
  model: string,
  content: string,
  latency: number,
  tokenCount: number
}

// 互評結果
{
  reviewer: string,
  rankings: [{
    response: string,
    rank: number,
    reason: string
  }]
}
```

### C. 參考連結

- [Karpathy LLM Council](https://github.com/karpathy/llm-council)
- [OpenRouter API Docs](https://openrouter.ai/docs)
- [Chrome Extension Manifest V3](https://developer.chrome.com/docs/extensions/mv3/)
- [Brave Search API](https://brave.com/search/api/)
- [Expo Documentation](https://docs.expo.dev/)
- [Vercel Edge Functions](https://vercel.com/docs/functions/edge-functions)
