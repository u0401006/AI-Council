# Translation-Focus 功能降維矩陣

## Before / After Feature Matrix

| 功能模組 | Before (通用版) | After (翻譯專用版) | 變更說明 |
|---------|----------------|-------------------|---------|
| **Skill 調度** | 9 個 skill（researcher, factChecker, creative, technical, currentEvents, imageDesign, visionAnalysis, educator, quickAnswer）+ 動態外部 skill 載入 | 2 個 skill（translatorSingle, translatorMulti） | 拔除所有非翻譯 skill；SkillSelector 僅匹配翻譯；SkillLoader 改為 stub |
| **圖片生成** | imageDesign skill → AI prompt → 風格選擇 → Gemini 圖片生成 | ❌ 移除 | enableImage 永遠 false；IMAGE_MODELS 保留但不觸發；image gen 流程跳過 |
| **網路搜尋** | Brave Search API → web_search tool → 搜尋結果注入 context | ❌ 移除 | web_search 從 TOOL_DEFINITIONS 移除；Planner 不再產生 web_search action |
| **規劃模型 (Planner)** | HybridPlanner（LLM + RuleBased 自動切換）+ OrchestratedPlanner | RuleBasedPlanner only | 移除 LLM planner；移除 OrchestratedPlanner；HybridPlanner 改為 RuleBasedPlanner alias |
| **回應風格分流** | outputLength（concise/standard/detailed）+ outputFormat（text/structured/mixed） + Learner Mode (4 age groups) | 保留設定但不影響翻譯流程 | Learner Mode prompts 清空；skill 的 responseStyle 固定為翻譯用 |
| **互評 (Peer Review)** | 使用者可開關 enableReview | ✅ 固定啟用 | enableReview 硬編碼 true；options 頁面 checkbox 強制 true；Planner 永遠包含 peer_review |
| **任務入口** | 自由輸入（自動偵測 skill） | 翻譯專用（單語/多語） | SkillSelector 只偵測翻譯關鍵詞；預設為 translatorSingle |
| **提示詞範本** | 通用 Review Prompt + Chairman Prompt + 8 skill instructions | 翻譯專用 Review Prompt + Chairman Prompt + 2 translator instructions | Review 評估標準改為翻譯品質；Chairman 指令改為整合最佳翻譯 |
| **Orchestrator** | LLM 任務分析 + homogeneous/heterogeneous/mixed 策略 | 簡化為 homogeneous only | 移除 LLM 分析；移除異質/混合策略；所有模型翻譯相同文本 |
| **request_user_input** | 合成後提供延伸搜尋建議 | ❌ 移除 | tool definition 移除；Planner 不產生此 action |
| **Vision 模式** | 上傳圖片 → vision model 分析 | ❌ 停用 | visionMode 永遠 false；上傳區域隱藏 |
| **外部 Skill 匯入** | SkillsMP / GitHub 匯入 | ❌ 移除 | SkillLoader 改為空殼 stub |

## 保留不動的模組

| 模組 | 說明 |
|------|------|
| Agent Loop (agent.js) | AgentContext / AgentLoop / SimpleAgent 核心迴圈不變 |
| Tool Registry | 註冊/執行機制不變，只是工具集縮減 |
| Background Service Worker | API 呼叫機制不變（QUERY_MODEL handler 保留） |
| Card System / Session | 卡片系統、歷史紀錄、匯出功能保留 |
| i18n / Locale | 多語介面保留 |
| Options Page | 基本設定保留（API Key、模型選擇、Chairman） |
| Markdown Parser | 回應渲染保留 |
| Cost Tracking | 費用追蹤保留 |

## 檔案變更清單

| 檔案 | 動作 | 說明 |
|------|------|------|
| `sidepanel/skills.js` | 🔄 重寫 | 9 skills → 2 translation skills |
| `sidepanel/orchestrator.js` | 🔄 重寫 | 移除 LLM 分析和異質策略 |
| `sidepanel/planner.js` | 🔄 重寫 | 移除 LLM planner，固定翻譯流程 |
| `sidepanel/tools.js` | 🔄 重寫 | 移除 web_search、request_user_input、weighted scoring |
| `sidepanel/skill-loader.js` | 🔄 重寫 | 改為 stub（無動態載入） |
| `sidepanel/skills-bundle.js` | 🔄 重寫 | 僅包含 2 個翻譯 skill |
| `sidepanel/app.js` | ✏️ 編輯 | 更新 prompts、停用 image/search/vision、固定 peer_review |
| `options/options.js` | ✏️ 編輯 | 更新 prompts、enableReview 固定 true |
| `skills/translator-single/SKILL.md` | ➕ 新增 | 單語翻譯 skill 定義 |
| `skills/translator-multi/SKILL.md` | ➕ 新增 | 多語翻譯 skill 定義 |
| `skills/creative/` | 🗑️ 刪除 | 非翻譯 skill |
| `skills/current-events/` | 🗑️ 刪除 | 非翻譯 skill |
| `skills/educator/` | 🗑️ 刪除 | 非翻譯 skill |
| `skills/fact-checker/` | 🗑️ 刪除 | 非翻譯 skill |
| `skills/image-design/` | 🗑️ 刪除 | 非翻譯 skill（含 references/） |
| `skills/quick-answer/` | 🗑️ 刪除 | 非翻譯 skill |
| `skills/researcher/` | 🗑️ 刪除 | 非翻譯 skill |
| `skills/technical/` | 🗑️ 刪除 | 非翻譯 skill |
| `skills/vision-analysis/` | 🗑️ 刪除 | 非翻譯 skill |
| `TRANSLATION_FOCUS_MATRIX.md` | ➕ 新增 | 本文件 |
