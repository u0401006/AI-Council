# AI Council 產品規格書

> 版本：2.1  
> 更新日期：2026-01-02  
> 狀態：Chrome Extension 已上線，React Native iOS 規劃中

---

## 目錄

1. [目的](#1-目的)
2. [使用情境](#2-使用情境)
3. [技術棧（現況）](#3-技術棧現況)
4. [圖片生成系統規格](#4-圖片生成系統規格)
5. [React Native iOS 移轉技術細節](#5-react-native-ios-移轉技術細節)
6. [移轉需補足項目](#6-移轉需補足項目)
7. [相關文件索引](#7-相關文件索引)
8. [使用手冊](#8-使用手冊)

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
├── background.js              # Service Worker（894 行）
│                              # - API 呼叫代理
│                              # - 串流處理
│                              # - Context Menu 處理
│
├── sidepanel/                 # 主要 UI
│   ├── index.html
│   ├── style.css
│   └── app.js                 # 主應用（8362 行）
│                              # - Council 三階段邏輯
│                              # - Markdown 渲染
│                              # - 串流 UI
│                              # - Context 管理
│                              # - 學習者模式
│
├── canvas/                    # WYSIWYG 編輯器
│   ├── index.html
│   ├── style.css
│   └── canvas.js              # 編輯器邏輯（841 行）
│
├── options/                   # 設定頁
│   ├── index.html
│   ├── style.css
│   └── options.js             # 設定邏輯（442 行）
│
├── content/                   # Content Script
│   └── content.js             # 頁面內容擷取（202 行）
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
  "availableModels": [...]            // 動態模型列表
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
| Vision Mode | ✅ | 圖片輸入分析（支援拖曳/貼上） |
| Image Generation | ✅ | Gemini Image 模型生成圖片 |
| Context System | ✅ | 右鍵加入選取文字/頁面內容 |
| Canvas | ✅ | WYSIWYG Markdown 編輯器 |
| 學習者模式 | ✅ | 四種年齡層探索式學習 |
| 動態模型更新 | ✅ | 從 OpenRouter 自動抓取最新模型 |

---

## 4. 圖片生成系統規格

圖片生成系統採用**符號學兩軸論**（索緒爾理論）設計，透過五階段流程實現高品質、可控的多圖片生成。

### 4.1 系統流程總覽

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

### 4.2 符號學兩軸論架構

#### 4.2.1 核心概念

| 軸向 | 名稱 | 說明 |
|------|------|------|
| **系譜軸**（Paradigmatic） | 垂直替代選項 | 每個敘事主體的可替換屬性選項 |
| **毗鄰軸**（Syntagmatic） | 橫向組合結構 | 選定的選項組合成完整 prompt |

```
毗鄰軸組合公式：
最終 Prompt = 一致性區塊（consistency_block）+ 單圖描述（base_prompt）
            = [角色一致性] + [畫風一致性] + [場景一致性] + [該圖特定描述]
```

#### 4.2.2 系譜軸層級結構

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
    │   └── {場景元素}
    │       └── {屬性}: [選項1, 選項2, ...]
    │
    ├── object（物件系譜軸）
    │   └── {物件名}
    │       └── {屬性}: [選項1, 選項2, ...]
    │
    └── composition（構圖系譜軸）
        ├── 視角: [平視, 俯視, 仰視]
        ├── 景深: [遠景全身, 中景半身, 近景特寫]
        └── 位置: [主體置中, 三分法左, 三分法右]
```

### 4.3 Prompt 選擇器分層邏輯

#### 4.3.1 全局系譜軸選擇器（Phase 2）

**觸發時機**：風格選擇 UI 顯示時

**實作位置**：`showStyleSelectionUI()` → `buildParadigmAxisHtml()`

**UI 結構**：
```html
<div class="global-paradigms-container">
  <div class="paradigm-axis-section" data-axis="characters">
    <div class="paradigm-subject" data-subject="爸爸">
      <div class="paradigm-attribute-row">
        <span class="paradigm-attr-label">面貌</span>
        <div class="paradigm-chips-row">
          <button class="paradigm-chip" data-axis="characters" 
                  data-subject="爸爸" data-attr="面貌" data-value="方臉">方臉</button>
          <button class="paradigm-chip" ...>圓臉</button>
        </div>
      </div>
    </div>
  </div>
</div>
```

**選擇邏輯**：
```javascript
// 點擊 chip 時的處理
const paradigmSelections = {
  characters: {},      // 角色選擇
  style: {},           // 風格選擇
  colorAtmosphere: {}  // 色彩選擇
};

// 同一屬性列只能選一個（radio 行為）
chip.closest('.paradigm-chips-row').querySelectorAll('.paradigm-chip')
    .forEach(c => c.classList.remove('selected'));

// 儲存選擇
paradigmSelections[axis][subject][attr] = value;
// 例：paradigmSelections.characters.爸爸.面貌 = "方臉"
```

#### 4.3.2 單圖系譜軸選擇器（Phase 5）

**觸發時機**：多圖編輯器中每張圖卡

**實作位置**：`showMultiImageEditor()` → `buildImageParadigmAxisHtml()`

**資料結構**：
```javascript
multiImageState.images[idx].imageParadigmSelections = {
  scene: {},       // {元素: {屬性: 值}}
  object: {},      // {物件: {屬性: 值}}
  composition: {}  // {屬性: 值}
};
```

**UI 結構**：
```html
<div class="image-paradigm-row">
  <span class="image-paradigm-label">神社階梯</span>
  <div class="image-paradigm-chips">
    <button class="image-paradigm-chip" data-image-idx="0" 
            data-axis="scene" data-subject="神社階梯" 
            data-attr="狀態" data-value="積雪覆蓋">積雪覆蓋</button>
  </div>
</div>
```

### 4.4 一致性設定（Consistency Block）

#### 4.4.1 結構定義

```javascript
const consistencyBlock = {
  characters: "所有角色的精確外觀描述，使用 {角色名.屬性} placeholder",
  style: "畫風描述，使用 {style.屬性} placeholder",
  scene_coherence: "場景連貫性要求"
};
```

#### 4.4.2 一致性確保機制

**1. AI 生成階段**：`IMAGE_PROMPT_SYSTEM` 指導 AI 產出統一的 consistency_block

**2. 風格整合階段**：`integrateStyleIntoPrompts()` 將選定風格融入
```javascript
const styleIntegrationPrompt = `
將選定的風格融入一致性區塊描述中...
名稱：${selectedStyle.name}
描述：${selectedStyle.description}
原始一致性區塊：${consistencyText}
`;
```

**3. 最終組合**：每張圖生成時自動 prepend consistency_block
```javascript
// Phase 5 生成按鈕邏輯
const consistencyBlock = multiImageState.consistencyBlock?.trim();
if (consistencyBlock) {
  prompt = consistencyBlock + '\n\n' + prompt;
}
```

#### 4.4.3 一致性描述格式

```
【角色】爸爸（面貌:方臉，表情:微笑）；媽媽（面貌:鵝蛋臉，表情:溫柔微笑）
【畫風】細膩手繪，紙本紋理
【色彩】暖色調，低飽和日系，柔和自然光
【場景】京都冬日，積雪場景，和風建築
```

### 4.5 變項置換（Placeholder Substitution）

#### 4.5.1 Placeholder 命名規則

| 類型 | 格式 | 範例 | 用途位置 |
|------|------|------|----------|
| 角色屬性 | `{角色名.屬性}` | `{爸爸.面貌}`, `{媽媽.表情}` | consistency_block |
| 風格屬性 | `{style.屬性}` | `{style.線條}`, `{style.質感}` | consistency_block |
| 色彩屬性 | `{color.屬性}` | `{color.色溫}`, `{color.光線}` | consistency_block |
| 場景屬性 | `{scene.元素.屬性}` | `{scene.庭園.狀態}` | base_prompt |
| 物件屬性 | `{object.物件.屬性}` | `{object.燈籠.數量}` | base_prompt |
| 構圖屬性 | `{comp.屬性}` | `{comp.視角}`, `{comp.景深}` | base_prompt |

#### 4.5.2 置換函數：`composePromptFromParadigms()`

**函數簽名**：
```javascript
function composePromptFromParadigms(basePrompt, globalSelections, imageSelections)
```

**置換流程**：
```javascript
// 1. 全局 placeholder 置換
if (globalSelections) {
  // 角色: {角色名.屬性} → 選定值
  patterns = [`{${charName}.${attrName}}`, `{characters.${charName}.${attrName}}`];
  
  // 風格: {style.屬性} → 選定值
  patterns = [`{style.${attrName}}`, `{${styleName}.${attrName}}`];
  
  // 色彩: {color.屬性} → 選定值
  patterns = [`{color.${attrName}}`, `{${colorName}.${attrName}}`];
}

// 2. 單圖 placeholder 置換（僅當 imageSelections 非 null）
if (imageSelections) {
  // 場景: {scene.元素.屬性} → 選定值
  // 物件: {object.物件.屬性} → 選定值
  // 構圖: {comp.屬性} → 選定值
}

// 3. 清理未選擇的 placeholder
prompt = prompt
  .replace(/[，、；：]?\s*\{[^{}]+\}\s*[，、；：]?/g, ...)  // 移除並清理標點
  .replace(/\{[^{}]+\}/g, '')                               // 移除殘留
  .replace(/\s{2,}/g, ' ')                                   // 清理多餘空白
  .trim();
```

#### 4.5.3 置換時機

| 階段 | 函數 | 置換範圍 |
|------|------|----------|
| Phase 3 | `integrateStyleIntoPrompts()` | 全局 placeholder（consistency_block + global_context） |
| Phase 5 | 生成按鈕 click handler | 單圖 placeholder（base_prompt） |

### 4.6 潤飾邏輯（Prompt Refinement）

#### 4.6.1 系統 Prompt：`REFINE_PROMPT_SYSTEM`

```javascript
const REFINE_PROMPT_SYSTEM = `你是圖像 Prompt 精煉專家。將用戶編輯後的 prompt 進行潤色，確保品質。

## 精煉原則
1. **去除重複**：刪除重複的描述（如角色描述出現兩次）
2. **融合一致性區塊**：確保一致性描述自然融入 prompt，不是生硬的前置
3. **語句流暢**：調整語序使描述更自然
4. **保持完整**：不要刪除重要細節
5. **填補 placeholder**：如果還有未置換的 {placeholder}，用合理的預設值填入

## 輸出要求
只輸出精煉後的 prompt，不要加任何說明或 markdown 格式。
字數控制在 150-250 字。`;
```

#### 4.6.2 潤飾函數：`refinePromptWithAI()`

**觸發時機**：Phase 5 多圖編輯器中點擊「潤色」按鈕

**輸入**：
- `prompt`: 當前 textarea 內容（base_prompt）
- `consistencyBlock`: 一致性區塊文字

**處理流程**：
```javascript
async function refinePromptWithAI(prompt, consistencyBlock) {
  const refineRequest = `
## 一致性描述
${consistencyBlock || '（無）'}

## 原始 Prompt
${prompt}

請精煉上述 prompt，確保一致性描述自然融入，移除重複內容，使語句流暢。`;

  const result = await queryModelNonStreaming(
    getAvailableHelperModel(), 
    REFINE_PROMPT_SYSTEM + '\n\n' + refineRequest
  );
  
  return result.trim();
}
```

**輸出**：精煉後的 prompt（150-250 字），已去除重複、自然融合

#### 4.6.3 潤飾處理項目

| 項目 | 說明 |
|------|------|
| 去除重複 | 同一角色描述出現多次 → 保留一次 |
| 融合一致性 | 「【角色】爸爸（方臉）\n\n方臉的爸爸站在...」→「方臉的爸爸站在...」 |
| 語句流暢 | 關鍵字堆疊 → 完整句子 |
| 填補 placeholder | `{comp.視角}` → 「平視」（合理預設值） |

### 4.7 風格整合流程

#### 4.7.1 系統 Prompt：`STYLE_INTEGRATION_PROMPT`

```javascript
const STYLE_INTEGRATION_PROMPT = `你是圖像 Prompt 整合專家。將指定的視覺風格融入每張圖的 prompt 中，保持內容描述不變但加入風格元素。

## 融入原則
1. **風格融合**：將風格元素（筆觸、質感、色調）融入場景描述中
2. **保持一致**：所有圖片必須使用相同的風格語言
3. **全局上下文**：將 global_context（人物一致性等）融入每張 prompt 開頭
4. **自然語句**：用完整句子，不要只是堆疊關鍵字
5. **保留 Placeholder**：如果 prompt 中有 {placeholder}，必須原封不動保留，不要替換

## 範例
原始 prompt: "一隻狐狸以{angle}站在樹下，{background_detail}，看著遠方"
風格: "水彩童話風格，柔和筆觸，暈染邊緣"
全局上下文: "保持狐狸的外觀一致：棕色毛皮，圓眼睛，短尾巴"

融入後:
"水彩童話風格的插畫，柔和筆觸與暈染邊緣。一隻棕色毛皮、圓眼睛、短尾巴的小狐狸以{angle}站在大樹下，{background_detail}，目光望向遠方。畫面色調溫暖，光線柔和，帶有手繪繪本的質感。"
`;
```

#### 4.7.2 整合函數流程

```javascript
async function integrateStyleIntoPrompts(aiResult, selectedStyle, editedGlobalContext) {
  // 1. 先用全局 paradigm 選擇置換 consistency_block 中的 placeholder
  const processedConsistencyBlock = {
    characters: composePromptFromParadigms(consistencyBlock.characters, paradigmSelections, null),
    style: composePromptFromParadigms(consistencyBlock.style, paradigmSelections, null),
    sceneCoherence: composePromptFromParadigms(consistencyBlock.sceneCoherence, paradigmSelections, null)
  };
  
  // 2. AI 將風格融入 consistency_block（不動 base_prompt）
  const styleIntegrationPrompt = `
將選定的風格融入一致性區塊描述中...
名稱：${selectedStyle.name}
描述：${selectedStyle.description}
`;
  
  const integratedConsistencyText = await queryModelNonStreaming(...);
  
  // 3. base_prompt 只處理全局 placeholder，保留單圖 placeholder
  const processedImages = images.map(img => ({
    ...img,
    basePromptProcessed: composePromptFromParadigms(img.basePrompt, paradigmSelections, null)
  }));
  
  return { integratedConsistencyText, images: processedImages };
}
```

### 4.8 AI Prompt 生成系統：`IMAGE_PROMPT_SYSTEM`

#### 4.8.1 核心指令

```javascript
const IMAGE_PROMPT_SYSTEM = `你是視覺設計專家和圖像生成 Prompt 工程師。根據提供的內容，運用符號學兩軸論（索緒爾理論）分析主題並生成結構化的圖像描述。

## 動態分析原則（極重要）
你必須根據使用者 prompt 內容**動態識別**敘事主體，而非使用固定模板：
- 京都旅遊 → 識別：家庭成員、神社、庭園、和服
- 科幻故事 → 識別：太空人、機器人、星艦、星球
- 美食文章 → 識別：料理、食材、餐具、擺盤
- 企業簡報 → 識別：圖表、數據標籤、版面區塊

## 風格推薦規則
根據內容主題推薦 3-5 個適合的視覺風格，必須：
1. **貼近主題**：寓言→童話風、科技→賽博龐克、旅遊→插畫風
2. **具體描述**：「柔和水彩筆觸，色彩暈染邊緣，童話繪本質感」
3. **多樣選擇**：提供寫實、插畫、抽象等不同取向
`;
```

#### 4.8.2 輸出 JSON 結構

```json
{
  "image_count": 3,
  "theme_type": "abstract|concrete|narrative|data",
  "use_case": "用途說明",
  
  "recommended_styles": [
    {
      "id": "style_id_snake_case",
      "name": "風格名稱",
      "description": "詳細風格描述（30-50字）",
      "suitable_for": "適合場景"
    }
  ],
  
  "global_paradigms": {
    "characters": {
      "角色名稱": {
        "屬性類別1": ["選項1", "選項2", "選項3"],
        "屬性類別2": ["選項1", "選項2"]
      }
    },
    "style": {
      "線條": ["細膩手繪", "粗獷筆觸", "平滑向量"],
      "質感": ["紙本紋理", "平滑數位", "水彩暈染"]
    },
    "color_atmosphere": {
      "色溫": ["暖色調", "冷色調", "中性"],
      "飽和度": ["低飽和日系", "標準", "高飽和鮮明"],
      "光線": ["柔和自然光", "強烈側光", "逆光剪影"]
    }
  },
  
  "consistency_block": {
    "characters": "所有角色的精確外觀描述，使用 {角色名.屬性} placeholder",
    "style": "畫風描述，使用 {style.屬性} placeholder",
    "scene_coherence": "場景連貫性要求"
  },
  
  "global_context": "簡短全局說明",
  
  "images": [
    {
      "title": "圖卡標題",
      "use_case": "此圖用途",
      "description": "圖片說明",
      
      "image_paradigms": {
        "scene": {
          "場景元素名": {
            "屬性1": ["選項1", "選項2"],
            "屬性2": ["選項1", "選項2"]
          }
        },
        "object": {
          "物件名": {
            "屬性1": ["選項1", "選項2"]
          }
        },
        "composition": {
          "視角": ["平視", "俯視", "仰視"],
          "景深": ["遠景全身", "中景半身", "近景特寫"],
          "位置": ["主體置中", "三分法左", "三分法右"]
        }
      },
      
      "base_prompt": "包含 {placeholder} 的圖像描述（150-200字）"
    }
  ]
}
```

### 4.9 圖片生成 API

#### 4.9.1 生成函數：`runImageGeneration()`

```javascript
async function runImageGeneration(prompt, timeoutMs = 240000) {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error('圖片生成逾時（超過 4 分鐘），請稍後再試'));
    }, timeoutMs);
    
    chrome.runtime.sendMessage({ 
      type: 'QUERY_IMAGE', 
      payload: { 
        model: DEFAULT_IMAGE_MODEL,  // google/gemini-2.0-flash-exp:free
        prompt: prompt 
      } 
    }, (response) => {
      clearTimeout(timeoutId);
      if (response?.images?.length) {
        resolve(response.images);
      } else {
        reject(new Error('未收到圖片'));
      }
    });
  });
}
```

#### 4.9.2 最終 Prompt 組裝

```
┌────────────────────────────────────────┐
│  最終送出的 Prompt                       │
├────────────────────────────────────────┤
│  【角色】爸爸（方臉，微笑）；媽媽...       │  ← 一致性區塊
│  【畫風】水彩童話風格，柔和筆觸...         │    (consistency_block)
│  【場景】京都冬日，積雪覆蓋...             │
│                                        │
│  一家四口站在積雪覆蓋的石階前，           │  ← 單圖描述
│  成排綿延的朱紅燈籠沿階而上。             │    (base_prompt)
│  仰視構圖下，微笑的爸爸牽著...            │    (已完成 placeholder 置換)
└────────────────────────────────────────┘
```

### 4.10 相關函數索引

| 函數名稱 | 檔案位置 | 功能說明 |
|----------|----------|----------|
| `generateImagePromptWithAI()` | `sidepanel/app.js` | Phase 1: AI 分析生成 JSON |
| `showStyleSelectionUI()` | `sidepanel/app.js` | Phase 2: 風格選擇 UI |
| `buildParadigmAxisHtml()` | `sidepanel/app.js` | 全局系譜軸 HTML 生成 |
| `integrateStyleIntoPrompts()` | `sidepanel/app.js` | Phase 3: 風格整合 |
| `composePromptFromParadigms()` | `sidepanel/app.js` | Placeholder 置換核心函數 |
| `showPromptPreview()` | `sidepanel/app.js` | Phase 4: 預覽編輯 |
| `buildPreviewContent()` | `sidepanel/app.js` | 建構預覽文字 |
| `parsePreviewContent()` | `sidepanel/app.js` | 解析編輯後內容 |
| `showMultiImageEditor()` | `sidepanel/app.js` | Phase 5: 多圖編輯器 |
| `buildImageParadigmAxisHtml()` | `sidepanel/app.js` | 單圖系譜軸 HTML 生成 |
| `refinePromptWithAI()` | `sidepanel/app.js` | Prompt 潤飾 |
| `runImageGeneration()` | `sidepanel/app.js` | 圖片生成 API 呼叫 |

---

## 5. React Native iOS 移轉技術細節

### 5.1 目標平台

- **主要目標**：iOS App（App Store 上架）
- **次要目標**：Android App（Google Play）
- **技術選型**：React Native + Expo

### 5.2 架構對照

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

### 5.3 系統架構圖

```
┌──────────────────────────────────────────────────────────────┐
│                   React Native App (iOS)                     │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │ Expo Router │  │   Zustand   │  │    React Query      │  │
│  │  (路由導航)  │  │  (狀態管理)  │  │  (API 快取/串流)    │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
│                                                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │ NativeWind  │  │    MMKV     │  │   Expo SecureStore  │  │
│  │  (樣式系統)  │  │ (本地儲存)   │  │   (安全儲存 Token)  │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
│                                                              │
└────────────────────────────┬─────────────────────────────────┘
                             │ HTTPS
                             ▼
┌──────────────────────────────────────────────────────────────┐
│                 Serverless Backend (Vercel)                  │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────────┐  ┌───────────────┐  ┌───────────────┐  │
│  │  Edge Functions │  │   Vercel KV   │  │  Rate Limiter │  │
│  │  (API 代理)     │  │  (Session)    │  │  (Upstash)    │  │
│  └────────┬────────┘  └───────────────┘  └───────────────┘  │
│           │                                                  │
│  ┌────────▼────────┐  ┌───────────────┐                     │
│  │  Auth Handler   │  │  Usage Track  │                     │
│  │ (Apple Sign-In) │  │  (計費統計)    │                     │
│  └─────────────────┘  └───────────────┘                     │
│                                                              │
└────────────────────────────┬─────────────────────────────────┘
                             │
         ┌───────────────────┼───────────────────┐
         ▼                   ▼                   ▼
   ┌───────────┐      ┌───────────┐      ┌───────────┐
   │ OpenRouter│      │  Brave    │      │  (Future) │
   │    API    │      │ Search API│      │  Firebase │
   └───────────┘      └───────────┘      └───────────┘
```

### 5.4 技術選型理由

| 技術 | 選擇原因 |
|------|---------|
| **Expo** | 簡化 iOS 建置流程，EAS Build 雲端打包 |
| **Expo Router** | 檔案系統路由，類似 Next.js |
| **Zustand** | 輕量狀態管理，無 boilerplate |
| **React Query** | 內建串流支援、快取、重試 |
| **NativeWind** | Tailwind 語法，樣式重用性高 |
| **MMKV** | 高效能 key-value 儲存，取代 AsyncStorage |
| **Vercel Edge** | 低延遲、全球部署、Streaming Response |

### 5.5 API 代理設計

Chrome Extension 直接呼叫 OpenRouter，但 iOS App 需要後端代理：

```
[現況 - Chrome Extension]
User → Extension → OpenRouter (直接呼叫，API Key 存本地)

[目標 - iOS App]
User → App → Vercel Edge → OpenRouter (代理呼叫，API Key 存後端)
```

**Edge Function 範例**：

```typescript
// /api/chat/stream.ts
export const config = { runtime: 'edge' };

export default async function handler(req: Request) {
  const { model, messages } = await req.json();
  const userId = await verifyAuth(req);
  
  // Rate limiting
  await checkRateLimit(userId);
  
  // Proxy to OpenRouter with server-side API key
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ model, messages, stream: true }),
  });
  
  // Track usage for billing
  trackUsage(userId, model);
  
  // Stream response back to client
  return new Response(response.body, {
    headers: { 'Content-Type': 'text/event-stream' },
  });
}
```

### 5.6 商業模式選項

| 模式 | 說明 | 適用場景 |
|------|------|---------|
| **BYOK** | 用戶自帶 API Key | 進階用戶、開發者 |
| **訂閱制** | 月費 $X，含 N 次查詢 | 一般用戶 |
| **Pay-as-you-go** | 按用量計費 | 輕度使用者 |
| **Freemium** | 免費額度 + 付費升級 | 用戶獲取 |

### 5.7 React Native 元件對應

| Chrome Extension | React Native |
|------------------|--------------|
| `sidepanel/index.html` | `app/(tabs)/council.tsx` |
| `canvas/index.html` | `app/(tabs)/canvas.tsx` |
| `options/index.html` | `app/settings.tsx` |
| Context Menu | Share Extension / Deep Link |
| Badge | App Icon Badge |
| Side Panel | Tab Navigation |

---

## 6. 移轉需補足項目

### 6.1 優先級定義

- **P0**：App Store 上架必要條件
- **P1**：核心用戶體驗
- **P2**：進階功能

### 6.2 後端開發

| 項目 | 優先級 | 說明 | 預估工時 |
|------|--------|------|---------|
| Serverless API 層 | P0 | 代理 OpenRouter/Brave API | 3d |
| Apple Sign-In | P0 | App Store 要求支援 | 2d |
| Rate Limiting | P0 | 防止濫用 | 1d |
| Usage Tracking | P1 | 用量統計（計費基礎） | 2d |
| 訂閱系統 | P1 | In-App Purchase 整合 | 5d |
| API Key 託管 | P1 | 用戶自帶 Key 選項 | 2d |

### 6.3 前端開發

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

### 6.4 App Store 合規

| 項目 | 優先級 | 說明 |
|------|--------|------|
| 隱私政策 | P0 | 詳述資料收集與使用 |
| 資料處理說明 | P0 | App Store Connect 填寫 |
| 年齡分級 | P0 | 17+ (AI 生成內容) |
| App Review 準備 | P0 | 測試帳號、功能說明 |
| 內容審核 | P1 | AI 輸出過濾機制 |

### 6.5 移轉優先順序

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

## 7. 相關文件索引

### 7.1 文件總覽

| 文件 | 用途 | 維護時機 |
|------|------|---------|
| [`SPEC.md`](SPEC.md) | 產品規格總覽 | 功能規劃、架構變更時 |
| [`README.md`](README.md) | 安裝與快速入門 | 安裝流程變更時 |
| [`CLAUDE.md`](CLAUDE.md) | AI 開發助手指南 | 架構、命名慣例變更時 |
| [`PROMPTS_REFERENCE.md`](PROMPTS_REFERENCE.md) | Prompt 模板參考 | 新增/修改 Prompt 時 |
| [`MODEL_UPDATE_GUIDE.md`](MODEL_UPDATE_GUIDE.md) | 模型更新機制 | 篩選邏輯變更時 |
| [`PRIVACY.md`](PRIVACY.md) | 隱私政策 | 資料處理方式變更時 |

### 7.2 PROMPTS_REFERENCE.md 摘要

Prompt 類別與位置：

| 類別 | Prompt 名稱 | 檔案位置 |
|------|------------|---------|
| 用戶可設定 | `DEFAULT_REVIEW_PROMPT` | `options/options.js` |
| 用戶可設定 | `DEFAULT_CHAIRMAN_PROMPT` | `options/options.js` |
| Council 流程 | `COUNCIL_SEARCH_SUFFIX` | `sidepanel/app.js` |
| Council 流程 | `SEARCH_STRATEGY_SUFFIX` | `sidepanel/app.js` |
| Council 流程 | `TASK_DECOMPOSITION_SUFFIX` | `sidepanel/app.js` |
| 學習者模式 | `LEARNER_CHAIRMAN_PROMPTS` | `sidepanel/app.js` |
| 學習者模式 | `LEARNER_TASK_SUFFIXES` | `sidepanel/app.js` |
| Vision | `generateVisionReviewPrompt` | `sidepanel/app.js` |
| 圖片生成 | `IMAGE_PROMPT_SYSTEM` | `sidepanel/app.js` |
| 圖片生成 | `STYLE_INTEGRATION_PROMPT` | `sidepanel/app.js` |
| 圖片生成 | `REFINE_PROMPT_SYSTEM` | `sidepanel/app.js` |

### 7.3 MODEL_UPDATE_GUIDE.md 摘要

模型篩選邏輯：

```javascript
// 供應商限制
const PROVIDER_LIMITS = {
  'openai': 4,      // 前 4 個最新模型
  'anthropic': 4,
  'google': 4,
  'meta-llama': 2
};

// 篩選條件
const MIN_CONTEXT_LENGTH = 8000;
const EXCLUDED_KEYWORDS = ['free', 'online', 'extended', 'nitro', ':free'];

// 排序：按 created 時間戳降序（最新優先）
```

---

## 8. 使用手冊

### 8.1 Chrome Extension 安裝

1. Clone 或下載此 repo
2. 開啟 Chrome，前往 `chrome://extensions/`
3. 開啟右上角「開發人員模式」
4. 點擊「載入未封裝項目」
5. 選擇 repo 資料夾

### 8.2 初始設定

1. 點擊擴充功能圖示 → 右鍵 → **選項**
2. 輸入 **OpenRouter API Key**（必要）
   - 前往 [openrouter.ai](https://openrouter.ai/) 註冊取得
3. 輸入 **Brave Search API Key**（可選）
   - 前往 [brave.com/search/api](https://brave.com/search/api/) 取得
4. 選擇參與 Council 的模型（至少 2 個）
5. 選擇主席模型
6. 點擊「儲存設定」

### 8.3 基本使用

#### 發起 Council 查詢

1. 點擊擴充功能圖示開啟 Side Panel
2. 在輸入框輸入問題
3. 點擊「送出」
4. 觀看三階段流程：
   - **階段 1**：各模型回應（分頁顯示，串流更新）
   - **階段 2**：互評審查（顯示排名與評語）
   - **階段 3**：主席綜合答案

#### 加入 Context

- **擷取頁面**：點擊 Side Panel 的「擷取頁面」按鈕
- **選取文字**：在網頁選取文字 → 右鍵 → 「加入 AI Council Context」
- **網路搜尋**：點擊「網搜」按鈕，輸入關鍵字

### 8.4 進階功能

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

### 8.5 學習者模式

1. 前往選項頁
2. 在「學習者模式」區塊選擇年齡層
3. 儲存設定
4. 發起查詢後，回答風格會依年齡層調整
5. 會生成探索任務引導學習

### 8.6 輸出風格設定

| 設定 | 選項 | 說明 |
|------|------|------|
| **輸出長度** | 簡潔 / 標準 / 詳盡 | 控制回答字數 |
| **輸出格式** | 純文字 / 混合 / 結構化 | 控制 Markdown 使用程度 |

### 8.7 常見問題

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
  imageData: string           // Base64 圖片（Vision 模式）
}

// 模型回應
{
  model: string,
  content: string,
  latency: number,            // ms
  tokenCount: number          // optional
}

// 互評結果
{
  reviewer: string,           // 評審模型（匿名化）
  rankings: [{
    response: string,         // A, B, C...（匿名化）
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
