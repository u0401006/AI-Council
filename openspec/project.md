# Project Context

## Purpose

AI Council (MAV Extension) 實作 **LLM Council** 概念：透過多模型並行查詢、匿名互評、主席綜合，產出更全面可靠的答案。

核心目標：
- 解決單一 AI 模型的偏見與盲點問題
- 提供多元視角與品質篩選機制
- 降低 AI 幻覺，提升答案可信度

## Tech Stack

- **平台**：Chrome Extension Manifest V3
- **語言**：JavaScript ES6+（純 JS，無框架）
- **UI**：HTML + CSS（無 UI 框架）
- **儲存**：chrome.storage (sync + local)
- **API**：OpenRouter（LLM 統一介面）、Brave Search API（可選）
- **架構**：Service Worker + Side Panel + Content Script

## Project Conventions

### Code Style

- 純 JavaScript，無 TypeScript
- 所有核心邏輯內聯於 `sidepanel/app.js`（UI + Council 邏輯）
- 模組拆分：`agent.js`, `planner.js`, `tools.js`, `orchestrator.js`, `hooks.js`
- UI 語言：繁體中文（zh-TW）為主
- 檔案命名：kebab-case（`skill-loader.js`）
- 變數/函數命名：camelCase

### Architecture Patterns

**三層通訊模型：**
1. **UI Layer**（sidepanel, canvas, options）→ `chrome.runtime.sendMessage()`
2. **Background Service Worker**（`background.js`）→ 所有 API 呼叫代理
3. **Content Scripts**（`content/content.js`）→ 頁面內容擷取

**Council 三階段流程：**
1. Stage 1: 並行查詢多個 LLM
2. Stage 2: 匿名互評（可選）
3. Stage 3: 主席綜合

**Agent Planner 框架：**
- Skill Loader → Planner → Tool Registry → Agent Loop
- 四種 Planner：LLM Planner、RuleBasedPlanner、HybridPlanner、OrchestratedPlanner

**串流實作：**
- 使用 `chrome.runtime.connect({ name: 'stream' })` Port 連線繞過 30 秒逾時

### Testing Strategy

目前無自動化測試框架。

開發測試流程：
1. 載入擴充功能：`chrome://extensions/` → Load unpacked
2. 重載後測試：點擊 refresh icon 或 Cmd+R
3. 查看 Console：
   - Background: extensions 頁面點擊 "service worker"
   - Side Panel: 右鍵 → Inspect
   - Content Script: 網頁 DevTools

### Git Workflow

- 直接在 main 分支開發
- Commit message 使用中文或英文皆可
- 重大功能變更使用 OpenSpec 流程

## Domain Context

### Council 概念

- **Council Models**：參與並行查詢的模型（至少 2 個）
- **Chairman Model**：負責最終綜合的模型
- **Peer Review**：模型互評，輸出 JSON 排名
- **Synthesis**：主席綜合所有回答與互評結果

### Skills 系統

9 種內建 Skill：
- `quick-answer`：快速問答（預設）
- `researcher`：深度研究
- `educator`：學習者模式
- `fact-checker`：事實查核
- `current-events`：時事新聞
- `creative`：創意寫作
- `technical`：技術問答
- `image-design`：圖像設計
- `vision-analysis`：圖片分析

### 工具（Tools）

- `query_council`：並行查詢多 LLM
- `web_search`：Brave Search 網路搜尋
- `google_search_tab`：開啟 Google 搜尋分頁
- `price_compare`：電商比價
- `peer_review`：匿名互評
- `synthesize`：主席綜合
- `request_user_input`：暫停詢問用戶
- `final_answer`：輸出最終答案

## Important Constraints

### Service Worker 限制

- 30 秒逾時限制 → 使用 Port 連線繞過
- 可能隨時重啟 → 不在 Service Worker 儲存狀態
- 使用 `chrome.storage` 持久化資料

### Content Script 限制

- 無法注入 `chrome://` 或 `chrome-extension://` 頁面
- 執行前需檢查 URL

### CORS 與 OpenRouter

必須包含 Headers：
```javascript
'HTTP-Referer': 'chrome-extension://mav-extension',
'X-Title': 'MAV Extension'
```

### 資料限制

- 頁面內容擷取限制 50,000 字元
- 對話歷史最多 50 筆
- 外部 Skills LRU Cache 最多 10 個

## External Dependencies

### OpenRouter API（必要）

- 統一 LLM 存取介面
- 支援 OpenAI、Anthropic、Google、Meta 等模型
- Model ID 格式：`provider/model-name`

### Brave Search API（可選）

- 網路搜尋功能
- 無 Key 時自動禁用搜尋

### 無後端依賴

- 所有 API 呼叫從客戶端直接發出
- 用戶自行提供 API Key
- 資料存於本地，不上傳任何用戶資料
