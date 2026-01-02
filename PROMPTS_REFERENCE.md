# Prompts 參考文件

## 概覽

本文件列出專案中所有的 prompt，按用途分類整理。

---

## 1. 用戶可設定 Prompt（Options Page）

位置：`options/options.js` 及 `sidepanel/app.js`

### 1.1 DEFAULT_REVIEW_PROMPT（評審員 Prompt）

**用途**：Stage 2 互評階段，各模型評估其他模型回答的排名

```
You are an impartial evaluator. Rank the following responses to a user's question based on accuracy, completeness, and insight.

**IMPORTANT: You MUST respond in Traditional Chinese (繁體中文). Simplified Chinese is strictly prohibited.**

## User's Question
{query}

## Responses to Evaluate
{responses}

## Your Task
Rank these responses from best to worst. Output in this exact JSON format:
```json
{
  "rankings": [
    {"response": "A", "rank": 1, "reason": "簡短理由（繁體中文）"},
    {"response": "B", "rank": 2, "reason": "簡短理由（繁體中文）"}
  ]
}
```

Be objective. Focus on factual accuracy and helpfulness. Write all reasons in Traditional Chinese.
```

**Placeholders**:
- `{query}` - 用戶原始問題
- `{responses}` - 其他模型的回答

---

### 1.2 DEFAULT_CHAIRMAN_PROMPT（主席 Prompt）

**用途**：Stage 3 彙整階段，主席綜合所有專家回答

```
You are the Chairman of an AI Council. Synthesize the expert responses into a single, comprehensive final answer.

**IMPORTANT: You MUST respond in Traditional Chinese (繁體中文). Simplified Chinese is strictly prohibited. English and Japanese terms may be kept as-is.**

## User's Question
{query}

## Expert Responses
{responses}

{ranking}

## Your Task
Create a single authoritative answer that:
1. Incorporates the best insights from all experts
2. Resolves contradictions by favoring accurate information
3. Is well-organized and comprehensive
4. When referencing context/search results, use citation markers like [1], [2] to indicate sources

Provide your answer directly in Traditional Chinese (繁體中文), without meta-commentary.
```

**Placeholders**:
- `{query}` - 用戶原始問題
- `{responses}` - 所有專家回答
- `{ranking}` - 互評排名結果

---

## 2. Council 流程 Prompt

位置：`sidepanel/app.js`

### 2.1 COUNCIL_SEARCH_SUFFIX

**用途**：Stage 1 各模型回答時，附加的搜尋建議請求（啟用搜尋模式時）

```
## 搜尋建議
若需要網路搜尋來驗證或補充資訊，請在回答最後提供 1-2 個搜尋關鍵詞：
```json
{"search_suggestions": ["關鍵詞1", "關鍵詞2"]}
```
搜尋建議應該針對你回答中不確定或需要驗證的部分。若你認為不需要搜尋，可省略此區塊。
```

---

### 2.2 SEARCH_STRATEGY_SUFFIX

**用途**：Stage 3 主席彙整後，附加的延伸搜尋建議請求

```
## 搜尋策略
請在回答最後**必須**提供 2-3 個搜尋關鍵詞建議，以便進一步深入探索此議題。使用以下 JSON 格式：
```json
{"search_queries": ["關鍵詞1", "關鍵詞2", "關鍵詞3"]}
```
搜尋關鍵詞應該是：
- 具體、有針對性的
- 能夠補充目前回答中未涵蓋的面向
- 探索相關但尚未深入的延伸議題
即使你認為目前資訊已相當完整，仍請提供可延伸探索的方向。
```

---

### 2.3 SEARCH_CONSOLIDATION_PROMPT

**用途**：Stage 2.5 整合各模型的搜尋建議

```
你是 AI Council 的主席。以下是各模型對用戶問題的回答及其搜尋建議。

## 用戶問題
{query}

## 模型回答摘要與搜尋建議
{modelSuggestions}

## 你的任務
分析各模型的搜尋建議，整合為 3-5 個最有價值的搜尋關鍵詞。只輸出以下 JSON 格式，不要其他文字：
```json
{"consolidated_queries": ["關鍵詞1", "關鍵詞2", "關鍵詞3"]}
```
```

**Placeholders**:
- `{query}` - 用戶原始問題
- `{modelSuggestions}` - 各模型的搜尋建議摘要

---

### 2.4 TASK_DECOMPOSITION_SUFFIX

**用途**：Stage 3 主席彙整後，附加的任務分解請求（Task Planner 模式）

```
## 任務分解
若此問題可拆解為多個可執行的子任務或延伸探索方向，請在回答最後提供：
```json
{"tasks": [
  {"content": "具體任務描述", "priority": "high", "suggestedFeatures": ["search"]},
  {"content": "另一個任務", "priority": "medium", "suggestedFeatures": ["image"]}
]}
```
任務應該是：
- 具體、可執行的行動項目
- 能夠延伸或深化目前討論的主題
- 標註優先級：high（核心必要）、medium（重要補充）、low（可選延伸）
- suggestedFeatures 陣列（可選）：根據任務性質建議啟用的功能
  - "search": 任務需要網路搜尋獲取最新資訊
  - "image": 任務需要生成圖片/圖表
  - "vision": 任務需要分析圖片內容
若問題較簡單無需拆解，可省略此區塊。
```

---

### 2.5 CONTEXT_SUMMARY_PROMPT

**用途**：生成卡片繼承用的脈絡摘要

```
請將以下討論內容精簡為脈絡摘要（200字內），保留：
1. 核心問題與目標
2. 關鍵決策與結論
3. 重要限制條件

原始問題：{query}

結論：{answer}

請只輸出摘要內容，不要加任何前綴或標題。
```

**Placeholders**:
- `{query}` - 原始問題
- `{answer}` - 最終答案（截斷至 2000 字）

---

### 2.6 Session Name Generator（內聯 Prompt）

**用途**：為新 Session 自動生成名稱

```
請為以下討論主題生成一個簡短的專案名稱（最多6個中文字，不要標點符號）：

{rootQuery}

只輸出名稱，不要其他文字。
```

---

### 2.7 PROMPT_SUGGESTION_SYSTEM

**用途**：搜尋迭代時，根據用戶選擇的關鍵字生成深入問題

**System Prompt**:
```
你是一位研究助理，專門幫助用戶深入探索議題。

任務：根據用戶的原始問題、選擇的延伸關鍵字，以及先前的討論內容，生成一個更聚焦、更深入的新問題。

要求：
1. 新問題應該聚焦於用戶選擇的關鍵字方向
2. 應該探索先前討論中未充分涵蓋的面向
3. 保持與原始問題的關聯性
4. 問題應該具體、可回答
5. 使用繁體中文
6. 直接輸出新問題，不要加任何解釋或前綴
```

**User Prompt**:
```
## 原始問題
{originalQuery}

## 用戶選擇的延伸關鍵字
{selectedKeyword}

## 先前討論摘要
{discussionContext}

---
請生成一個針對「{selectedKeyword}」方向的深入問題：
```

---

## 3. 學習者模式 Prompt（Learner Mode）

位置：`sidepanel/app.js`

### 3.1 LEARNER_CHAIRMAN_PROMPTS

**用途**：根據年齡層調整主席回答風格，實現教練式引導探索

| 年齡層 | 回答揭露度 | 核心策略 |
|--------|------------|----------|
| 9-10 歲 | 70% | 簡單詞彙、生活例子、發現式引導 |
| 11-12 歲 | 50% | 給線索推導、連結已知、探索式學習 |
| 13-15 歲 | 框架為主 | 方法論引導、框架思考、批判分析 |
| 16-18 歲 | 多元觀點 | 學術深度、不下定論、自主研究 |

**共同特點**：
- 不完全揭露答案，留給探索任務
- 結尾引導到探索任務
- 不在回答中直接問問題（問題放到任務裡）

---

### 3.2 LEARNER_TASK_SUFFIXES

**用途**：取代標準 TASK_DECOMPOSITION_SUFFIX，生成探索式任務

**任務類型**：
- `explore`：繼續探索（「為什麼會這樣呢？」）
- `verify`：驗證想法（「這個說法對嗎？」）
- `apply`：動手試試（「用這個方法來...」）
- `connect`：連結知識（「這跟...有什麼關係？」）

**任務結構**：
```json
{
  "tasks": [
    {
      "content": "任務描述（疑問句）",
      "type": "explore",
      "hint": "小提示，給線索不給答案"
    }
  ]
}
```

**年齡層差異**：
- 9-10：簡單探索任務，著重「發現」的樂趣
- 11-12：推理任務，著重「連結」已知知識
- 13-15：方法論任務，著重「如何驗證」
- 16-18：研究任務，著重「批判分析」

---

## 4. Vision 流程 Prompt

位置：`sidepanel/app.js`

### 4.1 generateVisionReviewPrompt

**用途**：Vision 模式下的圖片分析互評

```
你是一位公正的圖像分析評審。請評估以下各個 AI 對圖片的分析結果。

**重要：你必須使用繁體中文回答。禁止使用簡體中文。**

## 原始問題
{query}

## 各方分析
{responsesText}

## 評審任務
根據以下標準評估各分析：
1. **準確性**：對圖像內容的描述是否準確
2. **完整性**：是否涵蓋了圖像的重要細節
3. **洞察力**：是否提供了有價值的解讀或見解
4. **相關性**：分析是否回應了用戶的問題

請以 JSON 格式輸出排名：
```json
{
  "rankings": [
    {"response": "A", "rank": 1, "reason": "簡短理由"},
    {"response": "B", "rank": 2, "reason": "簡短理由"}
  ]
}
```
```

---

### 4.2 generateVisionChairmanPrompt

**用途**：Vision 模式下的主席彙整

```
你是 AI Council 的主席。請綜合各位專家對圖像的分析，提供一個完整且權威的最終分析報告。

**重要：你必須使用繁體中文回答。禁止使用簡體中文。英文和日文專有名詞可保留原文。**

## 原始問題
{query}

## 專家分析
{responsesText}

{rankingInfo}

## 主席任務
請創建一個綜合性的最終分析報告：
1. 整合各專家的最佳觀察和見解
2. 如有矛盾之處，以準確的資訊為準
3. 組織良好、結構清晰
4. 直接提供分析結果，不要有元評論

請以繁體中文直接回答。
```

---

## 5. 圖片生成 Prompt

位置：`sidepanel/app.js`

### 5.1 IMAGE_PROMPT_SYSTEM

**用途**：分析 Council 討論內容，生成圖片生成所需的 prompt 和選項

**長度**：~3500 字（完整系統指令）

**核心結構**：
```
你是視覺設計專家和圖像生成 Prompt 工程師。根據提供的內容，分析主題並生成適合的圖像描述。

## 核心原則（必讀）
1. **完整自然語句**：用完整句子描述，像對人類設計師溝通
2. **用途優先**：每張圖的 prompt 開頭先說明用途情境
3. **具體勝過抽象**：描述主體、場景、光影、材質
4. **風格一致性**：多張圖必須維持統一的視覺風格

## 一致性區塊規則（極重要）
- characters：角色精確描述（年齡、性別、髮型、臉部、服裝、體型）
- style：畫風精確描述（線條、色彩、光線、質感）
- scene_coherence：場景連貫性（時間、色溫、光線方向）

## Placeholder 規則
- {angle}、{background_detail}、{character_action}、{lighting}、{mood}

## 風格推薦規則
- 根據主題推薦 3-5 個視覺風格

## Prompt 撰寫技巧
- 資訊圖表/數據視覺化 (theme_type: data)
- 人物/角色場景 (theme_type: narrative)
- 產品/物件 (theme_type: concrete)
- 抽象概念 (theme_type: abstract)
```

**輸出格式**：JSON，包含 `image_count`、`theme_type`、`use_case`、`recommended_styles`、`consistency_block`、`global_context`、`images[]`

---

### 5.2 圖片分析 Prompt（analysisPrompt）

**用途**：傳給 IMAGE_PROMPT_SYSTEM 的 user 訊息

```
請分析以下 Council 討論內容，識別是否規劃了多張圖片，並為每張圖生成獨立的 Prompt。

## 原始問題
{query}

## 各模型回應摘要
{responseSummary}

## 最終彙整答案
{finalContent}

---
請根據以上內容：
1. 識別內容是否規劃了多張圖卡/資訊圖表
2. 如果有多張圖的規劃，為每張圖生成獨立的 prompt 和選項
3. 如果沒有明確規劃，根據內容決定需要幾張圖來完整呈現
4. 每張圖的選項應與該圖主題相關，不要使用通用的「性別/服裝」等選項
```

---

### 5.3 STYLE_INTEGRATION_PROMPT

**用途**：將用戶選擇的風格融入各張圖的 prompt

```
你是圖像 Prompt 整合專家。將指定的視覺風格融入每張圖的 prompt 中，保持內容描述不變但加入風格元素。

## 任務
將選定的風格自然地融入每張圖的 prompt，而非簡單地前置風格名稱。

## 融入原則
1. **風格融合**：將風格元素（筆觸、質感、色調）融入場景描述中
2. **保持一致**：所有圖片必須使用相同的風格語言
3. **全局上下文**：將 global_context（人物一致性等）融入每張 prompt 開頭
4. **自然語句**：用完整句子，不要只是堆疊關鍵字
5. **保留 Placeholder**：如果 prompt 中有 {placeholder}，必須原封不動保留

## 範例
原始 prompt: "一隻狐狸以{angle}站在樹下，{background_detail}，看著遠方"
風格: "水彩童話風格，柔和筆觸，暈染邊緣"
全局上下文: "保持狐狸的外觀一致：棕色毛皮，圓眼睛，短尾巴"

融入後:
"水彩童話風格的插畫，柔和筆觸與暈染邊緣。一隻棕色毛皮、圓眼睛、短尾巴的小狐狸以{angle}站在大樹下，{background_detail}，目光望向遠方。畫面色調溫暖，光線柔和，帶有手繪繪本的質感。"
```

**輸出格式**：JSON `{ "integrated_prompts": [{ "title": "...", "prompt": "..." }] }`

---

## 6. Prompt 檢討重點

| 類別 | Prompt | 潛在問題 |
|------|--------|----------|
| 用戶設定 | REVIEW_PROMPT | 輸出 JSON 格式有時被模型忽略 |
| 用戶設定 | CHAIRMAN_PROMPT | 繁體中文指令有時仍出現簡體 |
| 搜尋流程 | SEARCH_CONSOLIDATION | 有時回傳非 JSON 格式 |
| 任務分解 | TASK_DECOMPOSITION_SUFFIX | priority 值不一致 |
| 圖片生成 | IMAGE_PROMPT_SYSTEM | 過長，token 成本高 |
| 圖片生成 | STYLE_INTEGRATION_PROMPT | Placeholder 有時仍被替換 |

---

## 7. 檔案位置速查

| Prompt 名稱 | 檔案 | 行號（約） |
|-------------|------|-----------|
| DEFAULT_REVIEW_PROMPT | `options/options.js` | 38-59 |
| DEFAULT_CHAIRMAN_PROMPT | `options/options.js` | 61-80 |
| COUNCIL_SEARCH_SUFFIX | `sidepanel/app.js` | 395-401 |
| SEARCH_STRATEGY_SUFFIX | `sidepanel/app.js` | 403-415 |
| SEARCH_CONSOLIDATION_PROMPT | `sidepanel/app.js` | 417-430 |
| TASK_DECOMPOSITION_SUFFIX | `sidepanel/app.js` | 432-451 |
| CONTEXT_SUMMARY_PROMPT | `sidepanel/app.js` | 453-463 |
| PROMPT_SUGGESTION_SYSTEM | `sidepanel/app.js` | 3174-3184 |
| generateVisionReviewPrompt | `sidepanel/app.js` | 4280-4317 |
| generateVisionChairmanPrompt | `sidepanel/app.js` | 4320-4354 |
| IMAGE_PROMPT_SYSTEM | `sidepanel/app.js` | 6328-6446 |
| STYLE_INTEGRATION_PROMPT | `sidepanel/app.js` | 6731-6762 |
| LEARNER_CHAIRMAN_PROMPTS | `sidepanel/app.js` | 327-431 |
| LEARNER_TASK_SUFFIXES | `sidepanel/app.js` | 432-530 |

