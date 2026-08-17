# AI Council 技術棧轉移指南

> 版本：1.0
> 更新日期：2026-01-14

本文件供技術棧轉移時參考，搭配 SPEC.md 和 USER_GUIDE.md 使用，說明架構設計、核心抽象、潛在風險和常見陷阱。

---

## 目錄

1. [架構總覽](#1-架構總覽)
2. [核心抽象](#2-核心抽象)
3. [資料流](#3-資料流)
4. [API 依賴](#4-api-依賴)
5. [Chrome API 依賴](#5-chrome-api-依賴)
6. [狀態管理陷阱](#6-狀態管理陷阱)
7. [轉移風險清單](#7-轉移風險清單)
8. [功能優先級建議](#8-功能優先級建議)
9. [測試要點](#9-測試要點)

---

## 1. 架構總覽

### 1.1 系統架構圖

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Chrome Extension                             │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │                    UI Layer (sidepanel/)                     │  │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌─────────────┐  │  │
│  │  │  app.js  │  │ Canvas   │  │ Options  │  │  Content    │  │  │
│  │  │  (主UI)  │  │ Editor   │  │  Page    │  │  Script     │  │  │
│  │  └────┬─────┘  └──────────┘  └──────────┘  └─────────────┘  │  │
│  └───────┼─────────────────────────────────────────────────────┘  │
│          │                                                         │
│  ┌───────▼─────────────────────────────────────────────────────┐  │
│  │                   Agent Layer (modular)                      │  │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌─────────────┐  │  │
│  │  │ agent.js │  │planner.js│  │ tools.js │  │orchestrator │  │  │
│  │  │AgentLoop │  │ Planner  │  │ToolReg.  │  │   .js       │  │  │
│  │  └────┬─────┘  └────┬─────┘  └────┬─────┘  └──────┬──────┘  │  │
│  │       │             │             │               │          │  │
│  │  ┌────▼─────────────▼─────────────▼───────────────▼──────┐  │  │
│  │  │                    hooks.js                            │  │  │
│  │  │                  HookManager                           │  │  │
│  │  └───────────────────────────────────────────────────────┘  │  │
│  │                                                              │  │
│  │  ┌──────────────────────────────────────────────────────┐   │  │
│  │  │               skill-loader.js                         │   │  │
│  │  │              SkillLoader + LRU Cache                  │   │  │
│  │  └──────────────────────────────────────────────────────┘   │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                  Background Service Worker                    │  │
│  │  ┌──────────────────────────────────────────────────────┐   │  │
│  │  │                  background.js                        │   │  │
│  │  │  - API Proxy (OpenRouter, Brave)                      │   │  │
│  │  │  - Port Streaming (繞過 30s timeout)                  │   │  │
│  │  │  - Context Menu handling                              │   │  │
│  │  │  - Tab management (Google Search, Price Compare)       │   │  │
│  │  └──────────────────────────────────────────────────────┘   │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
                                   │
                                   │ HTTPS
                                   ▼
                    ┌──────────────────────────────┐
                    │     External APIs            │
                    │  ┌─────────┐ ┌───────────┐  │
                    │  │OpenRouter│ │Brave Search│ │
                    │  └─────────┘ └───────────┘  │
                    └──────────────────────────────┘
```

### 1.2 執行流程

```
User Query
    │
    ▼
┌─────────────────────────────────────────────────────────────────┐
│  1. SkillLoader.selectSkill(query, settings)                    │
│     - 根據關鍵字匹配最適合的 Skill                                │
│     - 載入 Skill 的 preferredTools 和 plannerHint               │
└─────────────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────────────┐
│  2. AgentLoop.run(query, options)                               │
│     - 建立 AgentContext                                         │
│     - 迭代執行直到 completed 或達到 maxIterations                │
└─────────────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────────────┐
│  3. Planner.plan(context)                                       │
│     - 評估當前狀態 (getSummary)                                  │
│     - 決定下一個 Tool                                            │
│     - 觸發 tool:before Hook                                     │
└─────────────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────────────┐
│  4. ToolRegistry.execute(toolName, params, context)             │
│     - 執行選定的 Tool                                            │
│     - 記錄 executionHistory                                     │
└─────────────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────────────┐
│  5. AgentContext.updateFromResult(toolName, result)             │
│     - 更新 responses, reviews, searches, lastSynthesis         │
│     - 觸發 tool:after Hook                                      │
└─────────────────────────────────────────────────────────────────┘
    │
    ▼
  Loop until final_answer or maxIterations
```

---

## 2. 核心抽象

### 2.1 AgentContext

**職責**：維護單次查詢的完整狀態

**位置**：`sidepanel/agent.js`

**關鍵屬性**：

```javascript
class AgentContext {
  // 基本狀態
  query: string;              // 當前問題（可能被修改）
  originalQuery: string;      // 原始問題
  iteration: number;          // 當前迭代次數
  maxIterations: number;      // 最大迭代次數

  // 累積資料
  responses: Array;           // 模型回答列表
  reviews: Object | null;     // 互評結果
  searches: Array;            // 搜尋結果列表
  lastSynthesis: string | null; // 最後一次 synthesize 的結果
  history: Array;             // 執行歷史

  // Orchestration
  assignmentPlan: Object | null;  // 任務分配計畫
  currentChairman: string;        // 當前主席
  roundWinner: string | null;     // 本輪互評勝者
  taskResponses: Map;             // 按任務分組的回答
  modelWeights: Map;              // 模型權重

  // 旗標
  completed: boolean;
  cancelled: boolean;
}
```

**轉移注意事項**：
- `lastSynthesis` 是判斷是否完成的關鍵，必須在 synthesize 後正確設定
- `history` 的 `lastActions` 用於 loop prevention，結構必須維持
- `reviews` 為 `null` 表示未執行互評，空物件 `{}` 表示執行但無結果

---

### 2.2 Planner

**職責**：決定下一步執行哪個 Tool

**位置**：`sidepanel/planner.js`

**四種實作**：

| 類型 | 說明 | 適用場景 |
|------|------|---------|
| `Planner` | LLM 決策 | 複雜問題 |
| `RuleBasedPlanner` | 規則導向 | 簡單問題、節省 token |
| `HybridPlanner` | 自動切換 | 預設選擇 |
| `OrchestratedPlanner` | 支援動態主席 | 多輪互評 |

**關鍵方法**：

```javascript
class Planner {
  async plan(context) {
    // 1. 建構 prompt
    const systemPrompt = PLANNER_SYSTEM_PROMPT.replace('{{tools}}', toolsText);
    const userPrompt = buildPlanningPrompt(context, this.skillHint);

    // 2. 查詢 LLM
    const response = await this._queryPlanner(systemPrompt, userPrompt);

    // 3. 解析回應
    const action = parsePlannerResponse(response);

    // 4. 套用 Hooks
    return this._applyHooksAndReturn(action, context);
  }

  _defaultAction(context) {
    // 當 LLM 失敗時的 fallback 邏輯
    // 檢查 lastSynthesis、lastActions 決定下一步
  }
}
```

**轉移注意事項**：
- `_defaultAction` 邏輯是防止 loop 的關鍵
- 必須正確判斷 `lastSynthesis` 存在時直接返回 `final_answer`
- `preferredTools` 影響規則導向的決策流程

---

### 2.3 ToolRegistry

**職責**：管理工具註冊與執行

**位置**：`sidepanel/tools.js`

**關鍵結構**：

```javascript
class ToolRegistry {
  tools: Map;           // name -> { definition, execute }
  executionHistory: Array;

  register(name, executor) {
    // 註冊工具實作
  }

  async execute(name, params, context) {
    // 執行工具，回傳 { success, data } 或 { success, error }
  }
}
```

**工具定義格式**：

```javascript
const TOOL_DEFINITIONS = {
  query_council: {
    name: 'query_council',
    description: '並行查詢多個 LLM 模型...',
    parameters: {
      type: 'object',
      properties: { ... },
      required: ['query']
    }
  }
};
```

**轉移注意事項**：
- 工具執行結果格式必須維持 `{ success: boolean, data: any }` 或 `{ success: boolean, error: string }`
- `request_user_input` 是特殊工具，會暫停 AgentLoop

---

### 2.4 SkillLoader

**職責**：載入和管理 Skills

**位置**：`sidepanel/skill-loader.js`

**三層載入架構**：

| 層級 | 內容 | 載入時機 |
|------|------|---------|
| Layer 1 | Metadata (name, description) | 初始化 |
| Layer 2 | Instructions (完整 SKILL.md) | 選中時 |
| Layer 3 | References (參考文件) | 按需 |

**關鍵方法**：

```javascript
class SkillLoader {
  metadataIndex: Map;    // skillId -> metadata
  cache: Map;            // skillId -> parsed skill
  externalCache: SkillsLRUCache;

  async selectSkill(query, settings) {
    // 根據 query 和 settings 選擇最適合的 skill
    // 優先順序：vision-analysis > image-design > fact-checker > ...
  }

  async loadInstructions(skillId) {
    // 解析 SKILL.md，建構 skill 物件
    // 包含 trigger, preferredTools, maxIterations 等
  }
}
```

**轉移注意事項**：
- 外部 Skills 使用 LRU Cache，最多 10 個
- SKILL.md 格式使用簡化版 YAML parser
- `trigger` 函數由關鍵字動態生成

---

### 2.5 HookManager

**職責**：管理生命週期事件

**位置**：`sidepanel/hooks.js`

**事件列表**：

| 事件 | 觸發時機 | 可阻止 |
|------|---------|--------|
| `skill:evaluate` | 評估 skill 時 | 否 |
| `skill:activate` | skill 被選中 | 否 |
| `tool:before` | 工具執行前 | 是 |
| `tool:after` | 工具執行後 | 否 |
| `synthesize:before` | 綜合前 | 是 |
| `synthesize:after` | 綜合後 | 否 |
| `complete` | 流程結束 | 否 |

**Hook Result 格式**：

```javascript
{
  block?: boolean;        // 阻止執行（僅 *_before 事件）
  message?: string;       // 阻止原因
  params?: object;        // 修改後的參數
  alternative?: object;   // 替代 action
  data?: any;             // 附加資料
}
```

**轉移注意事項**：
- `tool:before` 可以修改參數或阻止執行
- Handler 按 priority 排序執行（數字越小越先）
- `once: true` 的 handler 執行一次後自動移除

---

## 3. 資料流

### 3.1 Council 查詢資料流

```
User Input
    │
    ├──► Context Items (from chrome.storage.local)
    │
    ▼
buildPromptWithContext(query)
    │
    ├──► Context 串接
    ├──► Language Instruction 注入
    ├──► Skill-specific suffix (COUNCIL_SEARCH_SUFFIX 等)
    │
    ▼
query_council Tool
    │
    ├──► chrome.runtime.connect({ name: 'stream' })
    ├──► port.postMessage({ type: 'QUERY_MODEL_STREAM', ... })
    │
    ▼
background.js
    │
    ├──► fetch('https://openrouter.ai/api/v1/chat/completions', { stream: true })
    ├──► SSE parsing
    ├──► port.postMessage({ type: 'CHUNK', content })
    │
    ▼
UI Streaming Render
```

### 3.2 互評資料流

```
responses[]
    │
    ▼
generateReviewPrompt(query, responses, currentModel)
    │
    ├──► 排除自己的回答
    ├──► 匿名化為 Response A, B, C...
    │
    ▼
各模型並行評審
    │
    ▼
aggregateRankings()
    │
    ├──► 計算分數 (responses.length - rank)
    ├──► 排序產出 aggregatedRanking
    │
    ▼
(可選) calculateWeightedRanking()
    │
    ├──► taskWeight × peerRank
    │
    ▼
reviews = { reviews, aggregatedRanking, weightedRanking, winner }
```

### 3.3 圖片生成資料流

```
Council 結果
    │
    ▼
generateImagePromptWithAI()
    │
    ├──► IMAGE_PROMPT_SYSTEM prompt
    ├──► 分析內容，識別多圖規劃
    │
    ▼
JSON Output
{
  recommended_styles: [...],
  global_paradigms: {...},
  consistency_block: {...},
  images: [{ base_prompt, image_paradigms }]
}
    │
    ▼
showStyleSelectionUI()
    │
    ├──► 風格卡片選擇
    ├──► 全局系譜軸選擇器
    │
    ▼
integrateStyleIntoPrompts()
    │
    ├──► composePromptFromParadigms() - placeholder 置換
    ├──► AI 風格融合
    │
    ▼
showMultiImageEditor()
    │
    ├──► 每張圖獨立編輯
    ├──► refinePromptWithAI() - 潤色
    │
    ▼
runImageGeneration()
    │
    ├──► chrome.runtime.sendMessage({ type: 'QUERY_IMAGE' })
    │
    ▼
Generated Images
```

---

## 4. API 依賴

### 4.1 OpenRouter API

**用途**：統一存取多個 LLM

**端點**：
- `POST /api/v1/chat/completions` - 串流/非串流查詢
- `GET /api/v1/models` - 模型列表

**必要 Headers**：
```javascript
{
  'Authorization': `Bearer ${apiKey}`,
  'HTTP-Referer': 'chrome-extension://...',  // 必須
  'X-Title': 'AI Council Extension',
  'Content-Type': 'application/json'
}
```

**轉移注意事項**：
- `HTTP-Referer` 在 React Native 中需要自訂，建議設為 App 識別碼
- 串流模式使用 SSE，需要自行實作 EventSource 或使用 polyfill

### 4.2 Brave Search API

**用途**：網路搜尋

**端點**：
- `GET /res/v1/web/search`

**參數**：
- `q`: 搜尋查詢
- `count`: 結果數量 (1-20)
- `freshness`: 時效性 (pd/pw/pm/py)
- `country`: 國家代碼
- `search_lang`: 語言

**轉移注意事項**：
- API Key 不應暴露在客戶端，建議透過後端代理

---

## 5. Chrome API 依賴

### 5.1 依賴清單

| API | 用途 | 轉移替代方案 |
|-----|------|-------------|
| `chrome.storage.sync` | 跨裝置設定同步 | Firebase / AsyncStorage + 雲同步 |
| `chrome.storage.local` | 本地資料儲存 | MMKV / SQLite |
| `chrome.runtime.connect` | Port 串流 | SSE / WebSocket |
| `chrome.runtime.sendMessage` | 背景通訊 | 直接 API call |
| `chrome.scripting.executeScript` | Content Script 注入 | Share Extension / Deep Link |
| `chrome.contextMenus` | 右鍵選單 | Share Extension |
| `chrome.sidePanel` | Side Panel UI | React Navigation Tab |
| `chrome.tabs` | 分頁管理 | React Native Linking |

### 5.2 Port Streaming 實作

**問題**：Chrome Service Worker 有 30 秒 timeout 限制

**Chrome 解法**：
```javascript
// UI 層
const port = chrome.runtime.connect({ name: 'stream' });
port.postMessage({ type: 'QUERY_MODEL_STREAM', payload });
port.onMessage.addListener(msg => {
  if (msg.type === 'CHUNK') handleChunk(msg.content);
  if (msg.type === 'DONE') handleDone();
});

// Background 層
chrome.runtime.onConnect.addListener(port => {
  if (port.name === 'stream') {
    // 使用 fetch + ReadableStream 處理 SSE
    // 透過 port.postMessage 回傳 chunks
  }
});
```

**React Native 替代方案**：
```javascript
// 使用 EventSource polyfill 或 fetch + ReadableStream
import EventSource from 'react-native-sse';

const es = new EventSource(url, { headers });
es.addEventListener('message', event => {
  const data = JSON.parse(event.data);
  // 處理 chunk
});
```

### 5.3 Storage 結構

**sync 儲存（跨裝置）**：
```javascript
{
  apiKey: string,
  braveApiKey: string,
  councilModels: string[],
  chairmanModel: string,
  plannerModel: string,
  enableReview: boolean,
  reviewPrompt: string,
  chairmanPrompt: string,
  outputLength: 'concise' | 'standard' | 'detailed',
  outputFormat: 'text' | 'mixed' | 'structured',
  learnerMode: 'standard' | '9-10' | '11-12' | '13-15' | '16-18',
  language: string,
  maxSearchIterations: number,
  maxCardDepth: number
}
```

**local 儲存（本地）**：
```javascript
{
  conversations: Array,        // 最多 50 筆
  contextItems: Array,
  canvasDocuments: Array,
  canvasImport: Object,
  availableModels: Array,
  skillsBundle: Object,
  externalSkillsCache: Object
}
```

---

## 6. 狀態管理陷阱

### 6.1 lastSynthesis 未正確設定

**問題**：synthesize 後 `lastSynthesis` 為 null，導致 Planner 重複執行

**原因**：Tool 執行結果未正確解析

**檢查點**：
```javascript
// tools.js - synthesize executor
return {
  content: result,  // 必須有 content 欄位
  chairmanModel,
  ...
};

// agent.js - updateFromResult
case 'synthesize':
  this.lastSynthesis = data?.content || data?.result || null;
  break;
```

### 6.2 history.lastActions 追蹤錯誤

**問題**：Loop prevention 失效，重複執行相同工具

**原因**：`addHistory` 未被呼叫，或 action 格式錯誤

**檢查點**：
```javascript
// agent.js - run()
context.addHistory(action, result);  // 必須在 updateFromResult 後呼叫

// getSummary() 依賴 history
lastActions: this.history.slice(-3).map(h => h.action.tool),
```

### 6.3 reviews null vs 空物件

**問題**：互評判斷邏輯錯誤

**區別**：
- `reviews === null`: 尚未執行互評
- `reviews === {}` 或 `reviews.reviews.length === 0`: 執行了但無結果

**檢查點**：
```javascript
// 判斷是否需要互評
if (hasPeerReview && !summary.hasReviews && summary.responseCount >= 2) {
  // hasReviews 檢查的是 reviews !== null
}
```

### 6.4 request_user_input 處理不當

**問題**：用戶互動後流程中斷或重複

**關鍵邏輯**：
```javascript
// agent.js - 處理 request_user_input 結果
if (toolData.continueLoop) {
  // 用戶選擇繼續，根據 action 類型處理
  switch (toolData.action) {
    case 'search':
      context.updateFromResult('web_search', toolData);
      break;
    case 'deepen':
    case 'rephrase':
      context.query = toolData.modifiedQuery;
      context.responses = [];
      context.reviews = null;
      context.lastSynthesis = null;
      break;
  }
  continue;  // 繼續 loop
} else {
  // 用戶選擇結束，輸出 final_answer
  const content = context.lastSynthesis;
  // ...
}
```

### 6.5 Planner 無限迴圈

**問題**：Planner 持續選擇相同工具

**防禦機制**：
```javascript
// planner.js - _defaultAction
if (lastAction && lastAction === secondLastAction) {
  if (lastAction === 'query_council' || lastAction === 'web_search') {
    // 強制進入 synthesize
    return { tool: 'synthesize', ... };
  }
}

// agent.js - isLooping()
isLooping() {
  if (this.history.length < 3) return false;
  const last3 = this.history.slice(-3).map(h => h.action.tool);
  return last3[0] === last3[1] && last3[1] === last3[2];
}
```

---

## 7. 轉移風險清單

### 7.1 高風險項目

| 項目 | 風險 | 影響 | 建議 |
|------|------|------|------|
| Port Streaming | Chrome 專屬實作 | 串流功能完全失效 | 實作 SSE / EventSource |
| chrome.storage | API 不存在 | 所有設定和資料遺失 | 改用 MMKV + AsyncStorage |
| Content Script | 無法注入頁面 | 無法擷取網頁內容 | 改用 Share Extension |
| 30s Timeout | 仍可能存在 | 長時間查詢失敗 | 實作分段查詢 |

### 7.2 中風險項目

| 項目 | 風險 | 影響 | 建議 |
|------|------|------|------|
| Context Menu | 無右鍵選單 | 無法快速加入 Context | 使用 Share Extension |
| Tab Management | 無分頁概念 | Google Search Tab 失效 | 改用 WebView / Linking |
| Badge Count | 無 Badge API | 無法顯示 Context 數量 | 使用 App Badge (iOS) |
| Skill Bundle | 靜態打包 | 無法動態更新 | 改用 API fetch |

### 7.3 低風險項目

| 項目 | 風險 | 影響 | 建議 |
|------|------|------|------|
| i18n | 格式可直接沿用 | 無 | 沿用現有結構 |
| Prompt 模板 | 無依賴 | 無 | 直接複製 |
| SKILL.md 格式 | 無依賴 | 無 | 沿用 YAML parser |

---

## 8. 功能優先級建議

### 8.1 Phase 1 - MVP

| 功能 | 必要性 | 複雜度 | 說明 |
|------|--------|--------|------|
| 基本 Council 查詢 | P0 | 中 | 核心功能 |
| 串流 UI | P0 | 高 | 需實作 SSE |
| 設定頁 | P0 | 低 | 模型/API Key 設定 |
| 基本 Skills | P1 | 低 | quick-answer, researcher |

### 8.2 Phase 2 - 核心體驗

| 功能 | 必要性 | 複雜度 | 說明 |
|------|--------|--------|------|
| Vision Mode | P1 | 中 | 圖片上傳分析 |
| Web Search | P1 | 低 | Brave API 整合 |
| Peer Review | P1 | 中 | 互評邏輯 |
| 對話歷史 | P1 | 低 | 本地儲存 |

### 8.3 Phase 3 - 進階功能

| 功能 | 必要性 | 複雜度 | 說明 |
|------|--------|--------|------|
| Image Generation | P2 | 高 | 符號學兩軸論 UI |
| Canvas | P2 | 高 | 富文本編輯器 |
| 學習者模式 | P2 | 中 | 年齡層策略 |
| Orchestration | P2 | 高 | 異質任務分配 |
| Hooks | P2 | 中 | 生命週期擴展 |

---

## 9. 測試要點

### 9.1 單元測試

| 模組 | 測試重點 |
|------|---------|
| AgentContext | getSummary 正確性、updateFromResult 狀態更新 |
| Planner | _defaultAction 邏輯、loop prevention |
| ToolRegistry | execute 結果格式、error handling |
| SkillLoader | SKILL.md parsing、trigger 匹配 |
| HookManager | 事件觸發順序、block 邏輯 |

### 9.2 整合測試

| 場景 | 測試重點 |
|------|---------|
| 簡單問題 | query → synthesize → final_answer |
| 研究問題 | search → query → review → synthesize |
| 用戶互動 | synthesize → request_user_input → (search / proceed) |
| Vision | 圖片上傳 → query → review → synthesize |
| 圖片生成 | 完整五階段流程 |

### 9.3 邊界條件

| 條件 | 預期行為 |
|------|---------|
| maxIterations 達到 | 強制 synthesize + final_answer |
| API 失敗 | 顯示錯誤訊息，不崩潰 |
| 空回應 | 顯示 fallback 訊息 |
| 用戶取消 | 正確清理狀態 |
| 重複執行 | loop prevention 生效 |

---

## 附錄：快速參考

### A. 檔案對照表

| 檔案 | 職責 | 行數（約）|
|------|------|----------|
| `sidepanel/app.js` | 主 UI + Council 邏輯 | 12000+ |
| `sidepanel/agent.js` | AgentContext, AgentLoop | 820 |
| `sidepanel/planner.js` | Planner 類別（4 種） | 1175 |
| `sidepanel/tools.js` | Tool 定義與 Registry | 765 |
| `sidepanel/orchestrator.js` | Multi-Agent Orchestration | 630 |
| `sidepanel/hooks.js` | Lifecycle Hooks | 340 |
| `sidepanel/skill-loader.js` | Skill 載入器 | 885 |
| `background.js` | Service Worker | ~900 |

### B. 關鍵函數索引

| 函數 | 檔案 | 用途 |
|------|------|------|
| `handleSend` | app.js | 主要進入點 |
| `runCouncilWithAgent` | app.js | Agent 模式執行 |
| `queryModelStreaming` | app.js | 串流查詢 |
| `runChairman` | app.js | 主席綜合 |
| `generateImagePromptWithAI` | app.js | 圖片 Prompt 生成 |
| `AgentLoop.run` | agent.js | Agent 迴圈 |
| `Planner.plan` | planner.js | 決策 |
| `ToolRegistry.execute` | tools.js | 工具執行 |
| `SkillLoader.selectSkill` | skill-loader.js | Skill 選擇 |
| `HookManager.trigger` | hooks.js | 事件觸發 |
